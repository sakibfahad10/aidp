"use client";

import { useAuth } from "@clerk/nextjs";
import type { PublicDoctorProfile } from "@disease-prediction/shared";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  GraduationCap,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Stethoscope,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookAppointment, getPublicDoctorProfile } from "@/lib/api";

export default function PublicDoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isSignedIn, getToken } = useAuth();

  const [profile, setProfile] = useState<PublicDoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form state lives on the page so the user can pick a slot, type a
  // note, see the slot stay selected across re-renders, and surface the API's
  // 409 inline rather than via a global toast.
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleBook() {
    if (!selectedSlotId) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const token = await getToken();
      const res = await bookAppointment(
        { slotId: selectedSlotId, note: note.trim() || undefined },
        token,
      );
      if (!res.success || !res.data) {
        throw new Error(res.error || "Could not book this slot");
      }
      setBookedSlotId(selectedSlotId);
      // Strip the booked slot from the local view so the user can't try to
      // re-book it (the next directory fetch will agree).
      setProfile((p) =>
        p ? { ...p, openSlots: p.openSlots.filter((s) => s.id !== selectedSlotId) } : p,
      );
      setSelectedSlotId(null);
      setNote("");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not book this slot");
    } finally {
      setSubmitting(false);
    }
  }

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book an appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookedSlotId ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CalendarCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-600">Appointment booked.</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track it on your{" "}
                  <Link href="/appointments" className="underline">
                    appointments page
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {profile.openSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open slots right now. Check back soon.
            </p>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Pick an available slot
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profile.openSlots.map((slot) => {
                    const selected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                        }`}
                      >
                        <span>{formatSlot(slot.startTime)}</span>
                        {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="note" className="text-xs text-muted-foreground">
                  Reason for visit (optional)
                </Label>
                <Textarea
                  id="note"
                  placeholder="Anything the doctor should know in advance"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {bookingError ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{bookingError}</p>
                </div>
              ) : null}

              {isSignedIn ? (
                <Button
                  onClick={handleBook}
                  disabled={!selectedSlotId || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking…
                    </>
                  ) : (
                    "Book selected slot"
                  )}
                </Button>
              ) : (
                <Link href="/sign-in" className="block">
                  <Button variant="outline" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in to book
                  </Button>
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
