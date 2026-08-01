"use client";

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
      <div className="font-body text-base leading-relaxed space-y-4" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </section>
  );
}

export default function TermsOfService() {
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
          <span className="tag mb-5 inline-block">Terms</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Terms of Service
          </h1>
          <p className="font-body text-base" style={{ color: "var(--text-muted)" }}>
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Section title="1. Acceptance of terms">
          <p>
            By creating an account or otherwise using iNEXORA, you agree to these Terms and
            to our <a href="/privacy" className="font-semibold" style={{ color: "var(--gold)" }}>Privacy Policy</a>.
            If you do not agree, please do not use the platform.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to create an iNEXORA account. If you are
            under the age of majority in your country, you confirm you have the necessary
            permission from a parent or guardian to use the platform.
          </p>
        </Section>

        <Section title="3. Accounts and roles">
          <p>
            iNEXORA supports four account types — Student, Lecturer, Employer, and
            Institution — each with different capabilities. Lecturer, Employer, and
            Institution accounts go through a manual approval step before they can post
            content, list jobs, or manage programs. You&apos;re responsible for keeping
            your login credentials secure and for all activity under your account.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Misrepresent your identity, qualifications, or affiliation with an institution or employer</li>
            <li>Post false, misleading, or infringing content (courses, job listings, credentials)</li>
            <li>Attempt to access accounts, data, or systems you&apos;re not authorized to access</li>
            <li>Use the platform to harass, discriminate against, or harm other users</li>
          </ul>
        </Section>

        <Section title="5. Content">
          <p>
            Lecturers and institutions retain ownership of the course content they publish
            on iNEXORA, and grant iNEXORA a license to host and display it to enrolled
            users. Employers retain ownership of job listings they post. You&apos;re
            responsible for having the rights to anything you upload.
          </p>
        </Section>

        <Section title="6. Suspension and termination">
          <p>
            We may suspend or terminate accounts that violate these Terms, including
            accounts flagged during our approval review for Lecturer, Employer, or
            Institution roles. You can stop using the platform at any time; to request
            deletion of your account and associated data, contact us as described in the
            Privacy Policy.
          </p>
        </Section>

        <Section title="7. Disclaimers">
          <p>
            iNEXORA is provided &quot;as is.&quot; We do not guarantee that any program,
            course, or job listed on the platform will meet your expectations or lead to a
            specific outcome (admission, employment, certification, etc.). Program and
            listing accuracy is the responsibility of the institution, lecturer, or
            employer who published it.
          </p>
        </Section>

        <Section title="8. Changes to these terms">
          <p>
            We may update these Terms as the platform evolves. Material changes will be
            reflected by updating the &quot;Last updated&quot; date above. Continued use of
            iNEXORA after changes take effect means you accept the revised Terms.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:support@inexora.app" className="font-semibold" style={{ color: "var(--gold)" }}>support@inexora.app</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
