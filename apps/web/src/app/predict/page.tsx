"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  AIPredictionResponse,
  InputType,
  PredictionPayload,
} from "@disease-prediction/shared";
import { AlertCircle, ClipboardList, FileText, Stethoscope } from "lucide-react";
import { useState } from "react";
import { ReportForm } from "@/components/prediction/report-form";
import { PredictionResultCard } from "@/components/prediction/result-card";
import { StructuredForm } from "@/components/prediction/structured-form";
import { SymptomForm } from "@/components/prediction/symptom-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPrediction } from "@/lib/api";

export default function PredictPage() {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (inputType: InputType, payload: PredictionPayload) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();
      const response = await createPrediction({ inputType, payload }, token);
      if (response.success && response.data) {
        // Extract the AI response from the stored prediction
        const aiResult = response.data.result as AIPredictionResponse;
        setResult(aiResult);
      } else {
        setError(response.error || "Something went wrong");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get prediction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          AI Health <span className="gradient-text">Prediction</span>
        </h1>
        <p className="text-muted-foreground">
          Choose an input method and get AI-powered health insights
        </p>
      </div>

      {/* Input Forms */}
      <Card className="glow">
        <CardHeader>
          <CardTitle>Health Information</CardTitle>
          <CardDescription>
            Provide your health data using one of the three methods below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="symptom" className="w-full">
            <TabsList>
              <TabsTrigger value="symptom" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">Symptoms</span>
              </TabsTrigger>
              <TabsTrigger value="structured" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Structured</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="symptom">
              <SymptomForm onSubmit={handleSubmit} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="structured">
              <StructuredForm onSubmit={handleSubmit} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="report">
              <ReportForm onSubmit={handleSubmit} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-fade-in">
          <div className="h-32 rounded-xl skeleton" />
          <div className="h-48 rounded-xl skeleton" />
          <div className="h-24 rounded-xl skeleton" />
        </div>
      )}

      {/* Result Display */}
      {result && !isLoading && <PredictionResultCard result={result} />}
    </div>
  );
}
