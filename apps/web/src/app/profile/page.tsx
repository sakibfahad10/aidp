"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  HealthProfile,
  HealthProfileField,
  UpdateHealthProfileRequest,
} from "@disease-prediction/shared";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHealthProfile, updateHealthProfile } from "@/lib/api";

interface FormState {
  age: string;
  gender: string;
  bloodType: string;
  conditions: string;
  medications: string;
  allergies: string;
}

const EMPTY_FORM: FormState = {
  age: "",
  gender: "",
  bloodType: "",
  conditions: "",
  medications: "",
  allergies: "",
};

function toFormState(profile: HealthProfile): FormState {
  return {
    age: profile.age === null ? "" : String(profile.age),
    gender: profile.gender ?? "",
    bloodType: profile.bloodType ?? "",
    conditions: profile.conditions.join(", "),
    medications: profile.medications.join(", "),
    allergies: profile.allergies.join(", "),
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildUpdate(
  form: FormState,
  touched: Set<HealthProfileField>,
): UpdateHealthProfileRequest {
  const update: UpdateHealthProfileRequest = {};
  if (touched.has("age")) {
    const trimmed = form.age.trim();
    update.age = trimmed === "" ? null : Number(trimmed);
  }
  if (touched.has("gender")) update.gender = form.gender.trim() || null;
  if (touched.has("bloodType")) update.bloodType = form.bloodType.trim() || null;
  if (touched.has("conditions")) update.conditions = splitList(form.conditions);
  if (touched.has("medications")) update.medications = splitList(form.medications);
  if (touched.has("allergies")) update.allergies = splitList(form.allergies);
  return update;
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Set<HealthProfileField>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const response = await getHealthProfile(token);
        if (cancelled) return;
        if (response.success && response.data) {
          setProfile(response.data);
          setForm(toFormState(response.data));
        } else {
          setError(response.error || "Failed to load profile");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  const markTouched = (field: HealthProfileField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (touched.size === 0) return;
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      const response = await updateHealthProfile(buildUpdate(form, touched), token);
      if (response.success && response.data) {
        setProfile(response.data);
        setForm(toFormState(response.data));
        setTouched(new Set());
        setSavedAt(Date.now());
      } else {
        setError(response.error || "Failed to save profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Please sign in to view your health profile.</p>
      </div>
    );
  }

  const editedSet = new Set<HealthProfileField>(profile?.editedFields ?? []);
  const fieldIsEdited = (field: HealthProfileField) => editedSet.has(field) || touched.has(field);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Your Health Profile</h1>
        <p className="text-muted-foreground text-sm">
          Standing facts that auto-fill from your structured predictions and follow you into the
          doctor briefing. Manually edited fields are never overwritten by a later prediction.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Standing facts</CardTitle>
            <CardDescription>
              Add the details that don't change much. The{" "}
              <span className="font-medium">Edited</span> badge marks a field that future auto-fills
              will leave alone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FieldLabel htmlFor="age" edited={fieldIsEdited("age")} label="Age" />
              <div />
              <Input
                id="age"
                type="number"
                min={0}
                max={150}
                placeholder="e.g., 30"
                value={form.age}
                onChange={(e) => markTouched("age", e.target.value)}
              />
              <div />

              <FieldLabel htmlFor="gender" edited={fieldIsEdited("gender")} label="Gender" />
              <FieldLabel
                htmlFor="bloodType"
                edited={fieldIsEdited("bloodType")}
                label="Blood type"
              />
              <Input
                id="gender"
                placeholder="e.g., female"
                value={form.gender}
                onChange={(e) => markTouched("gender", e.target.value)}
              />
              <Input
                id="bloodType"
                placeholder="e.g., O+"
                value={form.bloodType}
                onChange={(e) => markTouched("bloodType", e.target.value)}
              />
            </div>

            <ListField
              id="conditions"
              label="Chronic conditions"
              edited={fieldIsEdited("conditions")}
              value={form.conditions}
              onChange={(value) => markTouched("conditions", value)}
            />
            <ListField
              id="medications"
              label="Current medications"
              edited={fieldIsEdited("medications")}
              value={form.medications}
              onChange={(value) => markTouched("medications", value)}
            />
            <ListField
              id="allergies"
              label="Allergies"
              edited={fieldIsEdited("allergies")}
              value={form.allergies}
              onChange={(value) => markTouched("allergies", value)}
            />

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {savedAt !== null && touched.size === 0 && !saving && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-500">Profile saved.</p>
              </div>
            )}

            <Button type="submit" disabled={saving || touched.size === 0} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  edited,
}: {
  htmlFor: string;
  label: string;
  edited: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {edited && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-[10px] uppercase tracking-wide px-2 py-0.5">
          <Pencil className="h-2.5 w-2.5" />
          Edited
        </span>
      )}
    </div>
  );
}

function ListField({
  id,
  label,
  edited,
  value,
  onChange,
}: {
  id: string;
  label: string;
  edited: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} edited={edited} />
      <Input
        id={id}
        placeholder="Comma-separated, e.g., asthma, hypertension"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
