"use client";

import type { Appointment } from "@disease-prediction/shared";
import { Inbox, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shared upcoming/past list section used by both the patient (`/appointments`)
 * and doctor (`/doctor/appointments`) views. The two views differ only in
 * which name to surface as the heading — passed in as `audience`.
 */
export function AppointmentSection({
  title,
  icon,
  appointments,
  emptyMessage,
  audience,
}: {
  title: string;
  icon: React.ReactNode;
  appointments: Appointment[];
  emptyMessage: string;
  audience: "patient" | "doctor";
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge className="ml-1">{appointments.length}</Badge>
      </div>
      {appointments.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-white/[0.02] text-sm text-muted-foreground">
          <Inbox className="h-4 w-4" />
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} audience={audience} />
          ))}
        </div>
      )}
    </section>
  );
}

function AppointmentCard({
  appointment,
  audience,
}: {
  appointment: Appointment;
  audience: "patient" | "doctor";
}) {
  const heading =
    audience === "patient"
      ? (appointment.doctorName ?? "Doctor")
      : (appointment.patientName ?? "Patient");
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            {heading}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatSlot(appointment.slotStartTime)}
          </span>
        </div>
      </CardHeader>
      {appointment.note ? (
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground mb-0.5">Note</div>
          <p className="text-sm">{appointment.note}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
