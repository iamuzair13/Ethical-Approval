import { db } from "@/lib/db";
import { buildActivityDescription } from "./descriptions";
import type { ActivityContext, ActivityEventInput } from "./types";

export async function recordActivityEvent(input: ActivityEventInput): Promise<void> {
  try {
    const ctx = input.context;
    const actor = input.actor ?? ctx?.actor;
    const effective = input.effective ?? ctx?.effective ?? actor;
    if (!actor?.name || !actor?.role) return;

    const impersonationMode =
      input.impersonationMode !== undefined
        ? input.impersonationMode
        : ctx?.impersonationMode ?? null;

    const description =
      input.description ??
      buildActivityDescription({
        actionCode: input.actionCode,
        actor,
        effective: effective ?? actor,
        impersonationMode,
        targetLabel: input.targetLabel,
      });

    const metadata = input.metadata ?? {};

    await db.query(
      `
        INSERT INTO activity_events (
          action_code,
          description,
          target_type,
          target_id,
          target_label,
          actor_admin_id,
          actor_name,
          actor_role,
          effective_admin_id,
          effective_name,
          effective_role,
          impersonation_mode,
          faculty_id,
          faculty_name,
          submission_id,
          metadata_json,
          actor_timezone
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16::jsonb, $17
        )
      `,
      [
        input.actionCode,
        description,
        input.targetType,
        input.targetId ?? null,
        input.targetLabel ?? null,
        actor.adminId,
        actor.name,
        actor.role,
        effective?.adminId ?? null,
        effective?.name ?? null,
        effective?.role ?? null,
        impersonationMode,
        input.facultyId ?? null,
        input.facultyName ?? null,
        input.submissionId ?? null,
        JSON.stringify(metadata),
        input.actorTimezone ?? ctx?.actorTimezone ?? "UTC",
      ],
    );
  } catch (error) {
    console.error("[activity-log] Failed to record event:", error);
  }
}

export function recordActivityEventFireAndForget(input: ActivityEventInput): void {
  void recordActivityEvent(input);
}

export function buildContextInput(
  ctx: ActivityContext,
  rest: Omit<ActivityEventInput, "context" | "actor" | "effective" | "impersonationMode" | "actorTimezone">,
): ActivityEventInput {
  return {
    ...rest,
    context: ctx,
    impersonationMode: ctx.impersonationMode,
    actorTimezone: ctx.actorTimezone,
  };
}
