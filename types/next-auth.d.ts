import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    sapId?: string;
    studentRecord?: Record<string, unknown>;
    facultyMemberId?: string;
    userType?: "student" | "faculty";
    applicantRole?: "student" | "faculty";
    facultyId?: number;
    departmentId?: number;
    facultyDepartment?: string;
    facultyDesignation?: string | null;
    adminId?: string;
    adminRole?: "administrator" | "hod" | "ireb";
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
      facultyMemberId?: string;
      userType?: "student" | "faculty";
      applicantRole?: "student" | "faculty";
      facultyId?: number;
      departmentId?: number;
      facultyDepartment?: string;
      facultyDesignation?: string | null;
      adminId?: string;
      adminRole?: "administrator" | "hod" | "ireb";
      adminStatus?: "active" | "inactive";
      adminScopeMode?: "all" | "restricted";
      adminFacultyIds?: number[];
      actingAdminId?: string;
      actingAdminRole?: "administrator" | "hod" | "ireb";
      viewAsActive?: boolean;
      viewAsUserName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sapId?: string;
    studentRecord?: Record<string, unknown>;
    facultyMemberId?: string;
    userType?: "student" | "faculty";
    applicantRole?: "student" | "faculty";
    facultyId?: number;
    departmentId?: number;
    facultyDepartment?: string;
    facultyDesignation?: string | null;
    adminId?: string;
    adminRole?: "administrator" | "hod" | "ireb";
    adminStatus?: "active" | "inactive";
    adminScopeMode?: "all" | "restricted";
    adminFacultyIds?: number[];
    adminTokenVersion?: number;
    actingAdminId?: string;
    actingAdminRole?: "administrator" | "hod" | "ireb";
    actingAdminTokenVersion?: number;
    viewAsActive?: boolean;
    viewAsUserName?: string;
    /** "admin" when impersonating an admin user (hod/ireb), "student" for a student. */
    viewAsTargetType?: "admin" | "student";
    /** Target student's identity — admin token stays intact, session overlays these. */
    viewAsStudentSapId?: string;
    viewAsStudentName?: string;
    viewAsStudentEmail?: string;
    viewAsStudentRecord?: Record<string, unknown>;
    name?: string | null;
    email?: string | null;
  }
}
