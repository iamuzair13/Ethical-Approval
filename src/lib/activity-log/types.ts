export type AdminRole = "administrator" | "dean" | "ireb";

export type ImpersonationMode = "view_as" | "on_behalf";

export type TargetType =
  | "application"
  | "dean"
  | "ireb_member"
  | "administrator"
  | "faculty"
  | "department"
  | "settings"
  | "report"
  | "profile"
  | "system";

export type ActivityActionCode =
  | "admin.user.create"
  | "admin.user.update"
  | "admin.user.activate"
  | "admin.user.deactivate"
  | "admin.user.password_reset"
  | "admin.faculty.create"
  | "admin.faculty.update"
  | "admin.faculty.delete"
  | "admin.faculty.assign_dean"
  | "admin.faculty.assign_ireb"
  | "admin.faculty.remove_ireb"
  | "admin.department.create"
  | "admin.department.update"
  | "admin.department.delete"
  | "application.review.approve"
  | "application.review.reject"
  | "profile.update"
  | "profile.avatar.update"
  | "profile.avatar.remove"
  | "admin.report.export"
  | "admin.view_as.start"
  | "admin.view_as.stop";

export type ActivityActorSnapshot = {
  adminId: string | null;
  name: string;
  role: AdminRole;
};

export type ActivityContext = {
  actor: ActivityActorSnapshot;
  effective: ActivityActorSnapshot;
  impersonationMode: ImpersonationMode | null;
  actorTimezone: string;
};

export type ActivityEventInput = {
  actionCode: ActivityActionCode | string;
  targetType: TargetType | string;
  targetId?: string | null;
  targetLabel?: string | null;
  description?: string;
  facultyId?: number | null;
  facultyName?: string | null;
  submissionId?: number | null;
  metadata?: Record<string, unknown>;
  context?: ActivityContext;
  /** Override actors when logging from handlers without a request token */
  actor?: ActivityActorSnapshot;
  effective?: ActivityActorSnapshot;
  impersonationMode?: ImpersonationMode | null;
  actorTimezone?: string;
};

export type ActivityEventRow = {
  id: number;
  action_code: string;
  description: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  actor_admin_id: string | null;
  actor_name: string;
  actor_role: string;
  effective_admin_id: string | null;
  effective_name: string | null;
  effective_role: string | null;
  impersonation_mode: string | null;
  faculty_id: number | null;
  faculty_name: string | null;
  submission_id: number | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  actor_timezone: string | null;
};

export type ActivityEventDto = {
  id: number;
  actionCode: string;
  description: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  actorName: string;
  actorRole: string;
  effectiveName: string | null;
  effectiveRole: string | null;
  impersonationMode: string | null;
  facultyName: string | null;
  submissionId: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorTimezone: string | null;
  createdAtFormatted: string;
};

export type ActivityEventsFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "asc" | "desc";
  actorRole?: string;
  actorAdminId?: string;
  actionCode?: string;
  targetType?: string;
  facultyId?: number;
  dateFrom?: string;
  dateTo?: string;
  impersonation?: "only" | "exclude" | "all";
};

export type ActivityEventsScope = {
  role: AdminRole;
  adminId: string;
};

export type ActivityEventsQueryResult = {
  rows: ActivityEventRow[];
  total: number;
};
