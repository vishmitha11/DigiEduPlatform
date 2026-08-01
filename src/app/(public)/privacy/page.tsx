"use client";

const SECTION_STYLE = { color: "var(--text-secondary)" } as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-12 border-b" style={{ borderColor: "var(--navy-border)" }}>
      <h2 className="font-display text-2xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div className="font-body text-base leading-relaxed space-y-4" style={SECTION_STYLE}>
        {children}
      </div>
    </section>
  );
}

function TierCard({
  tag,
  color,
  title,
  items,
}: {
  tag: string;
  color: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--navy-card)", border: "1px solid var(--navy-border)" }}>
      <span
        className="mb-3 inline-block rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider"
        style={{ background: `${color}1A`, color, border: `1px solid ${color}44` }}
      >
        {tag}
      </span>
      <h3 className="font-display text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <ul className="space-y-2 font-body text-sm" style={{ color: "var(--text-secondary)" }}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="font-sans" style={{ background: "#0A0F1E" }}>
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
          --text-primary: #F5F5F0;
          --text-secondary: rgba(136,153,187,0.70);
          --text-muted:   rgba(136,153,187,0.40);
        }
        .tag { display:inline-block; background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.22); color:var(--gold); font-family:'Sora',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; padding:5px 14px; border-radius:99px; }
      `}</style>

      <section
        className="relative overflow-hidden py-20"
        style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0E1426 50%, #141C36 100%)" }}
      >
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="tag mb-5 inline-block">Privacy</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Privacy Policy
          </h1>
          <p className="font-body text-base" style={{ color: "var(--text-muted)" }}>
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Section title="Overview">
          <p>
            iNEXORA connects students, lecturers, institutions, and employers on one platform.
            This policy explains what information we collect, why we collect it, how it&apos;s
            used, and the choices you have. We aim for this document to describe exactly what
            the platform does today — not aspirational promises.
          </p>
          <p>
            iNEXORA is designed with data protection principles consistent with the GDPR
            (EU), CCPA (California), PDPA (Singapore/SE Asia), and FERPA (US education
            records) in mind: we collect the minimum data needed to run the service,
            classify it by sensitivity, and gate anything beyond the essentials behind
            explicit consent.
          </p>
        </Section>

        <Section title="What we collect, by tier">
          <p className="mb-6">
            We classify data into four tiers based on sensitivity and necessity. Higher
            tiers require explicit, separate consent — they are never bundled into account
            creation.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 not-prose">
            <TierCard
              tag="Tier 1 · Essential"
              color="#22C55E"
              title="Required to create and use an account"
              items={[
                "Name, preferred name, email address and password at signup (password is hashed, never stored in plain text)",
                "Date of birth, collected right after during profile setup, used only to confirm minimum age",
                "Country, and optionally phone number and nationality, also collected during profile setup",
              ]}
            />
            <TierCard
              tag="Tier 2 · Important"
              color="#38BDF8"
              title="Collected during profile setup, for service value"
              items={[
                "Role-specific details (career goals, industry, institution)",
                "Learning history and credentials you choose to add",
                "Communication preferences",
              ]}
            />
            <TierCard
              tag="Tier 3 · Optional"
              color="#A3E635"
              title="Only with your explicit, separate consent"
              items={[
                "Demographics such as gender — collected only to support equity reporting, never required",
                "Professional profile links (LinkedIn, GitHub, portfolio)",
                "Learning preferences (pace, modality, availability)",
                "Personalized recommendations, powered by your profile data",
                "Marketing and product update emails",
              ]}
            />
            <TierCard
              tag="Tier 4 · Never collected"
              color="#F87171"
              title="We do not collect this — even with consent"
              items={[
                "Financial information (card numbers, bank accounts)",
                "Health or medical data",
                "Behavioral tracking (keystrokes, mouse movement, location tracking)",
                "Third-party data such as credit scores or criminal records",
              ]}
            />
          </div>
        </Section>

        <Section title="How we use your data">
          <p>Account data (Tier 1) is used to operate your account: authentication, security, and communicating with you about your account.</p>
          <p>Profile data (Tier 2) is used to power the core service — matching you with programs, courses, or candidates relevant to your role.</p>
          <p>Optional data (Tier 3) is used only for the specific purpose you consented to. If you consent to personalized recommendations, your profile signals are used to rank programs for you. If you consent to marketing, we send occasional updates about new programs and features. You can withdraw either consent at any time from Settings.</p>
        </Section>

        <Section title="Consent & your controls">
          <p>
            At signup, you must actively agree to this Privacy Policy and our Terms of
            Service before an account is created — this is not implied by continuing to
            use the site. Two additional checkboxes, both off by default, let you opt in
            to personalized recommendations and marketing communications separately.
          </p>
          <p>
            If you sign up with Google, GitHub, or LinkedIn, we ask for the same consent
            immediately after your first sign-in, since those providers don&apos;t give us
            a chance to collect it beforehand.
          </p>
          <p>
            You can review and change your recommendation and marketing preferences at any
            time from <strong style={{ color: "var(--text-primary)" }}>Settings → Privacy & Communications</strong>.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain account data for as long as your account is active. If you stop using
            iNEXORA, your data remains associated with your account until you request
            deletion. We do not currently run automated retention or deletion schedules —
            all deletion requests are handled manually by our team (see &quot;Your rights&quot;
            below). Automating this is on our roadmap.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data in transit is encrypted via TLS. Data at rest is encrypted using our
            infrastructure provider&apos;s (Supabase, built on PostgreSQL) standard
            encryption-at-rest. Access to production data is restricted to authorized
            personnel on a least-privilege basis, and role-based access control governs
            what any given account (student, lecturer, employer, institution, admin) can
            see or change.
          </p>
          <p>
            We have not pursued formal infrastructure certifications such as ISO/IEC 27001
            or SOC 2 — those are audits of our hosting provider&apos;s infrastructure, not
            something we can claim by editing this page. We link to
            our provider&apos;s own security documentation where relevant and will update
            this section if that changes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live, you may have the right to access, correct, export,
            or delete your personal data, or to object to certain processing. To exercise
            any of these rights, contact us at{" "}
            <a href="mailto:privacy@inexora.app" className="font-semibold" style={{ color: "var(--gold)" }}>privacy@inexora.app</a>{" "}
            and we will respond as required by applicable law. We don&apos;t yet offer a
            self-service export or deletion tool — every request today is handled directly
            by our team.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or how your data is handled can be sent to{" "}
            <a href="mailto:privacy@inexora.app" className="font-semibold" style={{ color: "var(--gold)" }}>privacy@inexora.app</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
