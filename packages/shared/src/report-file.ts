import { z } from "zod";

/** MIME types accepted for report-file uploads. */
export const ALLOWED_REPORT_FILE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

/** Maximum allowed size, in bytes, for a single report-file upload (10 MB). */
export const MAX_REPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type AllowedReportFileMimeType = (typeof ALLOWED_REPORT_FILE_MIME_TYPES)[number];

/**
 * Pure predicate: does this MIME type and size satisfy the report-file upload rules?
 * Single source of truth shared by client- and server-side validation.
 */
export function isAllowedReportFile(mimeType: string, sizeBytes: number): boolean {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return false;
  if (sizeBytes > MAX_REPORT_FILE_SIZE_BYTES) return false;
  return (ALLOWED_REPORT_FILE_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Persisted metadata for a report-file submission (the file itself is discarded). */
export const reportFileMetadataSchema = z.object({
  reportType: z.string().optional(),
  fileName: z.string().min(1, "fileName is required"),
  mimeType: z.enum(ALLOWED_REPORT_FILE_MIME_TYPES),
  fileSizeBytes: z
    .number()
    .int("fileSizeBytes must be an integer")
    .positive("fileSizeBytes must be positive")
    .max(MAX_REPORT_FILE_SIZE_BYTES, "fileSizeBytes exceeds the maximum allowed size"),
});

export type ReportFileMetadata = z.infer<typeof reportFileMetadataSchema>;
