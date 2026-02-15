"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

type Interest = "cosmic" | "street" | "mutants" | "teams" | "everything" | "horror" | "mcu";
type Depth = "quick" | "medium" | "deep";
type Format = "physical" | "digital" | "either";

interface WizardResult {
  path: string;
  name: string;
  description: string;
}

const interestOptions: { value: Interest; label: string; description: string; emoji: string }[] = [
  { value: "everything", label: "The Big Picture", description: "I want to understand the whole Marvel Universe", emoji: "MAP" },
  { value: "cosmic", label: "Cosmic / Space", description: "Galactus, Thanos, Silver Surfer, Guardians", emoji: "COSMIC" },
  { value: "street", label: "Street-Level", description: "Daredevil, Spider-Man, Punisher, Luke Cage", emoji: "STREET" },
  { value: "mutants", label: "Mutants / X-Men", description: "X-Men, Wolverine, Magneto, Krakoa", emoji: "MUTANT" },
  { value: "teams", label: "Team Books", description: "Avengers, Fantastic Four, team dynamics", emoji: "TEAM" },
  { value: "horror", label: "Horror / Dark", description: "Immortal Hulk, Moon Knight, Venom, Blade", emoji: "HORROR" },
  { value: "mcu", label: "MCU Fan", description: "I want to read what inspired the movies", emoji: "MCU" },
];

const depthOptions: { value: Depth; label: string; description: string }[] = [
  { value: "quick", label: "Quick Dive (5-10 books)", description: "I want the highlights. Get me up to speed fast." },
  { value: "medium", label: "Solid Foundation (20-30 books)", description: "I want to really understand the key stories." },
  { value: "deep", label: "Deep Dive (50+ books)", description: "I want the complete picture. I'm committed." },
];

function getRecommendations(interest: Interest, depth: Depth, format: Format): WizardResult[] {
  const results: WizardResult[] = [];

  // Primary recommendation based on interest + depth
  if (interest === "everything") {
    if (depth === "quick") {
      results.push({ path: "/path/new-reader-first-10", name: "New Reader: Your First 10 Books", description: "The perfect starter pack covering every corner of Marvel." });
      results.push({ path: "/path/best-single-runs", name: "Best Single Runs", description: "Standalone masterpieces that need no context." });
    } else if (depth === "medium") {
      results.push({ path: "/path/absolute-essentials", name: "The Absolute Essentials (29 Books)", description: "The definitive foundation. 60+ years in 29 volumes." });
    } else {
      results.push({ path: "/path/absolute-essentials", name: "The Absolute Essentials (29 Books)", description: "Start here, then branch into character paths." });
      results.push({ path: "/timeline", name: "Full Timeline", description: "Explore every era from 1961 to today." });
    }
  } else if (interest === "cosmic") {
    results.push({ path: "/path/cosmic-marvel", name: "Cosmic Marvel", description: "From the Galactus Trilogy to the multiverse." });
    if (depth !== "quick") {
      results.push({ path: "/path/infinity-saga", name: "The Infinity Saga", description: "Thanos Quest through Infinity Crusade." });
      results.push({ path: "/path/dna-cosmic-saga", name: "The DnA Cosmic Saga", description: "Annihilation through Thanos Imperative." });
    }
  } else if (interest === "street") {
    results.push({ path: "/path/street-level-marvel", name: "Street-Level Marvel", description: "The gritty, grounded side of Marvel." });
    if (depth !== "quick") {
      results.push({ path: "/path/daredevil-complete", name: "Daredevil Complete", description: "The Man Without Fear, cover to cover." });
      results.push({ path: "/path/spider-man-complete", name: "Spider-Man Complete", description: "The full Peter Parker saga." });
    }
  } else if (interest === "mutants") {
    if (depth === "quick") {
      results.push({ path: "/path/new-reader-first-10", name: "New Reader: First 10", description: "Includes key X-Men entry points." });
      results.push({ path: "/path/krakoa-complete", name: "The Krakoa Era", description: "Modern X-Men reinvention (2019-2024)." });
    } else {
      results.push({ path: "/path/x-men-complete", name: "X-Men Complete", description: "The full mutant saga from Giant-Size #1 to Krakoa." });
      if (depth === "deep") {
        results.push({ path: "/path/new-mutants-x-force", name: "New Mutants to X-Force", description: "The next generation of mutants." });
      }
    }
  } else if (interest === "teams") {
    if (depth === "quick") {
      results.push({ path: "/path/new-reader-first-10", name: "New Reader: First 10", description: "Covers FF, Avengers, and X-Men essentials." });
    } else {
      results.push({ path: "/path/ff-complete", name: "Fantastic Four Complete", description: "Marvel's First Family from the very beginning." });
      results.push({ path: "/path/avengers-complete", name: "Avengers Complete", description: "Earth's Mightiest Heroes across the decades." });
      if (depth === "deep") {
        results.push({ path: "/path/hickman-grand-saga", name: "The Hickman Saga", description: "The most ambitious single-author narrative in Marvel history." });
      }
    }
  } else if (interest === "horror") {
    results.push({ path: "/path/horror-marvel", name: "Horror Marvel", description: "Monsters, nightmares, and the dark side." });
    if (depth !== "quick") {
      results.push({ path: "/path/moon-knight-complete", name: "Moon Knight Complete", description: "The many faces of Marc Spector." });
    }
  } else if (interest === "mcu") {
    results.push({ path: "/path/mcu-source-material", name: "MCU Source Material", description: "Read what inspired the films you love." });
    if (depth !== "quick") {
      results.push({ path: "/path/absolute-essentials", name: "The Absolute Essentials", description: "Go deeper than the movies." });
    }
  }

  // Digital tip
  if (format === "digital") {
    results.push({ path: "/path/new-reader-first-10", name: "Tip: Marvel Unlimited", description: "Nearly everything is available on Marvel Unlimited for ~$10/month. Start with any path above." });
  }

  return results;
}

export default function StartWizard() {
  const [step, setStep] = useState(0);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [format, setFormat] = useState<Format | null>(null);

  const recommendations = interest && depth && format ? getRecommendations(interest, depth, format) : [];

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step >= s ? "var(--accent-red)" : "var(--bg-tertiary)",
                color: step >= s ? "#fff" : "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {s < 3 ? s + 1 : <Sparkles size={14} />}
            </div>
            {s < 3 && (
              <div
                className="w-8 sm:w-16 h-0.5 rounded"
                style={{ background: step > s ? "var(--accent-red)" : "var(--bg-tertiary)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Interest */}
      {step === 0 && (
        <div>
          <h2
            className="text-xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            What Interests You?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interestOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setInterest(opt.value); setStep(1); }}
                className="text-left rounded-lg border p-4 transition-all"
                style={{
                  background: interest === opt.value ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  borderColor: interest === opt.value ? "var(--accent-red)" : "var(--border-default)",
                }}
              >
                <span
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--accent-red)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
                >
                  {opt.emoji}
                </span>
                <span className="text-sm font-bold block">{opt.label}</span>
                <span className="text-xs block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Depth */}
      {step === 1 && (
        <div>
          <h2
            className="text-xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            How Deep Do You Want to Go?
          </h2>
          <div className="space-y-3">
            {depthOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setDepth(opt.value); setStep(2); }}
                className="w-full text-left rounded-lg border p-4 transition-all"
                style={{
                  background: depth === opt.value ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  borderColor: depth === opt.value ? "var(--accent-gold)" : "var(--border-default)",
                }}
              >
                <span className="text-sm font-bold block">{opt.label}</span>
                <span className="text-xs block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 mt-4 text-xs transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      )}

      {/* Step 2: Format */}
      {step === 2 && (
        <div>
          <h2
            className="text-xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Physical or Digital?
          </h2>
          <div className="space-y-3">
            {([
              { value: "physical" as Format, label: "Physical Books", description: "I want to hold the omnibuses and trades in my hands." },
              { value: "digital" as Format, label: "Digital", description: "Marvel Unlimited, Comixology, or library apps." },
              { value: "either" as Format, label: "Either / Both", description: "I'll use whatever gets me reading fastest." },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFormat(opt.value); setStep(3); }}
                className="w-full text-left rounded-lg border p-4 transition-all"
                style={{
                  background: format === opt.value ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  borderColor: format === opt.value ? "var(--accent-blue)" : "var(--border-default)",
                }}
              >
                <span className="text-sm font-bold block">{opt.label}</span>
                <span className="text-xs block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 mt-4 text-xs transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && recommendations.length > 0 && (
        <div>
          <h2
            className="text-xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Your Reading Plan
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Based on your answers, here&apos;s where to start:
          </p>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <Link
                key={i}
                href={rec.path}
                className="block rounded-lg border p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    {i === 0 && (
                      <span
                        className="text-xs font-bold mb-1 block"
                        style={{ color: "var(--accent-red)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
                      >
                        TOP PICK
                      </span>
                    )}
                    <span className="text-sm font-bold block">{rec.name}</span>
                    <span className="text-xs block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {rec.description}
                    </span>
                  </div>
                  <ArrowRight size={16} style={{ color: "var(--text-tertiary)" }} className="flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
          <button
            onClick={() => { setStep(0); setInterest(null); setDepth(null); setFormat(null); }}
            className="flex items-center gap-1 mt-6 text-xs transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={12} /> Start Over
          </button>
        </div>
      )}
    </div>
  );
}
