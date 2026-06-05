import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { RoleGuard } from "@/components/layout/role-guard";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedPredict AI — AI-Powered Disease Prediction",
  description:
    "Get AI-powered health insights by describing symptoms, submitting structured health data, or analyzing medical reports. Powered by Google Gemini.",
  keywords: ["disease prediction", "AI health", "symptom checker", "medical AI"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <ClerkProvider
          appearance={{ theme: dark }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          signInForceRedirectUrl="/post-signin"
          signUpForceRedirectUrl="/post-signin"
        >
          <UserProvider>
            <Navbar />
            <main className="container py-8">
              <RoleGuard>{children}</RoleGuard>
            </main>
          </UserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
