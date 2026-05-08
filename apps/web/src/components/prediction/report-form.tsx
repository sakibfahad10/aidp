"use client";

import {
  ALLOWED_REPORT_FILE_MIME_TYPES,
  InputType,
  isAllowedReportFile,
  MAX_REPORT_FILE_SIZE_BYTES,
  reportPayloadSchema,
} from "@disease-prediction/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReportTextFormData = z.infer<typeof reportPayloadSchema>;

type Mode = "upload" | "text";

interface ReportFormProps {
  onSubmit: (inputType: InputType, payload: ReportTextFormData) => void;
  onSubmitFile?: (file: File, reportType?: string) => void;
  isLoading: boolean;
}

const ACCEPT_ATTR = ALLOWED_REPORT_FILE_MIME_TYPES.join(",");
const MAX_MB = Math.round(MAX_REPORT_FILE_SIZE_BYTES / (1024 * 1024));

function isAllowedMimeType(mimeType: string): boolean {
  return (ALLOWED_REPORT_FILE_MIME_TYPES as readonly string[]).includes(mimeType);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ReportForm({ onSubmit, onSubmitFile, isLoading }: ReportFormProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [reportType, setReportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const reportTypeId = useId();
  const fileInputId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportTextFormData>({
    resolver: zodResolver(reportPayloadSchema),
  });

  const handleTextSubmit = (data: ReportTextFormData) => {
    onSubmit(InputType.REPORT, { ...data, reportType: reportType || undefined });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!isAllowedMimeType(picked.type)) {
      setFile(null);
      setFileError("Unsupported file type. Please upload a PDF, JPEG, or PNG.");
      return;
    }
    if (picked.size > MAX_REPORT_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(picked);
    setFileError(null);
  };

  const handleFileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setFileError("Please select a file to upload.");
      return;
    }
    if (!isAllowedReportFile(file.type, file.size)) {
      setFileError(`File must be a PDF, JPEG, or PNG under ${MAX_MB} MB.`);
      return;
    }
    onSubmitFile?.(file, reportType || undefined);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setFileError(null);
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Report input mode"
        className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          onClick={() => switchMode("upload")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Upload file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "text"}
          onClick={() => switchMode("text")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "text"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Paste text
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={reportTypeId}>Report Type (optional)</Label>
        <Input
          id={reportTypeId}
          placeholder="e.g., Blood Test, X-Ray, MRI, General Checkup"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        />
      </div>

      {mode === "upload" ? (
        <form onSubmit={handleFileSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={fileInputId}>Medical Report File</Label>
            <input
              id={fileInputId}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              PDF, JPEG, or PNG &mdash; up to {MAX_MB} MB.
            </p>
            {file && !fileError && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{file.name}</span> (
                {formatFileSize(file.size)})
              </p>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || !file || !!fileError}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Report...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze Report
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(handleTextSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reportText">Medical Report Text</Label>
            <Textarea
              id="reportText"
              placeholder="Paste your medical report text here. Include lab results, diagnostic findings, or doctor's notes..."
              className="min-h-[200px] font-mono text-xs"
              {...register("reportText")}
            />
            {errors.reportText && (
              <p className="text-xs text-destructive">{errors.reportText.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Report...
              </>
            ) : (
              "Analyze Report"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
