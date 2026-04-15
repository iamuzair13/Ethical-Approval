import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getAuthSecret } from "@/lib/auth-secret";
import { verifyStudentByEmail } from "@/lib/sap-student";
import { buildAdminClaims, getAdminUserByEmail } from "@/lib/admin-repository";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
    CredentialsProvider({
      id: "student-email",
      name: "Student email (testing)",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email) return null;

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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email =
          user.email ?? (profile as { email?: string } | undefined)?.email;
        if (!email) {
          return "/auth/sign-in?error=MissingEmail";
        }

        const result = await verifyStudentByEmail(email);
        if (!result.ok) {
          const params = new URLSearchParams({ error: result.errorCode });
          return `/auth/sign-in?${params.toString()}`;
        }

        user.sapId = result.sapId;
        user.studentRecord = result.studentRecord;
        if (result.studentName) {
          user.name = result.studentName;
        }
        return true;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always keep redirects on same-origin.
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
    async jwt({ token, user }) {
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
      }
      return session;
    },
  },
};
