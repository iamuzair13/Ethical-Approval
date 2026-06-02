import type { ActivityActionCode, ActivityActorSnapshot, AdminRole, ImpersonationMode } from "./types";

function roleLabel(role: AdminRole | string): string {
  if (role === "administrator") return "Administrator";
  if (role === "dean") return "Dean";
  if (role === "ireb") return "IREB Member";
  return String(role);
}

function actionLabel(actionCode: string): string {
  const labels: Record<string, string> = {
    "admin.user.create": "Create User",
    "admin.user.update": "Update User",
    "admin.user.activate": "Activate User",
    "admin.user.deactivate": "Deactivate User",
    "admin.user.password_reset": "Reset Password",
    "admin.faculty.create": "Create Faculty",
    "admin.faculty.update": "Update Faculty",
    "admin.faculty.delete": "Delete Faculty",
    "admin.faculty.assign_dean": "Assign Dean",
    "admin.faculty.assign_ireb": "Assign IREB Member",
    "admin.faculty.remove_ireb": "Remove IREB Assignment",
    "admin.department.create": "Create Department",
    "admin.department.update": "Update Department",
    "admin.department.delete": "Delete Department",
    "application.review.approve": "Approve Application",
    "application.review.reject": "Reject Application",
    "profile.update": "Update Profile",
    "profile.avatar.update": "Update Profile Photo",
    "profile.avatar.remove": "Remove Profile Photo",
    "admin.report.export": "Export Data",
    "admin.view_as.start": "Start View As",
    "admin.view_as.stop": "Stop View As",
  };
  return labels[actionCode] ?? actionCode;
}

export function buildImpersonationDescription(
  actor: ActivityActorSnapshot,
  effective: ActivityActorSnapshot,
  actionCode: string,
  mode: ImpersonationMode,
): string {
  const action = actionLabel(actionCode);
  if (mode === "view_as") {
    return `${roleLabel(actor.role)} ${actor.name} performed '${action}' while viewing as ${roleLabel(effective.role)} ${effective.name}.`;
  }
  return `${roleLabel(actor.role)} ${actor.name} performed '${action}' on behalf of ${roleLabel(effective.role)} ${effective.name}.`;
}

export function buildSelfActionDescription(
  actor: ActivityActorSnapshot,
  actionCode: ActivityActionCode | string,
  detail?: string,
): string {
  const action = actionLabel(actionCode);
  if (detail) {
    return `${roleLabel(actor.role)} ${actor.name} ${detail}.`;
  }
  if (actionCode === "profile.update") {
    return `${roleLabel(actor.role)} ${actor.name} updated their profile.`;
  }
  if (actionCode === "profile.avatar.update") {
    return `${roleLabel(actor.role)} ${actor.name} updated their profile photo.`;
  }
  if (actionCode === "profile.avatar.remove") {
    return `${roleLabel(actor.role)} ${actor.name} removed their profile photo.`;
  }
  return `${roleLabel(actor.role)} ${actor.name} performed '${action}'.`;
}

export function buildCrossUserDescription(
  actor: ActivityActorSnapshot,
  target: ActivityActorSnapshot,
  actionCode: ActivityActionCode | string,
): string {
  const action = actionLabel(actionCode);
  if (actionCode === "admin.user.activate") {
    return `${roleLabel(actor.role)} ${actor.name} activated ${roleLabel(target.role)} ${target.name}.`;
  }
  if (actionCode === "admin.user.deactivate") {
    return `${roleLabel(actor.role)} ${actor.name} deactivated ${roleLabel(target.role)} ${target.name}.`;
  }
  if (actionCode === "admin.user.create") {
    return `${roleLabel(actor.role)} ${actor.name} created ${roleLabel(target.role)} ${target.name}.`;
  }
  if (actionCode === "admin.user.update" || actionCode === "admin.user.password_reset") {
    return `${roleLabel(actor.role)} ${actor.name} updated ${roleLabel(target.role)} ${target.name}.`;
  }
  if (actionCode === "admin.faculty.assign_ireb") {
    return `${roleLabel(actor.role)} ${actor.name} updated faculty assignments for ${roleLabel(target.role)} ${target.name}.`;
  }
  return `${roleLabel(actor.role)} ${actor.name} performed '${action}' on ${roleLabel(target.role)} ${target.name}.`;
}

export function buildActivityDescription(input: {
  actionCode: string;
  actor: ActivityActorSnapshot;
  effective: ActivityActorSnapshot;
  impersonationMode: ImpersonationMode | null;
  targetLabel?: string | null;
  customDescription?: string;
}): string {
  if (input.customDescription?.trim()) {
    return input.customDescription.trim();
  }

  const samePerson =
    input.actor.adminId &&
    input.effective.adminId &&
    input.actor.adminId === input.effective.adminId;

  if (input.impersonationMode && !samePerson) {
    return buildImpersonationDescription(
      input.actor,
      input.effective,
      input.actionCode,
      input.impersonationMode,
    );
  }

  if (!samePerson && input.actor.role === "administrator") {
    return buildCrossUserDescription(input.actor, input.effective, input.actionCode);
  }

  if (input.actionCode === "application.review.approve" && input.targetLabel) {
    return buildSelfActionDescription(
      input.effective,
      input.actionCode,
      `approved application ${input.targetLabel}`,
    );
  }
  if (input.actionCode === "application.review.reject" && input.targetLabel) {
    return buildSelfActionDescription(
      input.effective,
      input.actionCode,
      `rejected application ${input.targetLabel}`,
    );
  }

  return buildSelfActionDescription(input.actor, input.actionCode);
}

export function actorFromAdminUser(user: {
  id: string;
  name: string;
  role: AdminRole;
}): ActivityActorSnapshot {
  return { adminId: user.id, name: user.name, role: user.role };
}
