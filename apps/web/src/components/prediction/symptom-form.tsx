"use client";

import { InputType, symptomPayloadSchema } from "@disease-prediction/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SymptomFormData = z.infer<typeof symptomPayloadSchema>;

interface SymptomFormProps {
  onSubmit: (inputType: InputType, payload: SymptomFormData) => void;
  isLoading: boolean;
}

export function SymptomForm({ onSubmit, isLoading }: SymptomFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SymptomFormData>({
    resolver: zodResolver(symptomPayloadSchema),
  });

  const handleFormSubmit = (data: SymptomFormData) => {
    onSubmit(InputType.SYMPTOM, data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="symptoms">Describe Your Symptoms</Label>
        <Textarea
          id="symptoms"
          placeholder="Describe your symptoms in detail. For example: I've been experiencing a persistent headache for the past 3 days, along with mild fever and fatigue..."
          className="min-h-[140px]"
          {...register("symptoms")}
        />
        {errors.symptoms && <p className="text-xs text-destructive">{errors.symptoms.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (optional)</Label>
          <Input id="duration" placeholder="e.g., 3 days" {...register("duration")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Severity (optional)</Label>
          <Input id="severity" placeholder="e.g., moderate" {...register("severity")} />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          "Analyze Symptoms"
        )}
      </Button>
    </form>
  );
}
