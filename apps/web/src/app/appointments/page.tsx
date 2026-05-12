"use client";

import { useAuth } from "@clerk/nextjs";
import type { AppointmentListResponse } from "@disease-prediction/shared";
import { AlertCircle, Calendar, CalendarClock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppointmentSection } from "@/components/appointments/AppointmentSection";
import { getMyAppointments } from "@/lib/api";

export default function PatientAppointmentsPage() {
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState<AppointmentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await getMyAppointments(token);
        if (cancelled) return;
        if (!res.success || !res.data) throw new Error(res.error || "Could not load appointments");
        setData(res.data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load appointments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-2">
        <h1 className="text-2xl font-bold">Sign in to see your appointments</h1>
        <Link href="/sign-in" className="inline-block mt-4 text-primary underline text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          My <span className="gradient-text">Appointments</span>
        </h1>
        <p className="text-muted-foreground">
          The doctors you've booked, split into upcoming and past.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <>
          <AppointmentSection
            title="Upcoming"
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
            appointments={data?.upcoming ?? []}
            emptyMessage="No upcoming appointments. Browse the directory to book one."
            audience="patient"
          />
          <AppointmentSection
            title="Past"
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
            appointments={data?.past ?? []}
            emptyMessage="No past appointments yet."
            audience="patient"
          />
        </>
      )}
    </div>
  );
}
