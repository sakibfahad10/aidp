"use client";

import { useAuth } from "@clerk/nextjs";
import type { PatientBriefing, RiskLevel } from "@disease-prediction/shared";
import {
  Activity,
  AlertCircle,
  FileText,
  HeartPulse,
  Loader2,
  Pill,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getAppointmentBriefing } from "@/lib/api";

/**
 * Patient-context briefing — the doctor-dashboard centerpiece. Fetched
 * lazily per appointment on the doctor's dashboard. Renders the
 * templated narrative summary, the patient's standing health facts, the
 * five most recent predictions, and the appointment note. Computed
 * fresh on every render so the briefing always reflects the patient's
 * latest profile.
 *
 * Failure is silent — the briefing is purely additive and must never
 * block the appointment list from rendering.
 */
export function BriefingCard({ appointmentId }: { appointmentId: string }) {
  const { getToken } = useAuth();
  const [briefing, setBriefing] = useState<PatientBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await getAppointmentBriefing(appointmentId, token);
        if (cancelled) return;
        if (!res.success || !res.data) throw new Error(res.error || "Could not load briefing");
        setBriefing(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load briefing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, getToken]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading patient briefing…
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Briefing unavailable.
      </div>
    );
  }

  const { profile, recentPredictions, summary, note } = briefing;

  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Stethoscope className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            Patient briefing
          </div>
          <p className="text-sm leading-relaxed">{summary}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BriefingSection icon={<HeartPulse className="h-3.5 w-3.5" />} title="Standing facts">
          <ProfileFacts profile={profile} />
        </BriefingSection>

        <BriefingSection icon={<Activity className="h-3.5 w-3.5" />} title="Recent predictions">
          {recentPredictions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No predictions on file.</p>
          ) : (
            <ul className="space-y-1.5">
              {recentPredictions.map((p) => (
                <li key={p.id} className="flex items-start gap-2 text-xs">
                  <Badge variant={p.riskLevel as RiskLevel}>{p.riskLevel}</Badge>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {p.inputType}
                    </div>
                    <div className="truncate">{p.summary}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BriefingSection>
      </div>

      <BriefingSection icon={<FileText className="h-3.5 w-3.5" />} title="Reason for visit">
        {note ? (
          <p className="text-xs">{note}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No note supplied.</p>
        )}
      </BriefingSection>
    </div>
  );
}

function BriefingSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ProfileFacts({ profile }: { profile: PatientBriefing["profile"] }) {
  const identityBits: string[] = [];
  if (profile.age !== null) identityBits.push(`${profile.age} years old`);
  if (profile.gender) identityBits.push(profile.gender);
  if (profile.bloodType) identityBits.push(`Blood ${profile.bloodType}`);

  const hasAnything =
    identityBits.length > 0 ||
    profile.conditions.length > 0 ||
    profile.medications.length > 0 ||
    profile.allergies.length > 0;

  if (!hasAnything) {
    return <p className="text-xs text-muted-foreground">No standing health facts on file.</p>;
  }

  return (
    <div className="space-y-1.5 text-xs">
      {identityBits.length > 0 ? <p>{identityBits.join(" · ")}</p> : null}
      {profile.conditions.length > 0 ? (
        <FactRow label="Conditions" items={profile.conditions} />
      ) : null}
      {profile.medications.length > 0 ? (
        <FactRow
          label="Medications"
          items={profile.medications}
          icon={<Pill className="h-3 w-3" />}
        />
      ) : null}
      {profile.allergies.length > 0 ? (
        <FactRow label="Allergies" items={profile.allergies} />
      ) : null}
    </div>
  );
}

function FactRow({
  label,
  items,
  icon,
}: {
  label: string;
  items: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-muted-foreground flex items-center gap-1">
        {icon}
        {label}:
      </span>
      <span>{items.join(", ")}</span>
    </div>
  );
}
