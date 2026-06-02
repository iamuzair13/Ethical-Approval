import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthSecret } from "@/lib/auth-secret";
import { verifyEmployeeByEmail } from "@/lib/sap-employee";
import { verifyStudentByEmail } from "@/lib/sap-student";
import { buildAdminClaims, getAdminUserByEmail } from "@/lib/admin-repository";
import { verifyPassword } from "@/lib/password";
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
    CredentialsProvider({
      id: "student-email",
      name: "Student email (testing)",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email) return null;

        if (!isStudentEmail(email)) {
          const empResult = await verifyEmployeeByEmail(email);
          if (!empResult.ok) {
            return null;
          }

          return {
            id: empResult.sapId,
            email: empResult.email,
            name: empResult.employeeName ?? empResult.email,
            sapId: empResult.sapId,
            facultyDepartment: empResult.department ?? undefined,
            facultyDesignation: empResult.designation,
            applicantRole: "faculty",
          };
        }

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
          applicantRole: "student",
        };
      },
    }),
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const admin = await getAdminUserByEmail(email);
        if (!admin || admin.status !== "active") {
          return null;
        }

        const valid = await verifyPassword(password, admin.passwordHash);
        if (!valid) {
          return null;
        }

        const claims = await buildAdminClaims(admin);
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          adminId: claims.adminId,
          adminRole: claims.role,
          adminStatus: claims.status,
          adminScopeMode: claims.scopeMode,
          adminFacultyIds: claims.facultyIds,
          adminTokenVersion: claims.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const safeUrl = url.startsWith("/") ? `${baseUrl}${url}` : url;
      const target = new URL(safeUrl, baseUrl);

      if (target.pathname === "/") {
        if (target.searchParams.get("portal") === "admin") {
          return `${baseUrl}/`;
        }
        return `${baseUrl}/profile`;
      }

      if (target.origin === new URL(baseUrl).origin) {
        return target.toString();
      }

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
        token.applicantRole = user.applicantRole;
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
            Object.assign(token, patch);
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
        session.user.applicantRole = token.applicantRole;
        session.user.actingAdminId = token.actingAdminId;
        session.user.actingAdminRole = token.actingAdminRole;
        session.user.viewAsActive = Boolean(token.viewAsActive);
        session.user.viewAsUserName = token.viewAsUserName;
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
