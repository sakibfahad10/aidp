"use client";

import { useAuth } from "@clerk/nextjs";
import {
  City,
  type DoctorOnboardingDraft,
  type DoctorOnboardingSubmit,
  type DoctorProfileResponse,
  DoctorStatus,
  doctorOnboardingSubmitSchema,
  isValidBmdcNumber,
  normalizeBmdcNumber,
  Specialty,
} from "@disease-prediction/shared";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDoctorProfile, saveDoctorDraft, submitDoctorOnboarding } from "@/lib/api";

type WizardState = {
  phone: string;
  publicEmail: string;
  bmdcNumber: string;
  qualifications: string;
  specialties: Specialty[];
  affiliation: string;
  city: City | "";
  experienceYears: string;
  feeBdt: string;
};

const EMPTY: WizardState = {
  phone: "",
  publicEmail: "",
  bmdcNumber: "",
  qualifications: "",
  specialties: [],
  affiliation: "",
  city: "",
  experienceYears: "",
  feeBdt: "",
};

const STEPS = [
  { title: "Contact", description: "How patients reach you" },
  { title: "Credentials", description: "BMDC number and qualifications" },
  { title: "Practice", description: "Specialties, affiliation, and city" },
  { title: "Experience & fee", description: "Years of practice and visit fee" },
  { title: "Review & submit", description: "Confirm and go live" },
] as const;

function profileToState(profile: DoctorProfileResponse): WizardState {
  return {
    phone: profile.phone ?? "",
    publicEmail: profile.publicEmail ?? "",
    bmdcNumber: profile.bmdcNumber ?? "",
    qualifications: profile.qualifications ?? "",
    specialties: profile.specialties,
    affiliation: profile.affiliation ?? "",
    city: profile.city ?? "",
    experienceYears: profile.experienceYears?.toString() ?? "",
    feeBdt: profile.feeBdt?.toString() ?? "",
  };
}

function stateToDraft(state: WizardState): DoctorOnboardingDraft {
  const draft: DoctorOnboardingDraft = {};
  if (state.phone) draft.phone = state.phone;
  if (state.publicEmail) draft.publicEmail = state.publicEmail;
  if (state.bmdcNumber) draft.bmdcNumber = state.bmdcNumber;
  if (state.qualifications) draft.qualifications = state.qualifications;
  if (state.specialties.length > 0) draft.specialties = state.specialties;
  if (state.affiliation) draft.affiliation = state.affiliation;
  if (state.city) draft.city = state.city as City;
  if (state.experienceYears !== "") {
    const n = Number(state.experienceYears);
    if (Number.isFinite(n)) draft.experienceYears = Math.trunc(n);
  }
  if (state.feeBdt !== "") {
    const n = Number(state.feeBdt);
    if (Number.isFinite(n)) draft.feeBdt = Math.trunc(n);
  }
  return draft;
}

function stateToSubmit(state: WizardState): DoctorOnboardingSubmit | null {
  const parsed = doctorOnboardingSubmitSchema.safeParse({
    phone: state.phone,
    publicEmail: state.publicEmail,
    bmdcNumber: state.bmdcNumber,
    qualifications: state.qualifications,
    specialties: state.specialties,
    affiliation: state.affiliation,
    city: state.city,
    experienceYears: state.experienceYears === "" ? undefined : Number(state.experienceYears),
    feeBdt: state.feeBdt === "" ? undefined : Number(state.feeBdt),
  });
  return parsed.success ? parsed.data : null;
}

function stepIsValid(state: WizardState, step: number): boolean {
  switch (step) {
    case 0:
      return state.phone.trim().length >= 7 && /.+@.+\..+/.test(state.publicEmail.trim());
    case 1:
      return isValidBmdcNumber(state.bmdcNumber) && state.qualifications.trim().length >= 2;
    case 2:
      return (
        state.specialties.length > 0 && state.affiliation.trim().length >= 2 && state.city !== ""
      );
    case 3: {
      const yrs = Number(state.experienceYears);
      const fee = Number(state.feeBdt);
      return (
        state.experienceYears !== "" &&
        Number.isInteger(yrs) &&
        yrs >= 0 &&
        state.feeBdt !== "" &&
        Number.isInteger(fee) &&
        fee >= 0
      );
    }
    default:
      return true;
  }
}

export default function DoctorOnboardingPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<WizardState>(EMPTY);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const response = await getDoctorProfile(token);
        if (cancelled) return;
        const profile = response.data ?? null;
        if (profile) {
          // Already verified → out of the wizard.
          if (profile.status === DoctorStatus.VERIFIED) {
            router.replace("/predict");
            return;
          }
          setState(profileToState(profile));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load draft");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  const update = (patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setSavedAt(null);
  };

  const persistDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await saveDoctorDraft(stateToDraft(state), token);
      if (!response.success) {
        throw new Error(response.error || "Failed to save draft");
      }
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (!stepIsValid(state, step)) return;
    await persistDraft();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const payload = stateToSubmit(state);
    if (!payload) {
      setError("Some fields are missing or invalid. Please review your answers.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await submitDoctorOnboarding(payload, token);
      if (!response.success) {
        throw new Error(response.error || "Failed to submit");
      }
      router.replace("/predict");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = STEPS[step];

  const canAdvance = useMemo(() => stepIsValid(state, step), [state, step]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          Doctor <span className="gradient-text">onboarding</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length} · {currentStep?.title}
        </p>
      </div>

      <Progress step={step} total={STEPS.length} />

      <Card>
        <CardHeader>
          <CardTitle>{currentStep?.title}</CardTitle>
          <CardDescription>{currentStep?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && <ContactStep state={state} update={update} />}
          {step === 1 && <CredentialsStep state={state} update={update} />}
          {step === 2 && <PracticeStep state={state} update={update} />}
          {step === 3 && <ExperienceStep state={state} update={update} />}
          {step === 4 && <ReviewStep state={state} />}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={back}
          disabled={step === 0 || saving || submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="text-xs text-muted-foreground">
          {saving ? "Saving…" : savedAt ? "Draft saved" : "Draft unsaved"}
        </div>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={!canAdvance || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" />
            )}
            Save & continue
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Submit & verify
          </Button>
        )}
      </div>
    </div>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ContactStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          placeholder="+8801712345678"
          value={state.phone}
          onChange={(e) => update({ phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="publicEmail">Public email</Label>
        <Input
          id="publicEmail"
          type="email"
          placeholder="dr.public@example.com"
          value={state.publicEmail}
          onChange={(e) => update({ publicEmail: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Patients will see this email — distinct from your login.
        </p>
      </div>
    </div>
  );
}

function CredentialsStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  const bmdcInvalid = state.bmdcNumber.length > 0 && !isValidBmdcNumber(state.bmdcNumber);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bmdcNumber">BMDC registration number</Label>
        <Input
          id="bmdcNumber"
          placeholder="e.g. A-12345"
          value={state.bmdcNumber}
          onChange={(e) => update({ bmdcNumber: normalizeBmdcNumber(e.target.value) })}
        />
        {bmdcInvalid && (
          <p className="text-xs text-destructive">
            Must be 3–7 digits, optionally prefixed by A or B.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea
          id="qualifications"
          placeholder="e.g. MBBS (Dhaka Medical College), FCPS (Cardiology)"
          value={state.qualifications}
          onChange={(e) => update({ qualifications: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}

function PracticeStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  const toggleSpecialty = (s: Specialty) => {
    const has = state.specialties.includes(s);
    update({
      specialties: has ? state.specialties.filter((x) => x !== s) : [...state.specialties, s],
    });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Specialties (pick one or more)</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(Specialty).map((s) => {
            const active = state.specialties.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  active
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06]"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="affiliation">Hospital affiliation</Label>
        <Input
          id="affiliation"
          placeholder="e.g. Square Hospital"
          value={state.affiliation}
          onChange={(e) => update({ affiliation: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <select
          id="city"
          className="flex h-10 w-full rounded-lg border border-input bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={state.city}
          onChange={(e) => update({ city: e.target.value as City | "" })}
        >
          <option value="" className="bg-background">
            Select city
          </option>
          {Object.values(City).map((c) => (
            <option key={c} value={c} className="bg-background">
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ExperienceStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="experienceYears">Years of experience</Label>
        <Input
          id="experienceYears"
          type="number"
          min={0}
          step={1}
          placeholder="e.g. 10"
          value={state.experienceYears}
          onChange={(e) => update({ experienceYears: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feeBdt">Per-visit fee (BDT)</Label>
        <Input
          id="feeBdt"
          type="number"
          min={0}
          step={1}
          placeholder="e.g. 1500"
          value={state.feeBdt}
          onChange={(e) => update({ feeBdt: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Flat per-visit fee in whole taka.</p>
      </div>
    </div>
  );
}

function ReviewStep({ state }: { state: WizardState }) {
  const rows: Array<[string, string]> = [
    ["Phone", state.phone],
    ["Public email", state.publicEmail],
    ["BMDC", state.bmdcNumber],
    ["Qualifications", state.qualifications],
    ["Specialties", state.specialties.join(", ")],
    ["Affiliation", state.affiliation],
    ["City", state.city],
    ["Experience (years)", state.experienceYears],
    ["Fee (BDT)", state.feeBdt],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Submitting verifies your profile and makes you visible in the doctor directory.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-foreground break-words">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
