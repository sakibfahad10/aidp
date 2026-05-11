"use client";

import {
  City,
  type DirectoryDoctor,
  type DirectoryQuery,
  Specialty,
} from "@disease-prediction/shared";
import { AlertCircle, Inbox, Loader2, Search, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listDoctors } from "@/lib/api";

type FilterState = {
  specialty: Specialty | "";
  city: City | "";
  affiliation: string;
};

const EMPTY: FilterState = { specialty: "", city: "", affiliation: "" };

function buildQuery(state: FilterState): DirectoryQuery {
  const q: DirectoryQuery = {};
  if (state.specialty) q.specialty = state.specialty;
  if (state.city) q.city = state.city;
  const affil = state.affiliation.trim();
  if (affil) q.affiliation = affil;
  return q;
}

export default function DoctorsDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DirectoryView />
    </Suspense>
  );
}

function DirectoryView() {
  const params = useSearchParams();
  const initial = useMemo<FilterState>(() => {
    const specialty = params.get("specialty");
    const city = params.get("city");
    const affiliation = params.get("affiliation") ?? "";
    const validSpecialty = (Object.values(Specialty) as string[]).includes(specialty ?? "")
      ? (specialty as Specialty)
      : "";
    const validCity = (Object.values(City) as string[]).includes(city ?? "") ? (city as City) : "";
    return { specialty: validSpecialty, city: validCity, affiliation };
  }, [params]);

  const [filters, setFilters] = useState<FilterState>(initial);
  const [results, setResults] = useState<DirectoryDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listDoctors(buildQuery(filters));
        if (cancelled) return;
        if (!response.success) {
          throw new Error(response.error || "Failed to load doctors");
        }
        setResults(response.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load doctors");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  const reset = () => setFilters(EMPTY);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          Find a <span className="gradient-text">verified doctor</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse our directory of verified doctors, filter by specialty, city, and affiliation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-specialty">Specialty</Label>
              <select
                id="filter-specialty"
                className="flex h-10 w-full rounded-lg border border-input bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.specialty}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, specialty: e.target.value as Specialty | "" }))
                }
              >
                <option value="" className="bg-background">
                  Any specialty
                </option>
                {Object.values(Specialty).map((s) => (
                  <option key={s} value={s} className="bg-background">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-city">City</Label>
              <select
                id="filter-city"
                className="flex h-10 w-full rounded-lg border border-input bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value as City | "" }))}
              >
                <option value="" className="bg-background">
                  Any city
                </option>
                {Object.values(City).map((c) => (
                  <option key={c} value={c} className="bg-background">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-affiliation">Affiliation</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-affiliation"
                  placeholder="e.g. Square"
                  className="pl-9"
                  value={filters.affiliation}
                  onChange={(e) => setFilters((f) => ({ ...f, affiliation: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {loading
                ? "Loading…"
                : `${results.length} verified doctor${results.length === 1 ? "" : "s"}`}
              {" · ordered by fee ascending"}
            </span>
            <button
              type="button"
              onClick={reset}
              className="underline-offset-2 hover:underline disabled:opacity-50"
              disabled={!filters.specialty && !filters.city && !filters.affiliation}
            >
              Reset filters
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No verified doctors match these filters. Try widening your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {results.map((d) => (
            <Link key={d.id} href={`/doctors/${d.id}`} className="block">
              <Card className="transition-colors hover:bg-white/[0.03]">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary flex-shrink-0">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold truncate">
                          {d.name ?? "Verified doctor"}
                        </h3>
                        <div className="text-sm text-foreground font-medium whitespace-nowrap">
                          {d.feeBdt != null ? `৳${d.feeBdt}` : "—"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.specialties.map((s) => (
                          <Badge key={s} className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {d.affiliation && <span>{d.affiliation}</span>}
                        {d.city && <span>· {d.city}</span>}
                        {d.experienceYears != null && (
                          <span>· {d.experienceYears}+ yrs experience</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
