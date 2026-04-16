"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ApprovalRequestStepper from "@/app/profile/_components/approval-request-stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type RequestStage =
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

type ApprovalRequest = {
  id: string;
  title: string;
  submittedOn: string;
  expectedResponseDays: number;
  currentStage: RequestStage;
  description: string;
};

type SubmissionStatus =
  | "submitted"
  | "under_dean_review"
  | "dean_approved"
  | "dean_rejected"
  | "under_ireb_review"
  | "approved"
  | "rejected";

type ProfileSubmissionApiRow = {
  id: number;
  current_status: SubmissionStatus;
  submitted_at: string;
  title: string | null;
  objectives: string | null;
};

type ApplicationType = "thesis" | "research-publication";

type RequiredForm = {
  label: string;
  href: string;
  applicationType: ApplicationType;
};

const STAGES: RequestStage[] = [
  "Under Review by Dean",
  "Approved by Dean",
  "Rejected by Dean",
  "Under Review by IREB",
  "Approved by IREB",
  "Rejected by IREB",
];

export default function Page() {
  const { data: session } = useSession();

  const profile = useMemo(() => {
    const rec = session?.user?.studentRecord;
    const getStringField = (keys: string[]): string | null => {
      if (!rec || typeof rec !== "object") return null;
      for (const key of keys) {
        const value = (rec as Record<string, unknown>)[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      return null;
    };

    const dept =
      getStringField(["DeptName", "Dept", "Department"]) ?? "—";
    const faculty =
      getStringField(["Faculty", "FacName", "FacultyName", "Campus"]) ?? "—";
    const degreeTitle =
      getStringField(["DegrTitle", "DegreeTitle", "Degree"]) ?? "—";
    const reg =
      rec && typeof rec === "object" && "RegNo" in rec && typeof (rec as { RegNo?: string }).RegNo === "string"
        ? (rec as { RegNo: string }).RegNo
        : session?.user?.sapId
          ? `SAP ${session.user.sapId}`
          : "—";

    return {
      name: session?.user?.name ?? "Student",
      regNo: reg,
      email: session?.user?.email ?? "—",
      department: dept,
      faculty,
      degreeTitle,
    };
  }, [session]);

  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [isApplicationPickerOpen, setIsApplicationPickerOpen] = useState(false);
  const [requiredForm, setRequiredForm] = useState<RequiredForm | null>(null);

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const mapStatusToStage = (status: SubmissionStatus): RequestStage => {
    switch (status) {
      case "submitted":
      case "under_dean_review":
        return "Under Review by Dean";
      case "dean_approved":
        return "Approved by Dean";
      case "dean_rejected":
        return "Rejected by Dean";
      case "under_ireb_review":
        return "Under Review by IREB";
      case "approved":
        return "Approved by IREB";
      case "rejected":
        return "Rejected by IREB";
      default:
        return "Under Review by Dean";
    }
  };

  useEffect(() => {
    if (!session?.user?.sapId) {
      setRequests([]);
      return;
    }

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchRequests = async () => {
      if (isMounted) setIsLoadingRequests(true);
      try {
        const response = await fetch("/api/profile/submissions", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          ok: boolean;
          submissions?: ProfileSubmissionApiRow[];
        };

        if (!payload.ok || !payload.submissions || !isMounted) return;

        const mapped: ApprovalRequest[] = payload.submissions.map((item) => ({
          id: `REQ-${item.id}`,
          title: item.title?.trim() || `Submission #${item.id}`,
          description: item.objectives?.trim() || "No objectives provided.",
          expectedResponseDays: 2,
          submittedOn: new Date(item.submitted_at).toISOString().slice(0, 10),
          currentStage: mapStatusToStage(item.current_status),
        }));
        setRequests(mapped);
      } finally {
        if (isMounted) setIsLoadingRequests(false);
      }
    };

    fetchRequests();
    intervalId = setInterval(fetchRequests, 15000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [session?.user?.sapId]);

  const handleCreateRequest = ({
    title,
    description,
    expectedResponseDays,
  }: {
    title: string;
    description: string;
    expectedResponseDays: number;
  }) => {
    const newRequest: ApprovalRequest = {
      id: `REQ-${1000 + requests.length + 1}`,
      title,
      description,
      expectedResponseDays,
      submittedOn: new Date().toISOString().slice(0, 10),
      currentStage: "Under Review by Dean",
    };

    setRequests((prev) => [newRequest, ...prev]);
  };

  const requestStats = useMemo(() => {
    const inDean = requests.filter((r) =>
      r.currentStage.includes("Dean") && !r.currentStage.includes("Approved") && !r.currentStage.includes("Rejected"),
    ).length;
    const inEthical = requests.filter((r) =>
      r.currentStage.includes("IREB") && !r.currentStage.includes("Approved") && !r.currentStage.includes("Rejected"),
    ).length;
    const completed = requests.filter((r) =>
      r.currentStage.includes("Approved") || r.currentStage.includes("Rejected"),
    ).length;

    return { inDean, inEthical, completed };
  }, [requests]);

  const getStageState = (currentStage: RequestStage, stage: RequestStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    const stageIndex = STAGES.indexOf(stage);

    if (stageIndex < currentIndex) return "done";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  const isStudentEmail = (session?.user?.email ?? "")
    .toLowerCase()
    .endsWith("@student.uol.edu.pk");

  const isMedicalFaculty = useMemo(() => {
    const normalized = profile.faculty.toLowerCase().replace(/\s+/g, " ").trim();
    return (
      normalized.includes("faculty of allied health sciences") ||
      normalized.includes("faculty of medicine & dentistry")
    );
  }, [profile.faculty]);

  const getRequiredForm = (applicationType: ApplicationType): RequiredForm => {
    if (applicationType === "thesis") {
      if (isMedicalFaculty) {
        const label =
          "Form 3_Ethical Form For Students Thesis-Projects (for Medical Sciences).docx";
        return {
          label,
          href: `/${encodeURI(`studentsfinalforms/${label}`)}`,
          applicationType,
        };
      }

      const label = "Form 1 Thesis form Other than Medical Sciences.docx";
      return {
        label,
        href: `/${encodeURI(`studentsfinalforms/${label}`)}`,
        applicationType,
      };
    }

    if (isMedicalFaculty) {
      const label = "Form 4 Research Publication Medical Sciences.docx";
      return {
        label,
        href: `/${encodeURI(`studentsfinalforms/${label}`)}`,
        applicationType,
      };
    }

    const label = "Form 2 Research Publication Form other than medicla sciences.docx";
    return {
      label,
      href: `/${encodeURI(`studentsfinalforms/${label}`)}`,
      applicationType,
    };
  };

  const handleOpenApplicationFlow = () => {
    if (isStudentEmail) {
      setIsApplicationPickerOpen(true);
      return;
    }

    setRequiredForm(null);
    setIsStepperOpen(true);
  };

  const handleSelectApplicationType = (applicationType: ApplicationType) => {
    setRequiredForm(getRequiredForm(applicationType));
    setIsApplicationPickerOpen(false);
    setIsStepperOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Breadcrumb pageName="Profile" />

      <div className="grid gap-6">
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            {profile.name}
          </h2>
          <p className="mt-1 font-medium">
            {profile.regNo} · {profile.department}
          </p>
          <p className="text-body-sm">{profile.email}</p>
          <p className="mt-1 text-body-sm">
            Faculty: {profile.faculty} · Degree: {profile.degreeTitle}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by Dean</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.inDean}</p>
            </div>
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by IREB</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.inEthical}</p>
            </div>
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Completed Decisions</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Create New Approval Request
          </h3>
          <p className="mb-4 text-body-sm">
            Start the multi-step ethical review form and submit your approval request.
          </p>
          <button
            type="button"
            onClick={handleOpenApplicationFlow}
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-opacity-90"
          >
            Open New Approval Application
          </button>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Track Submitted Requests
          </h3>
          {isLoadingRequests && (
            <p className="mb-3 text-body-sm">Refreshing latest submission statuses...</p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Expected Response</TableHead>
                <TableHead>Current Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <p className="font-medium text-dark dark:text-white">{request.title}</p>
                    <p className="text-body-sm">{request.id}</p>
                  </TableCell>
                  <TableCell>{request.submittedOn}</TableCell>
                  <TableCell>{request.expectedResponseDays} days</TableCell>
                  <TableCell>{request.currentStage}</TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-body-sm">
                    No submissions found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-6 grid gap-4">
            {requests.map((request) => (
              <div
                key={`${request.id}-timeline`}
                className="rounded-lg border border-stroke p-4 dark:border-dark-3"
              >
                <p className="font-medium text-dark dark:text-white">{request.title}</p>
                <p className="mb-4 text-body-sm">{request.description}</p>
                <div className="grid gap-2">
                  {STAGES.map((stage) => {
                    const state = getStageState(request.currentStage, stage);

                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex size-2.5 rounded-full",
                            state === "done" && "bg-green",
                            state === "active" && "bg-primary ring-4 ring-primary/20",
                            state === "pending" && "bg-stroke dark:bg-dark-3",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            state === "active" && "font-semibold text-dark dark:text-white",
                          )}
                        >
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ApprovalRequestStepper
        open={isStepperOpen}
        onClose={() => setIsStepperOpen(false)}
        onSubmit={handleCreateRequest}
        requiredForm={requiredForm}
        applicantProfile={{
          name: profile.name,
          regNo: profile.regNo,
          email: profile.email,
          faculty: profile.faculty,
          department: profile.department,
          program: profile.degreeTitle,
        }}
      />

      {isApplicationPickerOpen && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <h3 className="text-heading-6 font-bold text-dark dark:text-white">
              Select Application Type
            </h3>
            <p className="mt-2 text-body-sm">
              Please choose your application type. The required form will be selected
              automatically based on your faculty.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSelectApplicationType("thesis")}
                className="rounded-lg border border-stroke px-4 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:text-white"
              >
                Thesis
              </button>
              <button
                type="button"
                onClick={() => handleSelectApplicationType("research-publication")}
                className="rounded-lg border border-stroke px-4 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:text-white"
              >
                Research Publication
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsApplicationPickerOpen(false)}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
