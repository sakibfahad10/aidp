"use client";

import { InputType, reportPayloadSchema } from "@disease-prediction/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReportFormData = z.infer<typeof reportPayloadSchema>;

interface ReportFormProps {
  onSubmit: (inputType: InputType, payload: ReportFormData) => void;
  isLoading: boolean;
}

export function ReportForm({ onSubmit, isLoading }: ReportFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportPayloadSchema),
  });

  const handleFormSubmit = (data: ReportFormData) => {
    onSubmit(InputType.REPORT, data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="reportType">Report Type (optional)</Label>
        <Input
          id="reportType"
          placeholder="e.g., Blood Test, X-Ray, MRI, General Checkup"
          {...register("reportType")}
        />
      </div>

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
  );
}
