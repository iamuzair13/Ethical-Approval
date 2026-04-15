import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    sapId?: string;
    studentRecord?: Record<string, unknown>;
    adminId?: string;
    adminRole?: "administrator" | "dean" | "ireb";
    adminStatus?: "active" | "inactive";
    adminScopeMode?: "all" | "restricted";
    adminFacultyIds?: number[];
    adminTokenVersion?: number;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      sapId?: string;
      studentRecord?: Record<string, unknown>;
      adminId?: string;
      adminRole?: "administrator" | "dean" | "ireb";
      adminStatus?: "active" | "inactive";
      adminScopeMode?: "all" | "restricted";
      adminFacultyIds?: number[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sapId?: string;
    studentRecord?: Record<string, unknown>;
    adminId?: string;
    adminRole?: "administrator" | "dean" | "ireb";
    adminStatus?: "active" | "inactive";
    adminScopeMode?: "all" | "restricted";
    adminFacultyIds?: number[];
    adminTokenVersion?: number;
  }
}
