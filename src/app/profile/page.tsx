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
import { useMemo, useState } from "react";

type RequestStage =
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IERB"
  | "Approved by IERB"
  | "Rejected by IERB";

type ApprovalRequest = {
  id: string;
  title: string;
  submittedOn: string;
  expectedResponseDays: number;
  currentStage: RequestStage;
  description: string;
};

const STAGES: RequestStage[] = [
  "Under Review by Dean",
  "Approved by Dean",
  "Rejected by Dean",
  "Under Review by IERB",
  "Approved by IERB",
  "Rejected by IERB",
];

export default function Page() {
  const profile = {
    name: "Ayesha Khan",
    regNo: "UOL-2022-CS-184",
    email: "ayesha.khan@uol.edu.pk",
    department: "Computer Science",
  };

  const [isStepperOpen, setIsStepperOpen] = useState(false);

  const [requests, setRequests] = useState<ApprovalRequest[]>([
    {
      id: "REQ-1001",
      title: "Survey on Student Mental Wellbeing",
      submittedOn: "2026-04-08",
      expectedResponseDays: 2,
      currentStage: "Under Review by Dean",
      description: "Cross-department survey including informed consent.",
    },
    {
      id: "REQ-1002",
      title: "Final Year Project User Interviews",
      submittedOn: "2026-04-02",
      expectedResponseDays: 2,
      currentStage: "Approved by IERB",
      description: "Interviews with postgraduate students and supervisors.",
    },
  ]);

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
      r.currentStage.includes("Ethical") && !r.currentStage.includes("Approved") && !r.currentStage.includes("Rejected"),
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

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by Dean</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.inDean}</p>
            </div>
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by IERB</p>
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
            onClick={() => setIsStepperOpen(true)}
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-opacity-90"
          >
            Open Approval Request Stepper
          </button>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Track Submitted Requests
          </h3>

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
      />
    </div>
  );
}
