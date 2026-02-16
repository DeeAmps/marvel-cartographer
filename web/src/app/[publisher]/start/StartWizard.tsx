"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { usePublisher } from "@/components/context/PublisherProvider";
import { getInterestOptions, type InterestOption } from "@/lib/publisher-config";

type Depth = "quick" | "medium" | "deep";
type Format = "physical" | "digital" | "either";

interface WizardResult {
  path: string;
  name: string;
  description: string;
}

const depthOptions: { value: Depth; label: string; description: string }[] = [
  { value: "quick", label: "Quick Dive (5-10 books)", description: "I want the highlights. Get me up to speed fast." },
  { value: "medium", label: "Solid Foundation (20-30 books)", description: "I want to really understand the key stories." },
  { value: "deep", label: "Deep Dive (50+ books)", description: "I want the complete picture. I'm committed." },
];

function getRecommendations(
  interest: InterestOption,
  depth: Depth,
  format: Format,
  basePath: string,
): WizardResult[] {
  const results: WizardResult[] = [];

  // Primary: use the suggested paths from the config
  const paths = interest.suggestedPaths;
  if (depth === "quick" && paths.length > 0) {
    results.push({
      path: `${basePath}/path/${paths[0]}`,
      name: interest.label,
      description: `Start with the essential ${interest.label.toLowerCase()} reading.`,
    });
  } else {
    for (const slug of paths) {
      results.push({
        path: `${basePath}/path/${slug}`,
        name: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        description: `Part of the ${interest.label} reading track.`,
      });
    }
  }

  // For "everything" interest, also suggest the timeline
  if (interest.id === "everything" && depth === "deep") {
    results.push({
      path: `${basePath}/timeline`,
      name: "Full Timeline",
      description: "Explore every era from the very beginning.",
    });
  }

  // Digital tip
  if (format === "digital") {
    results.push({
      path: `${basePath}/paths`,
      name: "Tip: Digital Subscription",
      description: "Many of these are available on digital subscription services. Browse all paths to find your starting point.",
    });
  }

  return results;
}

export default function StartWizard() {
  const { publisher, config, basePath } = usePublisher();
  const [step, setStep] = useState(0);
  const [interest, setInterest] = useState<InterestOption | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [format, setFormat] = useState<Format | null>(null);

  const interestOptions = getInterestOptions(publisher);
  const recommendations = interest && depth && format ? getRecommendations(interest, depth, format, basePath) : [];

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step >= s ? config.accentColor : "var(--bg-tertiary)",
                color: step >= s ? "#fff" : "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {s < 3 ? s + 1 : <Sparkles size={14} />}
            </div>
            {s < 3 && (
              <div
                className="w-8 sm:w-16 h-0.5 rounded"
                style={{ background: step > s ? config.accentColor : "var(--bg-tertiary)" }}
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
                key={opt.id}
                onClick={() => { setInterest(opt); setStep(1); }}
                className="text-left rounded-lg border p-4 transition-all"
                style={{
                  background: interest?.id === opt.id ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  borderColor: interest?.id === opt.id ? config.accentColor : "var(--border-default)",
                }}
              >
                <span
                  className="text-xs font-bold mb-1 block uppercase"
                  style={{ color: config.accentColor, fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
                >
                  {opt.id}
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
              { value: "digital" as Format, label: "Digital", description: "Subscription services, digital storefronts, or library apps." },
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
                        style={{ color: config.accentColor, fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
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
