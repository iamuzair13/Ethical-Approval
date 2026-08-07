import { redirect } from "next/navigation";

/**
 * /users has been merged into /faculty-members.
 * User management is now integrated directly into the faculty members page
 * via the "Add Faculty Member" dialog and per-row actions.
 */
export default function UsersPage() {
  redirect("/faculty-members");
}
