import {
  ArrowRight,
  Brain,
  ClipboardList,
  Database,
  FileText,
  Shield,
  Stethoscope,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Stethoscope,
    title: "Symptom Analysis",
    description: "Describe your symptoms in natural language and get AI-powered health insights.",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    icon: ClipboardList,
    title: "Structured Data",
    description: "Input structured health data including vitals, medical history, and more.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: FileText,
    title: "Report Analysis",
    description: "Paste medical report text for AI analysis of lab results and findings.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
];

const highlights = [
  {
    icon: Brain,
    title: "Gemini AI Powered",
    description: "Leveraging Google's latest AI for accurate health insights",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your health data is processed securely and never shared",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get comprehensive predictions in seconds",
  },
  {
    icon: Database,
    title: "Prediction History",
    description: "Review and track all your past predictions",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-4xl text-center py-16 md:py-24">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
            <Brain className="h-4 w-4" />
            AI-Powered Health Analysis
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Smart Health <span className="gradient-text">Predictions</span>
            <br />
            Powered by AI
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Get instant health insights by describing symptoms, inputting health data, or analyzing
            medical reports. Powered by Google Gemini AI.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/predict">
              <Button size="lg" className="text-base gap-2">
                Start Prediction
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" size="lg" className="text-base">
                View History
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-5xl py-12">
        <h2 className="text-2xl font-bold text-center mb-2">Three Ways to Predict</h2>
        <p className="text-muted-foreground text-center mb-10">
          Choose the input method that works best for you
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group glass-hover cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Highlights */}
      <section className="w-full max-w-5xl py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="text-center space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] mx-auto">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-medium">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
