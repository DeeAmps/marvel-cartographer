import type { Metadata } from "next";
import StartWizard from "./StartWizard";

export const metadata: Metadata = {
  title: "Where Do I Start?",
  description:
    "Not sure where to begin reading Marvel Comics? Answer three quick questions and we'll build your perfect reading path.",
};

export default function StartPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Where Do I Start?
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Three questions. That&apos;s all it takes to find your perfect entry point into the Marvel Universe.
      </p>
      <StartWizard />
    </div>
  );
}
