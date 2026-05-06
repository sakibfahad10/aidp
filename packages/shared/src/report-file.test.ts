import { describe, expect, it } from "vitest";
import {
  ALLOWED_REPORT_FILE_MIME_TYPES,
  isAllowedReportFile,
  MAX_REPORT_FILE_SIZE_BYTES,
  reportFileMetadataSchema,
} from "./report-file";

const ONE_MB = 1024 * 1024;

describe("isAllowedReportFile", () => {
  it("accepts each allowed mime type at a typical size", () => {
    for (const mimeType of ALLOWED_REPORT_FILE_MIME_TYPES) {
      expect(isAllowedReportFile(mimeType, ONE_MB)).toBe(true);
    }
  });

  it("accepts a file exactly at the maximum size", () => {
    expect(isAllowedReportFile("application/pdf", MAX_REPORT_FILE_SIZE_BYTES)).toBe(true);
  });

  it("rejects a file one byte over the maximum size", () => {
    expect(isAllowedReportFile("application/pdf", MAX_REPORT_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it("rejects unsupported mime types even when under the size limit", () => {
    expect(isAllowedReportFile("application/zip", ONE_MB)).toBe(false);
    expect(isAllowedReportFile("text/plain", ONE_MB)).toBe(false);
    expect(isAllowedReportFile("image/gif", ONE_MB)).toBe(false);
    expect(isAllowedReportFile("image/heic", ONE_MB)).toBe(false);
  });

  it("rejects empty, zero-sized, or non-finite sizes", () => {
    expect(isAllowedReportFile("application/pdf", 0)).toBe(false);
    expect(isAllowedReportFile("application/pdf", -1)).toBe(false);
    expect(isAllowedReportFile("application/pdf", Number.NaN)).toBe(false);
    expect(isAllowedReportFile("application/pdf", Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("pins the 10 MB limit so it cannot drift silently", () => {
    expect(MAX_REPORT_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("reportFileMetadataSchema", () => {
  const valid = {
    fileName: "labs.pdf",
    mimeType: "application/pdf" as const,
    fileSizeBytes: ONE_MB,
  };

  it("accepts a well-formed metadata object", () => {
    expect(reportFileMetadataSchema.parse(valid)).toEqual(valid);
  });

  it("accepts a well-formed metadata object with optional reportType", () => {
    const withType = { ...valid, reportType: "Blood Test" };
    expect(reportFileMetadataSchema.parse(withType)).toEqual(withType);
  });

  it("rejects an unsupported mime type", () => {
    const bad = { ...valid, mimeType: "application/zip" };
    expect(reportFileMetadataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a size over the maximum", () => {
    const bad = { ...valid, fileSizeBytes: MAX_REPORT_FILE_SIZE_BYTES + 1 };
    expect(reportFileMetadataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a non-positive size", () => {
    expect(reportFileMetadataSchema.safeParse({ ...valid, fileSizeBytes: 0 }).success).toBe(false);
    expect(reportFileMetadataSchema.safeParse({ ...valid, fileSizeBytes: -1 }).success).toBe(false);
  });

  it("rejects a non-integer size", () => {
    expect(reportFileMetadataSchema.safeParse({ ...valid, fileSizeBytes: 1.5 }).success).toBe(
      false,
    );
  });

  it("rejects an empty fileName", () => {
    expect(reportFileMetadataSchema.safeParse({ ...valid, fileName: "" }).success).toBe(false);
  });

  it("rejects a missing fileName", () => {
    const { fileName: _omit, ...rest } = valid;
    expect(reportFileMetadataSchema.safeParse(rest).success).toBe(false);
  });
});
