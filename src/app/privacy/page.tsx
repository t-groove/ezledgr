// app/privacy/page.tsx
// Drop this file into your Next.js project at the path above.
// It matches EZ Ledgr's existing nav, footer, and visual style exactly.
// Update LAST_UPDATED if you revise the policy.

import Link from "next/link";

const LAST_UPDATED = "March 22, 2026";
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
  { id: "information-we-collect",   label: "1. Information We Collect" },
  { id: "how-we-use",               label: "2. How We Use Your Information" },
  { id: "financial-data",           label: "3. Financial Data & Plaid" },
  { id: "sharing",                  label: "4. How We Share Information" },
  { id: "data-security",            label: "5. Data Security" },
  { id: "retention",                label: "6. Data Retention & Deletion" },
  { id: "your-rights",              label: "7. Your Rights" },
  { id: "cookies",                  label: "8. Cookies & Tracking" },
  { id: "children",                 label: "9. Children's Privacy" },
  { id: "changes",                  label: "10. Changes to This Policy" },
  { id: "contact",                  label: "11. Contact Us" },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PrivacyPage() {
  return (
    <>
      {/* ── Inline styles (no Tailwind needed; matches site's color tokens) ── */}
      <style>{`
        /* ── Tokens matching EZ Ledgr's palette ── */
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

        /* ── Reset / base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav (mirrors site header) ── */
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

        /* ── Hero band ── */
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

        /* ── Layout ── */
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

        /* ── Table of Contents (sticky sidebar) ── */
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

        /* ── Policy content ── */
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

        /* ── Callout boxes ── */
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

        /* ── Rights grid ── */
        .rights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .right-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem;
        }
        .right-card-icon {
          font-size: 1.25rem;
          margin-bottom: 0.4rem;
        }
        .right-card h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.3rem;
        }
        .right-card p {
          font-size: 0.8rem !important;
          color: var(--muted) !important;
          margin: 0 !important;
          line-height: 1.5 !important;
        }

        /* ── Contact card ── */
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

        /* ── Footer (mirrors site footer) ── */
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
        <h1>Privacy Policy</h1>
        <p>
          We believe in plain language. This policy explains exactly what data we collect,
          why we collect it, and what control you have over it.
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

        {/* Policy content */}
        <main className="pp-content">

          <Section id="information-we-collect" title="1. Information We Collect">
            <h3>Information you provide directly</h3>
            <ul>
              <li><strong>Account information:</strong> name, email address, and password when you create an account.</li>
              <li><strong>Business information:</strong> business name, entity type, state of incorporation, and EIN (for tax filing features).</li>
              <li><strong>Payment information:</strong> billing details for your {BRAND} subscription (processed by our payment provider; we do not store card numbers).</li>
              <li><strong>Communications:</strong> any messages you send to our support team.</li>
            </ul>

            <h3>Financial data (via Plaid)</h3>
            <p>
              When you connect your bank account, we use <strong>Plaid Technologies, Inc.</strong> to
              retrieve your financial data. With your explicit consent, we may collect:
            </p>
            <ul>
              <li>Account balances and account identifiers</li>
              <li>Transaction history (descriptions, amounts, dates, merchant names)</li>
              <li>Account type and institution name</li>
            </ul>
            <p>
              We do <strong>not</strong> collect or store your bank login credentials.
              Plaid handles authentication directly with your financial institution using
              read-only access. See Section 3 for full details.
            </p>

            <h3>Automatically collected information</h3>
            <ul>
              <li>IP address, browser type, and device information</li>
              <li>Pages visited, features used, and time spent in the app</li>
              <li>Error logs and performance data</li>
            </ul>
          </Section>

          <Section id="how-we-use" title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li><strong>Provide the service:</strong> power bookkeeping, invoicing, bank sync, mileage tracking, tax filing, and all other {BRAND} features.</li>
              <li><strong>Categorize transactions:</strong> automatically classify expenses and income in your ledger.</li>
              <li><strong>Send you important notices:</strong> account confirmations, payment receipts, and security alerts.</li>
              <li><strong>Improve the product:</strong> analyze usage patterns to fix bugs and build new features.</li>
              <li><strong>Comply with legal obligations:</strong> respond to lawful government requests and fulfill our regulatory duties.</li>
            </ul>
            <div className="callout callout-blue">
              <strong>We do not sell your personal data.</strong> We do not sell, rent, or share
              your personal or financial information with third parties for their own marketing purposes.
            </div>
          </Section>

          <Section id="financial-data" title="3. Financial Data & Plaid">
            <p>
              {BRAND} uses <a href="https://plaid.com" target="_blank" rel="noopener noreferrer">Plaid</a> to
              enable secure bank connections. When you choose to connect a financial account:
            </p>
            <ul>
              <li>You will be shown a clear disclosure and asked for your explicit consent before any data is retrieved.</li>
              <li>Plaid connects directly to your financial institution using read-only access — we cannot move money or make changes to your accounts.</li>
              <li>Your bank credentials are never shared with or stored by {BRAND}.</li>
              <li>Financial data retrieved through Plaid is encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
              <li>Access to your financial data is limited to the {BRAND} engineering team on a strict need-to-know basis, protected by multi-factor authentication.</li>
            </ul>
            <div className="callout callout-green">
              <strong>You are in control.</strong> You can disconnect your bank account at any time
              from your account settings. Upon disconnection, we will stop retrieving new data.
              You may also request deletion of your stored financial data (see Section 6).
            </div>
            <p>
              Plaid&apos;s handling of your data is governed by{" "}
              <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                Plaid&apos;s End User Privacy Policy
              </a>.
            </p>
          </Section>

          <Section id="sharing" title="4. How We Share Information">
            <p>We share your information only in these limited circumstances:</p>
            <h3>Service providers</h3>
            <p>
              We work with trusted third-party service providers who process data on our behalf
              under strict data processing agreements. These include:
            </p>
            <ul>
              <li><strong>Plaid</strong> — bank account connectivity</li>
              <li><strong>Supabase</strong> — database and authentication infrastructure</li>
              <li><strong>Vercel</strong> — application hosting</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Stripe</strong> — payment processing</li>
            </ul>
            <h3>Legal requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or to protect
              the safety and rights of our users or the public.
            </p>
            <h3>Business transfers</h3>
            <p>
              If {COMPANY} is acquired or merged with another company, your information may
              be transferred. We will notify you before your data is subject to a different
              privacy policy.
            </p>
            <div className="callout callout-yellow">
              <strong>We never sell your data.</strong> We will never sell or trade your personal
              or financial information to data brokers, advertisers, or other third parties.
            </div>
          </Section>

          <Section id="data-security" title="5. Data Security">
            <p>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul>
              <li><strong>Encryption in transit:</strong> All data between your browser and our servers is encrypted using TLS 1.2 or higher.</li>
              <li><strong>Encryption at rest:</strong> All consumer financial data is stored using AES-256 encryption.</li>
              <li><strong>Access controls:</strong> Production systems are protected by multi-factor authentication and role-based access control. Only authorized personnel can access your data.</li>
              <li><strong>Vulnerability management:</strong> We regularly scan our systems and perform annual third-party security testing.</li>
              <li><strong>Incident response:</strong> We maintain a documented incident response plan and will notify affected users promptly in the event of a breach.</li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. If you discover a security
              vulnerability, please report it to{" "}
              <a href={`mailto:security@scalable-innovations.com`}>security@scalable-innovations.com</a>.
            </p>
          </Section>

          <Section id="retention" title="6. Data Retention & Deletion">
            <h3>How long we keep your data</h3>
            <ul>
              <li><strong>Account data:</strong> Retained while your account is active and for 2 years after closure.</li>
              <li><strong>Financial transaction data:</strong> Retained for 7 years to satisfy financial recordkeeping requirements, then securely deleted.</li>
              <li><strong>Application logs:</strong> Automatically purged after 90 days.</li>
            </ul>
            <h3>Requesting deletion</h3>
            <p>
              You can request deletion of your account and personal data at any time by:
            </p>
            <ul>
              <li>Contacting us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to request account deletion</li>
            </ul>
            <p>
              We will complete your deletion request within <strong>30 days</strong> and
              send you a confirmation. Note that some data may be retained where required
              by law (e.g., tax records) or to resolve active disputes.
            </p>
          </Section>

          <Section id="your-rights" title="7. Your Rights">
            <p>
              Depending on your location, you may have the following rights regarding
              your personal data:
            </p>
            <div className="rights-grid">
              {[
                { icon: "👁️", title: "Access", desc: "Request a copy of the personal data we hold about you." },
                { icon: "✏️", title: "Correction", desc: "Request correction of inaccurate or incomplete data." },
                { icon: "🗑️", title: "Deletion", desc: "Request deletion of your personal data (subject to legal exceptions)." },
                { icon: "📦", title: "Portability", desc: "Receive your data in a structured, machine-readable format." },
                { icon: "🚫", title: "Opt-Out", desc: "Opt out of any sale or sharing of personal data (we don't sell data)." },
                { icon: "⏸️", title: "Restriction", desc: "Request that we limit processing of your data in certain circumstances." },
              ].map((r) => (
                <div className="right-card" key={r.title}>
                  <div className="right-card-icon">{r.icon}</div>
                  <h4>{r.title}</h4>
                  <p>{r.desc}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: "1rem" }}>
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              We will respond within <strong>30 days</strong>. We may need to verify
              your identity before processing certain requests.
            </p>
            <p>
              California residents have additional rights under the CCPA/CPRA.
              Texas residents may have rights under the Texas Data Privacy and Security Act (TDPSA).
              We honor these rights for all eligible users.
            </p>
          </Section>

          <Section id="cookies" title="8. Cookies & Tracking">
            <p>
              We use cookies and similar technologies to keep you signed in, remember your
              preferences, and understand how the product is used. We do not use third-party
              advertising cookies.
            </p>
            <ul>
              <li><strong>Essential cookies:</strong> Required for authentication and security. Cannot be disabled.</li>
              <li><strong>Analytics cookies:</strong> Help us understand feature usage and improve the product. You can opt out in your account settings.</li>
            </ul>
          </Section>

          <Section id="children" title="9. Children's Privacy">
            <p>
              {BRAND} is designed for small business owners and is not directed at children
              under 13. We do not knowingly collect personal information from anyone under 13.
              If you believe we have inadvertently collected such information, please contact
              us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="changes" title="10. Changes to This Policy">
            <p>
              We may update this policy periodically. When we make material changes, we will:
            </p>
            <ul>
              <li>Update the &quot;Last updated&quot; date at the top of this page</li>
              <li>Send an email notification to your registered address</li>
              <li>Display an in-app banner for 30 days after the change</li>
            </ul>
            <p>
              Your continued use of {BRAND} after the effective date of any changes
              constitutes your acceptance of the updated policy.
            </p>
          </Section>

          <Section id="contact" title="11. Contact Us">
            <div className="contact-card">
              <h3>Privacy inquiries</h3>
              <p>
                For questions, requests, or concerns about this policy or your personal data,
                please contact our Privacy Officer:
              </p>
              <p style={{ marginTop: "0.75rem" }}>
                <strong style={{ color: "#e2e8f0" }}>{COMPANY}</strong><br />
                Privacy Officer<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
                Fort Worth, Texas, USA
              </p>
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                We aim to respond to all privacy inquiries within <strong style={{ color: "#cbd5e1" }}>2 business days</strong>.
              </p>
            </div>
          </Section>

        </main>
      </div>

      {/* ── Footer (mirrors site footer) ── */}
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
