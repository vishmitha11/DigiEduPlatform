"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Briefcase,
  ChevronRight,
  Eye,
  EyeOff,
  Github,
  Linkedin,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import ConsentCheckboxes, {
  DEFAULT_CONSENT,
  type ConsentState,
} from "~/app/components/ConsentCheckboxes";
import { BRAND_PANEL_OVERLAY, BRAND_PANEL_PHOTOS } from "~/app/components/TrustBadges";

type UserRole = "STUDENT" | "LECTURER" | "EMPLOYER";
type OAuthProvider = "google" | "github" | "linkedin_oidc";

const roles: {
  value: UserRole;
  label: string;
  description: string;
  icon: typeof GraduationCap;
  detail: string;
}[] = [
  {
    value: "STUDENT",
    label: "Student",
    description: "Access programs, pathways and credentials",
    icon: GraduationCap,
    detail: "Enroll in courses, track progress, earn credentials, and connect with employers.",
  },
  {
    value: "LECTURER",
    label: "Lecturer",
    description: "Create and share educational content",
    icon: BookOpen,
    detail: "Build programs, publish courses, and guide students through structured learning.",
  },
  {
    value: "EMPLOYER",
    label: "Employer",
    description: "Post jobs and discover top talent",
    icon: Briefcase,
    detail: "Browse verified graduates, post opportunities, and hire with confidence.",
  },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.04 12.27c0-.82-.07-1.42-.22-2.04H12.24v3.7h6.18c-.12 1-.8 2.52-2.3 3.54l-.02.14 3.34 2.58.23.02c2.13-1.96 3.37-4.86 3.37-7.94Z" fill="#4285F4" />
      <path d="M12.24 23.4c3.04 0 5.6-1 7.46-2.72l-3.55-2.74c-.95.66-2.23 1.12-3.91 1.12-2.98 0-5.51-1.96-6.41-4.68l-.13.01-3.47 2.68-.05.13c1.85 3.67 5.65 6.2 10.06 6.2Z" fill="#34A853" />
      <path d="M5.83 14.38a6.6 6.6 0 0 1-.36-2.13c0-.74.13-1.46.35-2.13l-.01-.14-3.51-2.72-.12.06A11.43 11.43 0 0 0 .8 12.25c0 1.84.45 3.58 1.38 5.13l3.65-2.99Z" fill="#FBBC05" />
      <path d="M12.24 4.7c2.12 0 3.55.91 4.37 1.67l3.19-3.1C17.83 1.4 15.28.3 12.24.3 7.83.3 4.03 2.83 2.18 6.5l3.64 2.82c.91-2.72 3.44-4.62 6.42-4.62Z" fill="#EA4335" />
    </svg>
  );
}

// ── Role Picker Modal ────────────────────────────────────────────────────────
function RolePickerModal({
  provider,
  onConfirm,
  onClose,
}: {
  provider: OAuthProvider;
  onConfirm: (role: UserRole) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<UserRole>("STUDENT");

  const providerLabel =
    provider === "google" ? "Google" :
    provider === "github" ? "GitHub" : "LinkedIn";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{
          background: "linear-gradient(145deg, #141C36 0%, #1E2B55 100%)",
          border: "1px solid rgba(136,153,187,0.15)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <span className="tag mb-4 inline-block">One quick step</span>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            How will you use iNEXORA?
          </h2>
          <p className="font-body text-sm" style={{ color: "var(--text-secondary)" }}>
            This sets up the right tools for your {providerLabel} account from day one. You can&apos;t change this later.
          </p>
        </div>

        {/* Role options */}
        <div className="space-y-3 mb-6">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = selected === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{
                  background: isSelected ? "rgba(34,197,94,0.08)" : "rgba(136,153,187,0.04)",
                  border: `1.5px solid ${isSelected ? "rgba(34,197,94,0.50)" : "rgba(136,153,187,0.12)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: isSelected ? "rgba(34,197,94,0.14)" : "rgba(136,153,187,0.08)",
                      border: `1px solid ${isSelected ? "rgba(34,197,94,0.35)" : "rgba(136,153,187,0.12)"}`,
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: isSelected ? "var(--gold)" : "var(--text-muted)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold mb-0.5" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {r.label}
                    </p>
                    <p className="font-body text-xs" style={{ color: "var(--text-muted)" }}>
                      {r.detail}
                    </p>
                  </div>
                  {isSelected && (
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: "var(--gold)" }}
                    >
                      <Check className="h-3 w-3" style={{ color: "#0A0F1E" }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onConfirm(selected)}
          className="gold-btn font-display flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold"
        >
          Continue with {providerLabel}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const applyProfileDetails = async (userId: string) => {
    await supabase
      .from("Profile")
      .update({
        preferredName: preferredName || null,
        marketingConsent: consent.marketingConsent,
        dataProcessingConsent: consent.dataProcessingConsent,
        termsAcceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError("Enter your full name.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }
    setEmail(trimmedEmail);
    setFullName(trimmedName);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!consent.termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: trimmedName, role } },
      });
      if (error) throw error;
      if (data.session && data.user) {
        await applyProfileDetails(data.user.id);
        router.push("/profile-setup");
        router.refresh();
      } else {
        setOtpStep(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });
      if (error) throw error;
      if (data.user) {
        await applyProfileDetails(data.user.id);
      }
      router.push("/profile-setup");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: show modal to pick role
  const handleOAuthClick = (provider: OAuthProvider) => {
    setError("");
    setPendingProvider(provider);
  };

  // Step 2: modal confirmed — fire OAuth with role embedded in callback URL
  const handleOAuthConfirm = async (chosenRole: UserRole) => {
    if (!pendingProvider) return;
    setOauthLoading(pendingProvider);
    setPendingProvider(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: pendingProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback-oauth?next=/profile-setup&role=${chosenRole}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth sign-up failed");
      setOauthLoading(null);
    }
  };

  return (
    <div className="flex h-screen font-sans" style={{ background: "#0A0F1E" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Sora', sans-serif; }
        .font-body    { font-family: 'Inter', sans-serif; }
        :root {
          --navy-base:    #0A0F1E;
          --navy-surface: #141C36;
          --navy-card:    #1E2B55;
          --navy-border:  rgba(136,153,187,0.12);
          --navy-border-strong: rgba(136,153,187,0.20);
          --gold:         #22C55E;
          --gold-dim:     #16A34A;
          --gold-glow:    rgba(34,197,94,0.18);
          --gold-subtle:  rgba(34,197,94,0.08);
          --blue-acc:     #38BDF8;
          --blue-dim:     rgba(56,189,248,0.15);
          --text-primary: #F5F5F0;
          --text-secondary: rgba(136,153,187,0.70);
          --text-muted:   rgba(136,153,187,0.40);
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lineDraw { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .anim-fade-up   { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }
        .anim-fade-up-2 { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) 0.1s both; }
        .anim-fade-up-3 { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) 0.2s both; }
        .shimmer-gold { color: var(--gold); }
        .dot-grid {
          background-image: radial-gradient(circle at 1.5px 1.5px, #F5F5F0 1.5px, transparent 0);
          background-size: 36px 36px;
        }
        .section-rule { width:40px; height:2px; background:var(--gold); border-radius:2px; transform-origin:left; animation:lineDraw 0.6s ease 0.2s both; }
        .tag { display:inline-block; background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.22); color:var(--gold); font-family:'Sora',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; padding:5px 14px; border-radius:99px; }
        .field-input { width:100%; background:var(--navy-surface); border:1.5px solid var(--navy-border); border-radius:12px; padding:13px 16px; color:var(--text-primary); font-family:'Inter',sans-serif; font-size:14.5px; transition:border-color 0.2s ease,box-shadow 0.2s ease; outline:none; }
        .field-input::placeholder { color:var(--text-muted); }
        .field-input:focus { border-color:rgba(34,197,94,0.55); box-shadow:0 0 0 3px rgba(34,197,94,0.14); }
        select.field-input { appearance:none; }
        .otp-input { width:100%; background:var(--navy-surface); border:1.5px solid var(--navy-border); border-radius:12px; padding:16px; text-align:center; font-family:'Sora',sans-serif; font-size:26px; font-weight:700; letter-spacing:0.5em; color:var(--text-primary); outline:none; transition:border-color 0.2s ease,box-shadow 0.2s ease; }
        .otp-input:focus { border-color:rgba(34,197,94,0.55); box-shadow:0 0 0 3px rgba(34,197,94,0.14); }
        .gold-btn { background:linear-gradient(135deg,#22C55E 0%,#16A34A 100%); color:#0A0F1E; transition:box-shadow 0.3s ease,transform 0.2s ease,opacity 0.2s ease; }
        .gold-btn:hover:not(:disabled) { box-shadow:0 0 0 6px rgba(34,197,94,0.15),0 8px 30px rgba(34,197,94,0.35); transform:translateY(-1px); }
        .gold-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .oauth-btn { background:var(--navy-surface); border:1.5px solid var(--navy-border); color:var(--text-primary); transition:border-color 0.2s ease,background 0.2s ease,transform 0.15s ease; }
        .oauth-btn:hover:not(:disabled) { border-color:rgba(34,197,94,0.35); background:rgba(34,197,94,0.06); transform:translateY(-1px); }
        .oauth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .divider-line { flex:1; height:1px; background:var(--navy-border); }
        .spin-icon { animation:spin 0.8s linear infinite; }
        .role-chip { display:flex; flex-direction:column; align-items:center; gap:8px; border-radius:12px; border:1.5px solid var(--navy-border); padding:14px 10px; cursor:pointer; transition:border-color 0.2s ease,background 0.2s ease; background:var(--navy-surface); }
        .role-chip.selected { border-color:rgba(34,197,94,0.55); background:rgba(34,197,94,0.07); }
        .form-section-label { font-family:'Sora',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold); margin-bottom:2px; }
        .consent-block span, .consent-block .text-slate-600, .consent-block .text-slate-400 { color:var(--text-secondary) !important; }
        .consent-block a, .consent-block .text-brand { color:var(--gold) !important; }
        .consent-block input[type="checkbox"] { accent-color: var(--gold); }
      `}</style>

      {/* Role Picker Modal */}
      {pendingProvider && (
        <RolePickerModal
          provider={pendingProvider}
          onConfirm={handleOAuthConfirm}
          onClose={() => setPendingProvider(null)}
        />
      )}

      {/* ── LEFT: BRAND PANEL ─────────────────────────────────────────── */}
      <div className="relative hidden h-screen lg:flex lg:w-[440px] flex-shrink-0 flex-col justify-between overflow-hidden px-11 py-14">
        <div
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url('${BRAND_PANEL_PHOTOS[role]}')`,
            transition: "background-image 0.3s ease",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.1)",
          }}
        />
        <div className="absolute inset-0 -z-10" style={{ background: BRAND_PANEL_OVERLAY }} />
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.05 }} />
        <div className="absolute top-0 right-0 w-[380px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(56,189,248,0.07) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 w-[320px] h-[260px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom left, rgba(34,197,94,0.08) 0%, transparent 65%)" }} />

        <button type="button" onClick={() => router.push("/")} className="relative font-display text-xl font-bold tracking-tight anim-fade-up" style={{ color: "var(--text-primary)" }}>
          iNEX<span className="shimmer-gold">ORA</span>
        </button>

        <div className="relative anim-fade-up-2">
          <div className="section-rule mb-6" />
          <span className="tag mb-4 inline-block">Get Started</span>
          <h1 className="font-display text-3xl font-bold leading-[1.15] mb-3" style={{ color: "var(--text-primary)" }}>
            Your structured path<br />to <span className="shimmer-gold">what&apos;s next.</span>
          </h1>
          <p className="font-body text-sm leading-relaxed mb-8 max-w-xs" style={{ color: "var(--text-secondary)" }}>
            iNEXORA connects learning and careers in one place — built for students, educators, and employers across Sri Lanka.
          </p>

          <div className="space-y-4">
            {[
              { color: "#22C55E", label: "Students", sub: "Programs, credentials, and job connections" },
              { color: "#38BDF8", label: "Lecturers", sub: "Tools to build and publish structured courses" },
              { color: "#A3E635", label: "Employers", sub: "Verified talent, ready to hire" },
            ].map(({ color, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <span className="font-display text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label} </span>
                  <span className="font-body text-xs" style={{ color: "var(--text-muted)" }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative space-y-4">
          <p className="font-body text-xs anim-fade-up-3" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} iNEXORA by Laelapsion. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT: FORM PANEL ─────────────────────────────────────────── */}
      <div className="relative flex h-screen flex-1 items-start justify-center overflow-y-auto px-6 py-12" style={{ background: "var(--navy-base)" }}>
        <button
          type="button"
          onClick={() => (otpStep ? setOtpStep(false) : router.push("/"))}
          className="absolute top-6 left-6 lg:top-10 lg:left-10 flex items-center gap-2 font-body text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft className="h-4 w-4" />
          {otpStep ? "Back to sign up" : "Back"}
        </button>

        <div className="w-full max-w-[440px] anim-fade-up">
          <div className="mb-6 lg:hidden">
            <span className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              iNEX<span className="shimmer-gold">ORA</span>
            </span>
          </div>

          <div className="mb-7">
            <h2 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {otpStep ? "Check your email" : "Create your account"}
            </h2>
            <p className="font-body text-sm" style={{ color: "var(--text-secondary)" }}>
              {otpStep ? (
                <>We sent a 6-digit code to <span style={{ color: "var(--text-primary)" }}>{email}</span></>
              ) : (
                <>Already have an account?{" "}<Link href="/login" className="font-semibold" style={{ color: "var(--gold)" }}>Sign in</Link></>
              )}
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl px-4 py-3 font-body text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
              {error}
            </div>
          )}

          {!otpStep ? (
            <>
              {/* OAuth — each button opens the role picker modal first */}
              <div className="space-y-3 mb-6">
                <button type="button" onClick={() => handleOAuthClick("google")} disabled={oauthLoading !== null} className="oauth-btn font-display flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold">
                  {oauthLoading === "google" ? <Loader2 className="h-4 w-4 spin-icon" /> : <GoogleIcon className="h-4 w-4" />}
                  Continue with Google
                </button>
                <button type="button" onClick={() => handleOAuthClick("github")} disabled={oauthLoading !== null} className="oauth-btn font-display flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold">
                  {oauthLoading === "github" ? <Loader2 className="h-4 w-4 spin-icon" /> : <Github className="h-4 w-4" />}
                  Continue with GitHub
                </button>
                <button type="button" onClick={() => handleOAuthClick("linkedin_oidc")} disabled={oauthLoading !== null} className="oauth-btn font-display flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold">
                  {oauthLoading === "linkedin_oidc" ? <Loader2 className="h-4 w-4 spin-icon" /> : <Linkedin className="h-4 w-4" style={{ color: "#0A66C2" }} />}
                  Continue with LinkedIn
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="divider-line" />
                <span className="font-body text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>or</span>
                <div className="divider-line" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Account ── */}
                <div className="space-y-4">
                  <p className="form-section-label">Account</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Full name</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Perera" className="field-input" />
                    </div>
                    <div>
                      <label className="mb-2 block font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Preferred name <span className="normal-case" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
                      <input type="text" value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Jane" className="field-input" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Email address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="field-input" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Password</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 chars" className="field-input pr-10" />
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Confirm</label>
                      <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Re-enter" className="field-input pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role selection for email signup */}
                <div>
                  <p className="mb-2 font-body text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>I am joining as</p>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      const isSelected = role === r.value;
                      return (
                        <label key={r.value} className={`role-chip ${isSelected ? "selected" : ""}`}>
                          <input type="radio" name="role" value={r.value} checked={isSelected} onChange={(e) => setRole(e.target.value as UserRole)} className="sr-only" />
                          <Icon className="h-4 w-4" style={{ color: isSelected ? "var(--gold)" : "var(--text-muted)" }} />
                          <span className="font-body text-[11px] font-semibold" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>{r.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ── Consent ── */}
                <div className="space-y-3">
                  <p className="form-section-label">Consent</p>
                  <ConsentCheckboxes value={consent} onChange={setConsent} className="consent-block text-[13px]" />
                </div>

                <button type="submit" disabled={loading} className="gold-btn font-display flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold mt-2">
                  {loading ? <><Loader2 className="h-4 w-4 spin-icon" />Creating account...</> : <>Create account<ChevronRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                className="otp-input"
              />
              <button type="submit" disabled={loading} className="gold-btn font-display flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold">
                {loading ? <><Loader2 className="h-4 w-4 spin-icon" />Verifying...</> : <>Verify email<ChevronRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center font-body text-sm" style={{ color: "var(--text-muted)" }}>
                Didn&apos;t receive a code?{" "}
                <button type="button" onClick={() => setOtpStep(false)} className="font-semibold" style={{ color: "var(--gold)" }}>Go back</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
