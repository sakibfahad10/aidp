"use client";

import type { PublicDoctorProfile } from "@disease-prediction/shared";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Stethoscope,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicDoctorProfile } from "@/lib/api";

export default function PublicDoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [profile, setProfile] = useState<PublicDoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await getPublicDoctorProfile(id);
        if (cancelled) return;
        if (!response.success || !response.data) {
          throw new Error(response.error || "Doctor not found");
        }
        setProfile(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Doctor not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error ?? "Doctor not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/doctors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to directory
      </Link>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary flex-shrink-0">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-2">
              <CardTitle className="text-2xl">{profile.name ?? "Verified doctor"}</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {profile.specialties.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <DetailRow
            icon={<GraduationCap className="h-4 w-4" />}
            label="Qualifications"
            value={profile.qualifications}
          />
          <DetailRow
            icon={<Briefcase className="h-4 w-4" />}
            label="Experience"
            value={profile.experienceYears != null ? `${profile.experienceYears} years` : null}
          />
          <DetailRow
            icon={<Building2 className="h-4 w-4" />}
            label="Affiliation"
            value={profile.affiliation}
          />
          <DetailRow icon={<MapPin className="h-4 w-4" />} label="City" value={profile.city} />
          <DetailRow
            icon={<Wallet className="h-4 w-4" />}
            label="Consultation fee"
            value={profile.feeBdt != null ? `৳${profile.feeBdt}` : null}
          />
          <DetailRow
            icon={<Mail className="h-4 w-4" />}
            label="Public contact"
            value={profile.publicEmail}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Availability and booking will be available soon.
      </p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value || "—"}</div>
      </div>
    </div>
  );
}
