"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "~/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#22C55E", "#22C55E"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.refreshSession();  // ensure cookie is written
      window.location.href = "/auth/redirect";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans" style={{ background: "#0A0F1E" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

        .font-display { font-family: 'Sora', sans-serif; }
        .font-body    { font-family: 'Inter', sans-serif; }

        :root {
          --navy-base:    #0A0F1E;
          --navy-surface: #141C36;
          --navy-card:    #1E2B55;
          --navy-border:  rgba(136,153,187,0.12);
          --gold:         #22C55E;
          --gold-glow:    rgba(34,197,94,0.18);
          --text-primary: #F5F5F0;
          --text-secondary: rgba(136,153,187,0.70);
          --text-muted:   rgba(136,153,187,0.40);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineDraw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .anim-fade-up   { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }
        .anim-fade-up-2 { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) 0.1s both; }
        .anim-fade-up-3 { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) 0.2s both; }

        .shimmer-gold { color: var(--gold); }

        .dot-grid {
          background-image: radial-gradient(circle at 1.5px 1.5px, #F5F5F0 1.5px, transparent 0);
          background-size: 36px 36px;
        }

        .section-rule {
          width: 40px; height: 2px;
          background: var(--gold);
          border-radius: 2px;
          transform-origin: left;
          animation: lineDraw 0.6s ease 0.2s both;
        }

        .tag {
          display: inline-block;
          background: rgba(34,197,94,0.10);
          border: 1px solid rgba(34,197,94,0.22);
          color: var(--gold);
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 99px;
        }

        .field-input {
          width: 100%;
          background: var(--navy-surface);
          border: 1.5px solid var(--navy-border);
          border-radius: 12px;
          padding: 13px 16px;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 14.5px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:focus {
          border-color: rgba(34,197,94,0.55);
          box-shadow: 0 0 0 3px rgba(34,197,94,0.14);
        }

        .gold-btn {
          background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
          color: #0A0F1E;
          transition: box-shadow 0.3s ease, transform 0.2s ease, opacity 0.2s ease;
        }
        .gold-btn:hover:not(:disabled) {
          box-shadow: 0 0 0 6px rgba(34,197,94,0.15), 0 8px 30px rgba(34,197,94,0.35);
          transform: translateY(-1px);
        }
        .gold-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spin-icon { animation: spin 0.8s linear infinite; }

        .pillar-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--navy-border);
        }
        .pillar-item:last-child { border-bottom: none; }

        .strength-bar {
          height: 3px;
          border-radius: 99px;
          flex: 1;
          transition: background 0.3s ease;
        }
      `}</style>

      {/* ── LEFT: BRAND PANEL ───────────────────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[44%] flex-col justify-between overflow-hidden px-12 py-14"
        style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0E1426 50%, #141C36 100%)" }}
      >
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.05 }} />
        <div
          className="absolute top-0 right-0 w-[420px] h-[320px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(56,189,248,0.07) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[360px] h-[280px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(34,197,94,0.08) 0%, transparent 65%)" }}
        />

        <div className="relative anim-fade-up">
          <span className="font-display text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            iNEX<span className="shimmer-gold">ORA</span>
          </span>
        </div>

        <div className="relative anim-fade-up-2">
          <div className="section-rule mb-6" />
          <span className="tag mb-5 inline-block">Institution Access</span>
          <h1 className="font-display text-4xl font-bold leading-[1.12] mb-5" style={{ color: "var(--text-primary)" }}>
            Secure your<br /><span className="shimmer-gold">institution account.</span>
          </h1>
          <p className="font-body text-base leading-relaxed mb-10 max-w-sm" style={{ color: "var(--text-secondary)" }}>
            You've been granted access to manage your institution on iNEXORA. Set a strong password to get started.
          </p>

          <div>
            {[
              { label: "Manage programs and courses", sub: "Publish and update your institution's offerings" },
              { label: "Review enrollment requests", sub: "Approve and track student applications" },
              { label: "Access institution analytics", sub: "Monitor performance and engagement data" },
            ].map(({ label, sub }, i) => (
              <div key={i} className="pillar-item">
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="font-body text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-body text-xs anim-fade-up-3" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} iNEXORA. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT: FORM PANEL ───────────────────────────────────────────── */}
      <div
        className="relative flex w-full lg:w-[56%] items-center justify-center px-6 py-12"
        style={{ background: "var(--navy-base)" }}
      >
        <div className="w-full max-w-[400px] anim-fade-up">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <span className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              iNEX<span className="shimmer-gold">ORA</span>
            </span>
          </div>

          {/* Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "var(--gold)" }} />
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Set your password
            </h2>
            <p className="font-body text-sm" style={{ color: "var(--text-secondary)" }}>
              Choose a strong password to secure your institution account.
            </p>
          </div>

          {error && (
            <div
              className="mb-5 rounded-xl px-4 py-3 font-body text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block font-body text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input pr-11"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{
                          background: i <= strength ? strengthColor : "var(--navy-border)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-body text-xs" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirm"
                className="mb-2 block font-body text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="field-input pr-11"
                  placeholder="Repeat your password"
                  style={{
                    borderColor:
                      confirm.length > 0 && confirm !== password
                        ? "rgba(239,68,68,0.55)"
                        : confirm.length > 0 && confirm === password
                        ? "rgba(34,197,94,0.55)"
                        : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && confirm !== password && (
                <p className="mt-1.5 font-body text-xs" style={{ color: "#F87171" }}>
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gold-btn font-display flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 spin-icon" />}
              {loading ? "Setting password..." : "Set password & continue"}
            </button>
          </form>

          <p className="mt-8 font-body text-xs text-center" style={{ color: "var(--text-muted)" }}>
            This link was sent to you by iNEXORA admin. If you weren't expecting this, ignore it.
          </p>
        </div>
      </div>
    </div>
  );
}