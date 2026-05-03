"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { structuredPayloadSchema, InputType } from "@disease-prediction/shared";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";

type StructuredFormData = z.infer<typeof structuredPayloadSchema>;

interface StructuredFormProps {
  onSubmit: (inputType: InputType, payload: StructuredFormData) => void;
  isLoading: boolean;
}

const commonSymptoms = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea",
  "Dizziness", "Chest Pain", "Shortness of Breath", "Joint Pain",
  "Sore Throat", "Back Pain", "Abdominal Pain",
];

export function StructuredForm({ onSubmit, isLoading }: StructuredFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StructuredFormData>({
    resolver: zodResolver(structuredPayloadSchema),
    defaultValues: {
      symptoms: [],
      medicalHistory: [],
      currentMedications: [],
    },
  });

  const selectedSymptoms = watch("symptoms") || [];

  const toggleSymptom = (symptom: string) => {
    const current = selectedSymptoms;
    const updated = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];
    setValue("symptoms", updated, { shouldValidate: true });
  };

  const handleFormSubmit = (data: StructuredFormData) => {
    onSubmit(InputType.STRUCTURED, data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="e.g., 30"
            {...register("age", { valueAsNumber: true })}
          />
          {errors.age && (
            <p className="text-xs text-destructive">{errors.age.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            className="flex h-10 w-full rounded-lg border border-input bg-white/[0.03] px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
            {...register("gender")}
          >
            <option value="" className="bg-background">Select gender</option>
            <option value="male" className="bg-background">Male</option>
            <option value="female" className="bg-background">Female</option>
            <option value="other" className="bg-background">Other</option>
          </select>
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>
      </div>

      {/* Symptom Selection */}
      <div className="space-y-2">
        <Label>Select Symptoms</Label>
        <div className="flex flex-wrap gap-2">
          {commonSymptoms.map((symptom) => {
            const isSelected = selectedSymptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                onClick={() => toggleSymptom(symptom)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06]"
                }`}
              >
                {symptom}
                {isSelected && <X className="inline ml-1 h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {errors.symptoms && (
          <p className="text-xs text-destructive">{errors.symptoms.message}</p>
        )}
      </div>

      {/* Vitals */}
      <div className="space-y-2">
        <Label>Vitals (optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Blood Pressure (e.g., 120/80)"
            {...register("vitals.bloodPressure")}
          />
          <Input
            placeholder="Heart Rate (bpm)"
            type="number"
            {...register("vitals.heartRate", { valueAsNumber: true })}
          />
          <Input
            placeholder="Temperature (°C)"
            type="number"
            step="0.1"
            {...register("vitals.temperature", { valueAsNumber: true })}
          />
          <Input
            placeholder="Weight (kg)"
            type="number"
            step="0.1"
            {...register("vitals.weight", { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          "Analyze Health Data"
        )}
      </Button>
    </form>
  );
}
