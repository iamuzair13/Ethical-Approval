"use client";

import { ModalButton, ModalShell } from "../modal-shell";

type AttachmentViewModalProps = {
  label: string;
  fileName: string;
  hasStoredFile: boolean;
  downloadUrl?: string;
  onClose: () => void;
  onOpenFile: () => void;
  onDownloadFile: () => void;
  onDownloadSummary: () => void;
};

export function AttachmentViewModal({
  label,
  fileName,
  hasStoredFile,
  downloadUrl,
  onClose,
  onOpenFile,
  onDownloadFile,
  onDownloadSummary,
}: AttachmentViewModalProps) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title={label}
      maxWidth="md"
      zIndex="top"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Close
          </ModalButton>
          {hasStoredFile && downloadUrl ? (
            <>
              <ModalButton variant="secondary" onClick={onOpenFile}>
                Open file
              </ModalButton>
              <ModalButton variant="primary" onClick={onDownloadFile}>
                Download file
              </ModalButton>
            </>
          ) : (
            <ModalButton variant="primary" onClick={onDownloadSummary}>
              Download summary
            </ModalButton>
          )}
        </>
      }
    >
      <p className="break-all font-mono text-sm text-gray-700 dark:text-gray-300">{fileName}</p>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {hasStoredFile && downloadUrl
          ? "This file is stored on the server. Use Open to view it in a new tab, or Download to save a copy."
          : "For this slot only the file name was recorded (legacy submission). Download saves a short text summary; contact the applicant for the actual file."}
      </p>
    </ModalShell>
  );
}
