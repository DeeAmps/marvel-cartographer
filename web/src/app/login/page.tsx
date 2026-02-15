"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setSubmitting(false);
      } else {
        router.push("/collection");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
        setSubmitting(false);
      } else {
        setSignUpSuccess(true);
        setSubmitting(false);
      }
    }
  }

  if (signUpSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="w-full max-w-md p-8 rounded-xl"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
        >
          <div className="text-center space-y-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "var(--status-in-print)", color: "#000" }}
            >
              <UserPlus size={24} />
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              Check your email
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              We sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
              Click the link to activate your account, then sign in.
            </p>
            <button
              onClick={() => {
                setSignUpSuccess(false);
                setMode("signin");
                setPassword("");
              }}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="w-full max-w-md p-8 rounded-xl"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <h1
          className="text-2xl font-bold text-center mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {mode === "signin"
            ? "Sign in to sync your collection across devices."
            : "Create an account to save your collection."}
        </p>

        {/* Mode toggle */}
        <div
          className="flex rounded-lg p-1 mb-6"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: mode === "signin" ? "var(--bg-secondary)" : "transparent",
              color: mode === "signin" ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            <LogIn size={16} />
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: mode === "signup" ? "var(--bg-secondary)" : "transparent",
              color: mode === "signup" ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            <UserPlus size={16} />
            Sign Up
          </button>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg mb-4 text-sm"
            style={{ background: "rgba(233, 69, 96, 0.1)", color: "var(--accent-red)" }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reed@baxter-building.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-red)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-red)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === "signin" ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {submitting
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
