"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  AIPredictionResponse,
  Prediction,
  PaginatedResponse,
} from "@disease-prediction/shared";
import { getPredictions } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  AlertCircle,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";

const riskBadgeVariant = {
  low: "low" as const,
  moderate: "moderate" as const,
  high: "high" as const,
  critical: "critical" as const,
};

const inputTypeLabels = {
  symptom: "Symptom",
  structured: "Structured",
  report: "Report",
};

export default function HistoryPage() {
  const { getToken } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const token = await getToken();
        const response = await getPredictions(1, 50, token);
        if (response.success && response.data) {
          const data = response.data as PaginatedResponse<Prediction>;
          setPredictions(data.items as Prediction[]);
          setTotal(data.total);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load predictions"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchPredictions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Prediction <span className="gradient-text">History</span>
        </h1>
        <p className="text-muted-foreground">
          Review your past AI health predictions
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure the API server is running and accessible.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && predictions.length === 0 && (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No predictions yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Start by making your first health prediction using our AI-powered
              analysis tool.
            </p>
            <Link href="/predict">
              <Button>Make Your First Prediction</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Predictions List */}
      {!isLoading && predictions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <History className="inline h-4 w-4 mr-1" />
              {total} total prediction{total !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-3">
            {predictions.map((prediction, index) => {
              const result = prediction.result as AIPredictionResponse;
              const riskLevel = result?.riskLevel || (prediction as any).riskLevel || "low";

              return (
                <Card
                  key={prediction.id}
                  className="glass-hover cursor-pointer group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Risk Badge */}
                    <Badge
                      variant={riskBadgeVariant[riskLevel as keyof typeof riskBadgeVariant] || "default"}
                      className="flex-shrink-0"
                    >
                      {riskLevel}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-primary font-medium uppercase tracking-wider">
                          {inputTypeLabels[(prediction as any).inputType as keyof typeof inputTypeLabels] || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(prediction.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {result?.summary || (prediction as any).summary || "Prediction result"}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
