// app/terms/page.tsx
// Terms of Service page for EZ Ledgr.
// Mirrors the layout, nav, hero band, sticky TOC, and footer of the Privacy Policy page.
// Update LAST_UPDATED if you revise the terms.

import Link from "next/link";

const LAST_UPDATED = "March 26, 2026";
const CONTACT_EMAIL = "security@scalable-innovations.com";
const COMPANY = "Scalable Innovations LLC";
const BRAND = "EZ Ledgr";
const DOMAIN = "www.ezledgr.com";

// ─── Section component ────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: "acceptance",          label: "1. Acceptance of Terms" },
  { id: "description",         label: "2. Description of Service" },
  { id: "eligibility",         label: "3. Eligibility" },
  { id: "accounts",            label: "4. Account Registration" },
  { id: "billing",             label: "5. Subscription & Billing" },
  { id: "acceptable-use",      label: "6. Acceptable Use" },
  { id: "prohibited",          label: "7. Prohibited Activities" },
  { id: "financial-data",      label: "8. Financial Data & Plaid" },
  { id: "intellectual-property", label: "9. Intellectual Property" },
  { id: "privacy",             label: "10. Privacy" },
  { id: "disclaimers",         label: "11. Disclaimers" },
  { id: "liability",           label: "12. Limitation of Liability" },
  { id: "indemnification",     label: "13. Indemnification" },
  { id: "termination",         label: "14. Termination" },
  { id: "governing-law",       label: "15. Governing Law & Disputes" },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TermsPage() {
  return (
    <>
      {/* ── Inline styles (mirrors Privacy Policy tokens and layout) ── */}
      <style>{`
        :root {
          --navy:   #0f172a;
          --navy2:  #1e293b;
          --accent: #3b82f6;
          --accent2:#2563eb;
          --text:   #1e293b;
          --muted:  #64748b;
          --border: #e2e8f0;
          --bg:     #f8fafc;
          --white:  #ffffff;
          --radius: 12px;
          --max:    860px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-nav {
          background: var(--navy);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .pp-nav-logo {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .pp-nav-logo span { color: var(--accent); }
        .pp-nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }
        .pp-nav-links a {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .pp-nav-links a:hover { color: #fff; }
        .pp-nav-cta {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .pp-nav-signin {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .pp-nav-signin:hover { color: #fff; }
        .pp-nav-btn {
          background: var(--accent);
          color: #fff;
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.2s;
        }
        .pp-nav-btn:hover { background: var(--accent2); }

        .pp-hero {
          background: var(--navy);
          padding: 4rem 2rem 3rem;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .pp-hero-badge {
          display: inline-block;
          background: rgba(59,130,246,0.15);
          border: 1px solid rgba(59,130,246,0.3);
          color: #93c5fd;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          margin-bottom: 1.25rem;
        }
        .pp-hero h1 {
          color: #fff;
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 0.75rem;
        }
        .pp-hero p {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 540px;
          margin: 0 auto 1.5rem;
          line-height: 1.7;
        }
        .pp-hero-meta {
          display: inline-flex;
          gap: 1.5rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0.75rem 1.5rem;
          color: #64748b;
          font-size: 0.8rem;
        }
        .pp-hero-meta span { color: #94a3b8; }
        .pp-hero-meta strong { color: #cbd5e1; font-weight: 600; }

        .pp-layout {
          max-width: 1100px;
          margin: 0 auto;
          padding: 3rem 1.5rem 5rem;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 3rem;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pp-layout { grid-template-columns: 1fr; }
          .pp-toc { display: none; }
          .pp-nav-links { display: none; }
        }

        .pp-toc {
          position: sticky;
          top: 80px;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.25rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .pp-toc h3 {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 1rem;
        }
        .pp-toc ul { list-style: none; }
        .pp-toc li + li { margin-top: 0.25rem; }
        .pp-toc a {
          display: block;
          font-size: 0.8rem;
          color: var(--muted);
          text-decoration: none;
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          transition: all 0.15s;
          line-height: 1.4;
        }
        .pp-toc a:hover {
          background: #eff6ff;
          color: var(--accent2);
        }

        .pp-content { min-width: 0; }

        .policy-section {
          margin-bottom: 2.75rem;
          padding-bottom: 2.75rem;
          border-bottom: 1px solid var(--border);
        }
        .policy-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .policy-section h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }
        .policy-section h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin: 1.5rem 0 0.6rem;
        }
        .policy-section p {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.75;
          margin-bottom: 0.9rem;
        }
        .policy-section p:last-child { margin-bottom: 0; }
        .policy-section ul {
          margin: 0.5rem 0 0.9rem 1.25rem;
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.75;
        }
        .policy-section ul li { margin-bottom: 0.3rem; }
        .policy-section a {
          color: var(--accent2);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .callout {
          border-radius: 10px;
          padding: 1rem 1.25rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          line-height: 1.65;
        }
        .callout-blue {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }
        .callout-blue strong { color: #1e40af; }
        .callout-green {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .callout-yellow {
          background: #fefce8;
          border: 1px solid #fde68a;
          color: #854d0e;
        }
        .callout-red {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .contact-card {
          background: var(--navy);
          border-radius: var(--radius);
          padding: 1.75rem;
          color: #e2e8f0;
          margin-top: 1rem;
        }
        .contact-card h3 {
          color: #fff !important;
          margin-top: 0 !important;
        }
        .contact-card p { color: #94a3b8 !important; }
        .contact-card a { color: #93c5fd !important; }

        .pp-footer {
          background: var(--navy);
          color: #64748b;
          padding: 3rem 2rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .pp-footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .pp-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2.5rem;
        }
        @media (max-width: 768px) {
          .pp-footer-grid { grid-template-columns: 1fr 1fr; }
        }
        .pp-footer-brand .logo {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: block;
        }
        .pp-footer-brand .logo span { color: var(--accent); }
        .pp-footer-brand p {
          font-size: 0.8rem;
          line-height: 1.6;
          color: #475569;
          max-width: 220px;
        }
        .pp-footer-col h4 {
          color: #e2e8f0;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.9rem;
        }
        .pp-footer-col ul { list-style: none; }
        .pp-footer-col li + li { margin-top: 0.5rem; }
        .pp-footer-col a {
          color: #64748b;
          text-decoration: none;
          font-size: 0.8rem;
          transition: color 0.2s;
        }
        .pp-footer-col a:hover { color: #e2e8f0; }
        .pp-footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 1.5rem;
          font-size: 0.75rem;
          color: #334155;
        }
      `}</style>

      {/* ── Navigation ── */}
      <nav className="pp-nav">
        <Link href="/" className="pp-nav-logo">
          EZ <span>Ledgr</span>
        </Link>
        <ul className="pp-nav-links">
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/#how-it-works">How it works</Link></li>
        </ul>
        <div className="pp-nav-cta">
          <Link href="/sign-in" className="pp-nav-signin">Sign in</Link>
          <Link href="/sign-up" className="pp-nav-btn">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="pp-hero">
        <div className="pp-hero-badge">Legal</div>
        <h1>Terms of Service</h1>
        <p>
          Please read these terms carefully before using {BRAND}. By creating an
          account you agree to be bound by them.
        </p>
        <div className="pp-hero-meta">
          <div><strong>Company</strong> &nbsp;{COMPANY}</div>
          <div><strong>Last updated</strong> &nbsp;{LAST_UPDATED}</div>
          <div><strong>Applies to</strong> &nbsp;{DOMAIN}</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pp-layout">

        {/* Sidebar TOC */}
        <aside className="pp-toc">
          <h3>Contents</h3>
          <ul>
            {TOC_ITEMS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Terms content */}
        <main className="pp-content">

          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>
              These Terms of Service (&quot;Terms&quot;) are a legally binding agreement between
              you and {COMPANY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of
              the {BRAND} software-as-a-service platform, including all related websites,
              APIs, and mobile applications (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By creating an account, clicking &quot;I agree,&quot; or otherwise accessing or using
              the Service, you agree to be bound by these Terms and our{" "}
              <Link href="/privacy">Privacy Policy</Link>, which is incorporated herein by
              reference. If you do not agree, do not use the Service.
            </p>
            <p>
              If you are using the Service on behalf of a business or other legal entity,
              you represent that you have the authority to bind that entity to these Terms,
              and references to &quot;you&quot; include that entity.
            </p>
          </Section>

          <Section id="description" title="2. Description of Service">
            <p>
              {BRAND} is a cloud-based bookkeeping and financial management platform
              designed for small businesses. The Service may include, depending on your
              subscription plan:
            </p>
            <ul>
              <li>General ledger and double-entry bookkeeping</li>
              <li>Bank account connectivity via Plaid (read-only)</li>
              <li>Transaction import, categorization, and reconciliation</li>
              <li>Financial reporting (profit &amp; loss, balance sheet, cash flow)</li>
              <li>Journal entry management</li>
              <li>Multi-business support and team collaboration</li>
              <li>Integrations with third-party tools as made available</li>
            </ul>
            <div className="callout callout-blue">
              <strong>Not a substitute for professional advice.</strong> {BRAND} provides
              bookkeeping tools, not tax, legal, or financial advice. Always consult a
              qualified professional for advice specific to your situation.
            </div>
          </Section>

          <Section id="eligibility" title="3. Eligibility">
            <p>
              You must be at least <strong>18 years old</strong> and capable of forming a
              binding contract to use the Service. The Service is intended for business
              use and is not directed at consumers for personal, family, or household
              purposes.
            </p>
            <p>
              By using the Service you represent and warrant that: (a) you meet the age
              requirement; (b) your use complies with all applicable laws and regulations;
              and (c) you have not been previously suspended or removed from the Service.
            </p>
          </Section>

          <Section id="accounts" title="4. Account Registration">
            <p>
              To access most features of the Service you must register for an account.
              When you register, you agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password confidential and not share it with others</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that contain false or
              misleading information or that have been inactive for an extended period,
              subject to applicable notice requirements.
            </p>
            <h3>Multi-factor authentication</h3>
            <p>
              For accounts connected to financial data via Plaid, we require multi-factor
              authentication (MFA). Disabling MFA on such accounts is not permitted.
            </p>
          </Section>

          <Section id="billing" title="5. Subscription & Billing">
            <h3>Plans and fees</h3>
            <p>
              {BRAND} is offered on a subscription basis. Current plan pricing and
              features are described on our pricing page. We reserve the right to change
              pricing with <strong>30 days&apos; notice</strong> to your registered email address.
            </p>
            <h3>Payment</h3>
            <p>
              Subscriptions are billed in advance on a monthly or annual basis.
              Payment is processed by our payment provider, Stripe. By providing payment
              information you authorize us to charge the applicable fees on a recurring
              basis until you cancel.
            </p>
            <h3>Free trials</h3>
            <p>
              Where offered, free trials automatically convert to a paid subscription
              at the end of the trial period unless you cancel beforehand. No charge
              is made during the trial.
            </p>
            <h3>Cancellation and refunds</h3>
            <p>
              You may cancel your subscription at any time from your account settings.
              Cancellation takes effect at the end of your current billing period.
              We do not provide refunds for partial periods, except where required by law.
            </p>
            <div className="callout callout-yellow">
              <strong>Unpaid invoices.</strong> If payment fails, we will retry and notify
              you by email. Accounts with overdue balances may be suspended until payment
              is received.
            </div>
          </Section>

          <Section id="acceptable-use" title="6. Acceptable Use">
            <p>
              You may use the Service only for lawful purposes and in accordance with
              these Terms. You agree to use the Service solely for your own legitimate
              business bookkeeping and financial management activities.
            </p>
            <p>
              You are responsible for all content you submit to the Service, including
              transaction data, business information, and any files uploaded. You represent
              that you have all rights necessary to submit such content and that it does
              not violate any third-party rights or applicable law.
            </p>
          </Section>

          <Section id="prohibited" title="7. Prohibited Activities">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service to engage in any illegal activity, including money laundering, tax evasion, or fraud</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Access or attempt to access accounts, data, or systems belonging to other users</li>
              <li>Use automated tools (bots, scrapers, crawlers) against the Service without written permission</li>
              <li>Transmit viruses, malware, or other malicious code</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Resell, sublicense, or provide access to the Service to third parties without our prior written consent</li>
              <li>Use the Service in any manner that could damage, disable, or impair our infrastructure</li>
            </ul>
            <div className="callout callout-red">
              <strong>Violations may result in immediate termination</strong> of your account
              without refund and, where appropriate, referral to law enforcement.
            </div>
          </Section>

          <Section id="financial-data" title="8. Financial Data & Plaid">
            <p>
              {BRAND} integrates with <a href="https://plaid.com" target="_blank" rel="noopener noreferrer">Plaid Technologies, Inc.</a>{" "}
              to enable optional bank account connectivity. By connecting a bank account
              you additionally agree to{" "}
              <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                Plaid&apos;s End User Privacy Policy
              </a>.
            </p>
            <ul>
              <li>Bank connections are <strong>read-only</strong> — {BRAND} and Plaid cannot initiate transactions or move money.</li>
              <li>Your bank credentials are never stored by {BRAND}.</li>
              <li>Financial data is used solely to provide the features you have requested.</li>
              <li>You consent to our collection and storage of your financial data each time you connect or reconnect an account (consent is recorded).</li>
              <li>You may disconnect your bank account at any time from Settings.</li>
            </ul>
            <p>
              See our <Link href="/privacy#financial-data">Privacy Policy § 3</Link> for
              full details on how financial data is stored, encrypted, and retained.
            </p>
          </Section>

          <Section id="intellectual-property" title="9. Intellectual Property">
            <h3>Our IP</h3>
            <p>
              The Service, including its software, design, text, graphics, logos, and
              other content, is owned by {COMPANY} and is protected by copyright,
              trademark, and other intellectual property laws. These Terms do not grant
              you any ownership interest in the Service.
            </p>
            <h3>License to use</h3>
            <p>
              Subject to your compliance with these Terms, we grant you a limited,
              non-exclusive, non-transferable, revocable license to access and use the
              Service solely for your internal business purposes.
            </p>
            <h3>Your data</h3>
            <p>
              You retain full ownership of the data you submit to the Service
              (&quot;Your Data&quot;). You grant us a limited license to store, process, and display
              Your Data solely as necessary to provide the Service to you. We do not
              claim any ownership over Your Data.
            </p>
          </Section>

          <Section id="privacy" title="10. Privacy">
            <p>
              Our collection and use of personal information is governed by our{" "}
              <Link href="/privacy">Privacy Policy</Link>, which is incorporated into
              these Terms. By using the Service you consent to the practices described
              in the Privacy Policy.
            </p>
          </Section>

          <Section id="disclaimers" title="11. Disclaimers">
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
              ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY
              LAW, {COMPANY.toUpperCase()} DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT.
            </p>
            <p>
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
              FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THE
              ACCURACY, COMPLETENESS, OR TIMELINESS OF ANY FINANCIAL DATA RETRIEVED
              THROUGH THE SERVICE.
            </p>
            <div className="callout callout-yellow">
              <strong>Tax and accounting accuracy.</strong> While we strive to provide
              accurate calculations and reports, {BRAND} does not guarantee that any
              output from the Service satisfies your specific tax or regulatory
              obligations. Always verify with a qualified accountant or tax professional.
            </div>
          </Section>

          <Section id="liability" title="12. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
              {" "}{COMPANY.toUpperCase()} BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE,
              DATA, GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN
              CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE, EVEN IF WE
              HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR
              RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF
              (A) THE TOTAL FEES PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING
              THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
            </p>
            <p>
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN
              DAMAGES, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </Section>

          <Section id="indemnification" title="13. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless {COMPANY}, its officers,
              directors, employees, and agents from and against any claims, liabilities,
              damages, losses, and expenses (including reasonable attorneys&apos; fees) arising
              out of or in any way connected with:
            </p>
            <ul>
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights, including intellectual property or privacy rights</li>
              <li>Any data or content you submit to the Service</li>
            </ul>
          </Section>

          <Section id="termination" title="14. Termination">
            <h3>Termination by you</h3>
            <p>
              You may stop using the Service and cancel your account at any time from
              your account settings. Upon cancellation, your access continues until the
              end of your current billing period.
            </p>
            <h3>Termination by us</h3>
            <p>
              We may suspend or terminate your access to the Service, with or without
              notice, if: (a) you materially breach these Terms and fail to cure within
              10 days of notice; (b) we are required to do so by law; or (c) we
              reasonably believe continued access poses a security risk.
            </p>
            <h3>Effect of termination</h3>
            <p>
              Upon termination, your right to access the Service ceases immediately.
              We will retain and delete Your Data in accordance with our{" "}
              <Link href="/privacy#retention">Privacy Policy § 6</Link>.
              Sections 9, 11, 12, 13, and 15 survive termination.
            </p>
          </Section>

          <Section id="governing-law" title="15. Governing Law & Disputes">
            <h3>Governing law</h3>
            <p>
              These Terms are governed by the laws of the State of <strong>Texas</strong>,
              without regard to its conflict-of-law principles.
            </p>
            <h3>Informal resolution</h3>
            <p>
              Before filing a formal claim, you agree to contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and attempt to
              resolve the dispute informally. We will respond within 30 days.
            </p>
            <h3>Binding arbitration</h3>
            <p>
              If informal resolution fails, any dispute shall be resolved by binding
              individual arbitration under the rules of the American Arbitration
              Association (AAA), conducted in Fort Worth, Texas. <strong>You waive any right
              to a jury trial and to participate in a class action.</strong>
            </p>
            <h3>Changes to these Terms</h3>
            <p>
              We may update these Terms at any time. We will notify you of material
              changes by email and by posting the updated Terms with a new &quot;Last updated&quot;
              date. Your continued use of the Service after the effective date constitutes
              acceptance of the revised Terms.
            </p>
            <div className="contact-card">
              <h3>Legal inquiries</h3>
              <p>
                For questions about these Terms, please contact us:
              </p>
              <p style={{ marginTop: "0.75rem" }}>
                <strong style={{ color: "#e2e8f0" }}>{COMPANY}</strong><br />
                Legal Department<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
                Fort Worth, Texas, USA
              </p>
            </div>
          </Section>

        </main>
      </div>

      {/* ── Footer (mirrors Privacy Policy footer) ── */}
      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <div className="pp-footer-grid">
            <div className="pp-footer-brand">
              <span className="logo">EZ <span>Ledgr</span></span>
              <p>The back office for modern small businesses.</p>
            </div>
            <div className="pp-footer-col">
              <h4>Product</h4>
              <ul>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#pricing">Pricing</Link></li>
                <li><Link href="#">Changelog</Link></li>
              </ul>
            </div>
            <div className="pp-footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="#">About</Link></li>
                <li><Link href="#">Blog</Link></li>
                <li><Link href="#">Careers</Link></li>
              </ul>
            </div>
            <div className="pp-footer-col">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>
            <div className="pp-footer-col">
              <h4>Support</h4>
              <ul>
                <li><Link href="#">Help center</Link></li>
                <li><Link href="#">Contact</Link></li>
                <li><Link href="#">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="pp-footer-bottom">
            © 2026 EZ Ledgr · {COMPANY} · All rights reserved. · Made for small business owners, by small business owners.
          </div>
        </div>
      </footer>
    </>
  );
}
