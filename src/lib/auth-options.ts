import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthSecret } from "@/lib/auth-secret";
import { verifyEmployeeByEmail } from "@/lib/sap-employee";
import { verifyStudentByEmail } from "@/lib/sap-student";
import {
  getFacultyMemberByEmail,
  upsertFacultyMemberFromSap,
} from "@/lib/faculty-members";
import {
  buildAdminClaims,
  findOrCreateUserForFaculty,
  getAdminUserByEmail,
} from "@/lib/admin-repository";
import {
  buildAdministratorRestoreTokenFields,
  buildViewAsTokenFields,
  validateViewAsTarget,
  type ViewAsSessionUpdate,
} from "@/lib/view-as";

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
  },
  providers: [
    // Single unified SSO provider for all user types:
    //   - Students: verified via SAP student service
    //   - Faculty: verified via local DB or SAP employee service
    //   - Admins (supervisor/IREB/administrator): looked up in admin_users
    //
    // All non-student emails go through the same flow:
    //   1. Look up admin_users by email (unified Users table)
    //   2. If found and active, build session (with admin claims if they have a role)
    //   3. If not found, try SAP employee verification (new faculty)
    //   4. Create admin_users + faculty_members records for new faculty
    CredentialsProvider({
      id: "student-email",
      name: "University SSO",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email) return null;

        if (!isStudentEmail(email)) {
          // ─── Faculty / Admin flow ───
          // Check the unified admin_users table first. Every faculty member
          // and admin has a record here (created by sync or migration).
          const user = await getAdminUserByEmail(email);
          if (user) {
            if (user.status !== "active") {
              return null;
            }

            // If the user has an admin role, build admin claims for the session
            const claims = await buildAdminClaims(user);

            // Check if this user also has a faculty profile
            const faculty = await getFacultyMemberByEmail(email, {
              includeInactive: true,
            });

            const baseReturn: Record<string, unknown> = {
              id: user.id,
              email: user.email,
              name: user.name,
              adminId: user.id,
              adminStatus: user.status,
              adminTokenVersion: user.tokenVersion,
            };

            if (claims) {
              baseReturn.adminRole = claims.role;
              baseReturn.adminScopeMode = claims.scopeMode;
              baseReturn.adminFacultyIds = claims.facultyIds;
            }

            if (faculty && faculty.status === "active" && faculty.isActive) {
              baseReturn.sapId = faculty.sapId;
              baseReturn.facultyMemberId = faculty.id;
              baseReturn.userType = "faculty";
              baseReturn.applicantRole = "faculty";
              baseReturn.facultyId = faculty.facultyId ?? undefined;
              baseReturn.departmentId = faculty.departmentId ?? undefined;
              baseReturn.facultyDepartment = faculty.department ?? undefined;
              baseReturn.facultyDesignation = faculty.designation ?? undefined;
            }

            return baseReturn as {
              id: string;
              email?: string;
              name?: string;
              sapId?: string;
              facultyMemberId?: string;
              userType?: "student" | "faculty";
              applicantRole?: "student" | "faculty";
              facultyId?: number;
              departmentId?: number;
              facultyDepartment?: string;
              facultyDesignation?: string | null;
              adminId?: string;
              adminRole?: "administrator" | "supervisor" | "ireb";
              adminStatus?: "active" | "inactive";
              adminScopeMode?: "all" | "restricted";
              adminFacultyIds?: number[];
              adminTokenVersion?: number;
            };
          }

          // Not found in admin_users — check faculty_members directly.
          // Synced faculty may exist here without an admin_users record yet.
          const existingFaculty = await getFacultyMemberByEmail(email, {
            includeInactive: true,
          });
          if (existingFaculty) {
            if (existingFaculty.status !== "active") {
              return null;
            }

            // Create the missing admin_users record and link it
            const newUser = await findOrCreateUserForFaculty({
              name: existingFaculty.name,
              email: existingFaculty.email,
              sapId: existingFaculty.sapId,
            });
            await linkFacultyMemberToUser(existingFaculty.id, newUser.id);

            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              sapId: existingFaculty.sapId,
              adminId: newUser.id,
              adminStatus: newUser.status,
              adminTokenVersion: newUser.tokenVersion,
              facultyMemberId: existingFaculty.id,
              userType: "faculty" as const,
              applicantRole: "faculty" as const,
              facultyId: existingFaculty.facultyId ?? undefined,
              departmentId: existingFaculty.departmentId ?? undefined,
              facultyDepartment: existingFaculty.department ?? undefined,
              facultyDesignation: existingFaculty.designation ?? undefined,
            };
          }

          // Not found in admin_users or faculty_members — try SAP employee
          // verification. This handles new faculty who haven't been synced yet.
          const empResult = await verifyEmployeeByEmail(email);
          if (!empResult.ok) {
            return null;
          }

          // Create a unified admin_users record for this new faculty member
          const newUser = await findOrCreateUserForFaculty({
            name: empResult.employeeName ?? empResult.email,
            email: empResult.email,
            sapId: empResult.sapId,
          });

          // Ensure the faculty profile exists in our internal database
          const faculty = await upsertFacultyMemberFromSap({
            sapId: empResult.sapId,
            name: empResult.employeeName ?? empResult.email,
            email: empResult.email,
            department: empResult.department ?? "Unknown Department",
            designation: empResult.designation,
            employeeType: null,
          });

          // Link faculty_members.user_id to admin_users.id
          await linkFacultyMemberToUser(faculty.id, newUser.id);

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            sapId: empResult.sapId,
            adminId: newUser.id,
            adminStatus: newUser.status,
            adminTokenVersion: newUser.tokenVersion,
            facultyMemberId: faculty.id,
            userType: "faculty" as const,
            applicantRole: "faculty" as const,
            facultyId: faculty.facultyId ?? undefined,
            departmentId: faculty.departmentId ?? undefined,
            facultyDepartment: faculty.department ?? undefined,
            facultyDesignation: faculty.designation ?? undefined,
          };
        }

        // ─── Student flow ───
        const result = await verifyStudentByEmail(email);
        if (!result.ok) {
          return null;
        }

        return {
          id: result.sapId,
          email: result.email,
          name: result.studentName ?? result.email,
          sapId: result.sapId,
          studentRecord: result.studentRecord,
          userType: "student" as const,
          applicantRole: "student" as const,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Respect the callbackUrl passed to signIn()/signOut() so that, e.g.,
      // signOut({ callbackUrl: "/auth/sign-in" }) goes directly to the login
      // page instead of bouncing through the proxy. For sign-in with
      // redirect: false (our normal path), this only affects result.url which
      // is used as a fallback by resolvePostLoginRedirect — the actual
      // role-based destination is determined client-side from the session.
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.sapId = user.sapId;
        token.studentRecord = user.studentRecord;
        token.adminId = user.adminId;
        token.adminRole = user.adminRole;
        token.adminStatus = user.adminStatus;
        token.adminScopeMode = user.adminScopeMode;
        token.adminFacultyIds = user.adminFacultyIds;
        token.adminTokenVersion = user.adminTokenVersion;
        token.facultyMemberId = user.facultyMemberId;
        token.userType = user.userType;
        token.applicantRole = user.applicantRole;
        token.facultyId = (user as { facultyId?: number }).facultyId;
        token.departmentId = (user as { departmentId?: number }).departmentId;
        token.facultyDepartment = (user as { facultyDepartment?: string }).facultyDepartment;
        token.facultyDesignation = (user as { facultyDesignation?: string | null }).facultyDesignation;
        token.name = user.name;
        token.email = user.email;

        if (user.adminId) {
          token.actingAdminId = user.adminId;
          token.actingAdminRole = user.adminRole;
          token.actingAdminTokenVersion = user.adminTokenVersion;
          token.viewAsActive = false;
          token.viewAsUserName = undefined;
        }
      }

      if (trigger === "update" && session) {
        const update = session as ViewAsSessionUpdate;
        const actingAdminId = String(token.actingAdminId ?? token.adminId ?? "");

        if (update.action === "startViewAs" && update.targetAdminId && update.viewAsRole) {
          const targetResult = await validateViewAsTarget(
            actingAdminId,
            update.targetAdminId,
            update.viewAsRole,
          );
          if (targetResult.ok) {
            const patch = await buildViewAsTokenFields(targetResult.target);
            if (patch) Object.assign(token, patch);
          }
        } else if (update.action === "stopViewAs") {
          const patch = await buildAdministratorRestoreTokenFields(actingAdminId);
          if (patch) {
            Object.assign(token, patch);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? undefined;
        session.user.sapId = token.sapId;
        session.user.studentRecord = token.studentRecord;
        session.user.adminId = token.adminId;
        session.user.adminRole = token.adminRole;
        session.user.adminStatus = token.adminStatus;
        session.user.adminScopeMode = token.adminScopeMode;
        session.user.adminFacultyIds = token.adminFacultyIds;
        session.user.facultyMemberId = token.facultyMemberId;
        session.user.userType = token.userType;
        session.user.applicantRole = token.applicantRole;
        session.user.actingAdminId = token.actingAdminId;
        session.user.actingAdminRole = token.actingAdminRole;
        session.user.viewAsActive = Boolean(token.viewAsActive);
        session.user.viewAsUserName = token.viewAsUserName;
        (session.user as { facultyId?: number }).facultyId = token.facultyId as number | undefined;
        (session.user as { departmentId?: number }).departmentId = token.departmentId as number | undefined;
        (session.user as { facultyDepartment?: string }).facultyDepartment = token.facultyDepartment;
        (session.user as { facultyDesignation?: string | null }).facultyDesignation =
          token.facultyDesignation;

        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
};

/**
 * Links a faculty_members record to its corresponding admin_users record.
 * Called after upserting a faculty member from SAP login flow.
 */
async function linkFacultyMemberToUser(
  facultyMemberId: string,
  userId: string,
): Promise<void> {
  const { db } = await import("@/lib/db");
  await db.query(
    `
      UPDATE faculty_members
      SET user_id = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `,
    [facultyMemberId, userId],
  );
}
