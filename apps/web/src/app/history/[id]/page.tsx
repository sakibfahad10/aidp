"use client";

import { useAuth } from "@clerk/nextjs";
import type { AIPredictionResponse, Prediction } from "@disease-prediction/shared";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PredictionResultCard } from "@/components/prediction/result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPredictionById } from "@/lib/api";

const inputTypeLabels = {
  symptom: "Symptom",
  structured: "Structured",
  report: "Report",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PredictionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPrediction() {
      try {
        const token = await getToken();
        const response = await getPredictionById(id, token);
        if (cancelled) return;
        if (response.success && response.data) {
          setPrediction(response.data);
        } else {
          setError(response.error || "Prediction not found");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load prediction");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPrediction();
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to history
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This prediction may not exist or may not belong to your account.
            </p>
            <Link href="/history">
              <Button variant="outline" size="sm" className="mt-3">
                Back to history
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && prediction && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {inputTypeLabels[prediction.inputType as keyof typeof inputTypeLabels] || "Unknown"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(prediction.createdAt)}
            </span>
          </div>

          <PredictionResultCard result={prediction.result as AIPredictionResponse} />
        </>
      )}
    </div>
  );
}
