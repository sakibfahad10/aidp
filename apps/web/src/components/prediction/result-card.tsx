import {
  type AIPredictionResponse,
  type DoctorSuggestion,
  RiskLevel,
} from "@disease-prediction/shared";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Shield,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDoctorSuggestions } from "@/lib/api";

interface PredictionResultCardProps {
  result: AIPredictionResponse;
}

const riskIcons = {
  [RiskLevel.LOW]: CheckCircle2,
  [RiskLevel.MODERATE]: Shield,
  [RiskLevel.HIGH]: AlertTriangle,
  [RiskLevel.CRITICAL]: FileWarning,
};

const riskBadgeVariant = {
  [RiskLevel.LOW]: "low" as const,
  [RiskLevel.MODERATE]: "moderate" as const,
  [RiskLevel.HIGH]: "high" as const,
  [RiskLevel.CRITICAL]: "critical" as const,
};

export function PredictionResultCard({ result }: PredictionResultCardProps) {
  const RiskIcon = riskIcons[result.riskLevel] || Shield;
  const suggestions = useDoctorSuggestions(result.recommendedSpecialties ?? []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Risk Level Banner */}
      <Card className="glow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <RiskIcon className="h-5 w-5" />
              Prediction Result
            </CardTitle>
            <Badge variant={riskBadgeVariant[result.riskLevel]}>{result.riskLevel} risk</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Possible Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Possible Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.possibleConditions.map((condition, index) => (
              <div
                key={condition.name}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-200"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {condition.probability}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{condition.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{condition.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {result.redFlags.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Red Flags to Watch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.redFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Doctors */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Suggested Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestions.map((doc) => {
                // Each suggestion deep-links into the directory pre-filtered by
                // the first matched specialty — the matcher guarantees this
                // array is non-empty.
                const primarySpecialty = doc.matchedSpecialties[0];
                if (!primarySpecialty) return null;
                const deepLink = `/doctors?specialty=${encodeURIComponent(primarySpecialty)}`;
                return (
                  <li
                    key={doc.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-200"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.name ?? "Verified doctor"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.matchedSpecialties.join(", ")}
                        {doc.affiliation ? ` · ${doc.affiliation}` : ""}
                        {doc.city ? ` · ${doc.city}` : ""}
                        {doc.feeBdt !== null ? ` · ৳${doc.feeBdt}` : ""}
                      </p>
                    </div>
                    <Link
                      href={deepLink}
                      className="text-xs font-medium text-primary hover:underline flex-shrink-0"
                    >
                      View {primarySpecialty} →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-amber-400/80 text-center">
          ⚠️ This is an AI-generated analysis for informational purposes only. Always consult a
          qualified healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}

function useDoctorSuggestions(
  recommendedSpecialties: AIPredictionResponse["recommendedSpecialties"],
): DoctorSuggestion[] {
  const [suggestions, setSuggestions] = useState<DoctorSuggestion[]>([]);
  // Stable key for the dependency array — the array identity changes every
  // render even when the contents are the same.
  const key = recommendedSpecialties.join("|");
  useEffect(() => {
    let cancelled = false;
    const specialties = key
      ? (key.split("|") as AIPredictionResponse["recommendedSpecialties"])
      : [];
    getDoctorSuggestions(specialties)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setSuggestions(res.data);
      })
      .catch(() => {
        // The suggestion section is purely additive — a failure should never
        // block the user from seeing their prediction. Silently hide.
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return suggestions;
}
