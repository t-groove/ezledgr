// src/app/security/page.tsx
// Security trust page for EZ Ledgr
// Matches the exact design pattern of privacy/page.tsx and terms/page.tsx
// Deploy at: www.ezledgr.com/security

import Link from "next/link";

const LAST_UPDATED = "March 22, 2026";
const COMPANY = "Scalable Innovations LLC";
const BRAND = "EZ Ledgr";
const DOMAIN = "www.ezledgr.com";
const SECURITY_EMAIL = "security@scalable-innovations.com";

const TOC_ITEMS = [
  { id: "overview",        label: "1. Security Overview" },
  { id: "infrastructure",  label: "2. Infrastructure & Hosting" },
  { id: "encryption",      label: "3. Encryption" },
  { id: "access-control",  label: "4. Access Control & MFA" },
  { id: "financial-data",  label: "5. Financial Data (Plaid)" },
  { id: "vulnerability",   label: "6. Vulnerability Management" },
  { id: "incident",        label: "7. Incident Response" },
  { id: "compliance",      label: "8. Compliance & Auditing" },
  { id: "employee",        label: "9. Employee Security" },
  { id: "disclosure",      label: "10. Responsible Disclosure" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sec-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="check-item">
      <span className="check-icon">✓</span>
      <span>{children}</span>
    </li>
  );
}

function ControlCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="control-card">
      <div className="control-icon">{icon}</div>
      <div className="control-title">{title}</div>
      <div className="control-body">{children}</div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <>
      <style>{`
        :root {
          --navy:   #0f172a;
          --navy2:  #1e293b;
          --accent: #3b82f6;
          --accent2:#2563eb;
          --green:  #22c55e;
          --text:   #1e293b;
          --muted:  #64748b;
          --border: #e2e8f0;
          --bg:     #f8fafc;
          --white:  #ffffff;
          --radius: 12px;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav (identical to privacy/terms) ── */
        .sec-nav {
          background: var(--navy); display: flex; align-items: center;
          justify-content: space-between; padding: 0 2rem; height: 64px;
          position: sticky; top: 0; z-index: 50;
        }
        .sec-nav-logo { color: #fff; font-size: 1.25rem; font-weight: 700;
          text-decoration: none; letter-spacing: -0.02em; }
        .sec-nav-logo span { color: var(--accent); }
        .sec-nav-links { display: flex; gap: 2rem; list-style: none; }
        .sec-nav-links a { color: #cbd5e1; text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
        .sec-nav-links a:hover { color: #fff; }
        .sec-nav-cta { display: flex; gap: 0.75rem; align-items: center; }
        .sec-nav-signin { color: #cbd5e1; text-decoration: none; font-size: 0.875rem; }
        .sec-nav-btn { background: var(--accent); color: #fff; padding: 0.5rem 1.25rem;
          border-radius: 8px; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
        .sec-nav-btn:hover { background: var(--accent2); }

        /* ── Hero ── */
        .sec-hero {
          background: var(--navy); padding: 4rem 2rem 3rem;
          text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .sec-badge {
          display: inline-block; background: rgba(34,197,94,0.12);
          border: 1px solid rgba(34,197,94,0.25); color: #86efac;
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.35rem 0.9rem;
          border-radius: 999px; margin-bottom: 1.25rem;
        }
        .sec-hero h1 { color: #fff; font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
        .sec-hero p { color: #94a3b8; font-size: 1rem; max-width: 560px;
          margin: 0 auto 1.75rem; line-height: 1.7; }
        .sec-hero-meta {
          display: inline-flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 0.75rem 1.5rem; color: #64748b; font-size: 0.8rem;
        }
        .sec-hero-meta strong { color: #cbd5e1; font-weight: 600; }

        /* ── Posture cards (top of page) ── */
        .posture-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem; margin-bottom: 2.5rem;
        }
        .posture-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1.25rem 1rem; text-align: center;
        }
        .posture-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .posture-label { font-size: 0.8rem; font-weight: 700; color: var(--text); margin-bottom: 0.2rem; }
        .posture-value { font-size: 0.75rem; color: var(--muted); }
        .posture-badge {
          display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0;
          color: #166534; font-size: 0.7rem; font-weight: 700;
          padding: 2px 8px; border-radius: 999px; margin-top: 0.4rem;
        }

        /* ── Layout ── */
        .sec-layout {
          max-width: 1100px; margin: 0 auto; padding: 3rem 1.5rem 5rem;
          display: grid; grid-template-columns: 220px 1fr; gap: 3rem; align-items: start;
        }
        @media (max-width: 768px) { .sec-layout { grid-template-columns: 1fr; } .sec-toc, .sec-nav-links { display: none; } }

        /* ── TOC sidebar ── */
        .sec-toc {
          position: sticky; top: 80px; background: var(--white);
          border: 1px solid var(--border); border-radius: var(--radius);
          padding: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .sec-toc h3 { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 1rem; }
        .sec-toc ul { list-style: none; }
        .sec-toc li + li { margin-top: 0.2rem; }
        .sec-toc a { display: block; font-size: 0.78rem; color: var(--muted);
          text-decoration: none; padding: 0.28rem 0.5rem; border-radius: 6px; transition: all 0.15s; line-height: 1.4; }
        .sec-toc a:hover { background: #f0fdf4; color: #166534; }

        /* ── Section content ── */
        .sec-section { margin-bottom: 2.75rem; padding-bottom: 2.75rem; border-bottom: 1px solid var(--border); }
        .sec-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .sec-section h2 { font-size: 1.25rem; font-weight: 700; color: var(--text);
          margin-bottom: 1rem; letter-spacing: -0.02em; }
        .sec-section h3 { font-size: 0.95rem; font-weight: 700; color: var(--text); margin: 1.5rem 0 0.6rem; }
        .sec-section p { color: #475569; font-size: 0.9375rem; line-height: 1.75; margin-bottom: 0.9rem; }
        .sec-section p:last-child { margin-bottom: 0; }
        .sec-section a { color: var(--accent2); text-decoration: underline; text-underline-offset: 2px; }

        /* ── Checklist ── */
        .check-list { list-style: none; padding: 0; margin: 0.5rem 0 0.9rem; display: flex; flex-direction: column; gap: 0.45rem; }
        .check-item { display: flex; align-items: flex-start; gap: 0.6rem;
          color: #475569; font-size: 0.9rem; line-height: 1.6; }
        .check-icon { color: var(--green); font-size: 0.8rem; margin-top: 3px; flex-shrink: 0; font-weight: 700; }

        /* ── Control cards grid ── */
        .control-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .control-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.1rem; }
        .control-icon { font-size: 1.25rem; margin-bottom: 0.4rem; }
        .control-title { font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.3rem; }
        .control-body { font-size: 0.8rem; color: var(--muted); line-height: 1.55; }

        /* ── Callouts ── */
        .callout { border-radius: 10px; padding: 1rem 1.25rem; margin: 1rem 0; font-size: 0.9rem; line-height: 1.65; }
        .callout-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .callout-blue  { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

        /* ── Encryption table ── */
        .enc-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
        .enc-table th { background: #f1f5f9; color: var(--text); font-weight: 700;
          padding: 10px 14px; text-align: left; border: 1px solid var(--border); }
        .enc-table td { padding: 10px 14px; border: 1px solid var(--border); color: #475569; vertical-align: top; }
        .enc-table tr:nth-child(even) td { background: #f8fafc; }
        .enc-status { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0;
          color: #166534; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }

        /* ── Disclosure card ── */
        .disclosure-card {
          background: var(--navy); border-radius: var(--radius);
          padding: 1.75rem; color: #e2e8f0; margin-top: 1rem;
        }
        .disclosure-card h3 { color: #fff !important; margin-top: 0 !important; font-size: 1.05rem; }
        .disclosure-card p { color: #94a3b8 !important; font-size: 0.875rem !important; }
        .disclosure-card a { color: #93c5fd !important; }
        .disclosure-steps { list-style: none; padding: 0; margin: 0.75rem 0; counter-reset: steps; display: flex; flex-direction: column; gap: 0.5rem; }
        .disclosure-steps li { display: flex; gap: 0.75rem; align-items: flex-start; color: #94a3b8; font-size: 0.85rem; line-height: 1.55; }
        .step-num { background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 0.7rem; font-weight: 700;
          width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; margin-top: 1px; }

        /* ── Footer (identical to privacy/terms) ── */
        .sec-footer { background: var(--navy); color: #64748b; padding: 3rem 2rem 2rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .sec-footer-inner { max-width: 1100px; margin: 0 auto; }
        .sec-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem; }
        @media (max-width: 768px) { .sec-footer-grid { grid-template-columns: 1fr 1fr; } }
        .sec-footer-brand .logo { color: #fff; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; display: block; }
        .sec-footer-brand .logo span { color: var(--accent); }
        .sec-footer-brand p { font-size: 0.8rem; line-height: 1.6; color: #475569; max-width: 220px; }
        .sec-footer-col h4 { color: #e2e8f0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.9rem; }
        .sec-footer-col ul { list-style: none; }
        .sec-footer-col li + li { margin-top: 0.5rem; }
        .sec-footer-col a { color: #64748b; text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
        .sec-footer-col a:hover { color: #e2e8f0; }
        .sec-footer-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1.5rem; font-size: 0.75rem; color: #334155; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="sec-nav">
        <Link href="/" className="sec-nav-logo">EZ <span>Ledgr</span></Link>
        <ul className="sec-nav-links">
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/#how-it-works">How it works</Link></li>
        </ul>
        <div className="sec-nav-cta">
          <Link href="/sign-in" className="sec-nav-signin">Sign in</Link>
          <Link href="/sign-up" className="sec-nav-btn">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="sec-hero">
        <div className="sec-badge">🔒 Security</div>
        <h1>Security at EZ Ledgr</h1>
        <p>
          We handle sensitive financial data on behalf of small business owners.
          Here is a transparent overview of how we protect it — from encryption
          standards to access controls to responsible disclosure.
        </p>
        <div className="sec-hero-meta">
          <div><strong>Company</strong>&nbsp; {COMPANY}</div>
          <div><strong>Last updated</strong>&nbsp; {LAST_UPDATED}</div>
          <div><strong>Contact</strong>&nbsp; <a href={`mailto:${SECURITY_EMAIL}`} style={{ color: "#93c5fd" }}>{SECURITY_EMAIL}</a></div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sec-layout">

        {/* Sidebar TOC */}
        <aside className="sec-toc">
          <h3>Contents</h3>
          <ul>
            {TOC_ITEMS.map((item) => (
              <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>
            ))}
          </ul>
        </aside>

        {/* Main content */}
        <main>

          {/* Security posture snapshot */}
          <div className="posture-grid">
            <div className="posture-card">
              <div className="posture-icon">🔐</div>
              <div className="posture-label">Encryption</div>
              <div className="posture-value">In transit &amp; at rest</div>
              <div className="posture-badge">AES-256 + TLS 1.3</div>
            </div>
            <div className="posture-card">
              <div className="posture-icon">🏗️</div>
              <div className="posture-label">Infrastructure</div>
              <div className="posture-value">Vercel + Supabase</div>
              <div className="posture-badge">SOC 2 backed</div>
            </div>
            <div className="posture-card">
              <div className="posture-icon">🔑</div>
              <div className="posture-label">Authentication</div>
              <div className="posture-value">MFA enforced</div>
              <div className="posture-badge">Required for bank sync</div>
            </div>
            <div className="posture-card">
              <div className="posture-icon">🏦</div>
              <div className="posture-label">Bank connectivity</div>
              <div className="posture-value">Powered by Plaid</div>
              <div className="posture-badge">Read-only access</div>
            </div>
          </div>

          <Section id="overview" title="1. Security Overview">
            <p>
              {COMPANY} operates {BRAND} as a financial management platform for small businesses.
              Because our users connect bank accounts and store transaction data, we treat security
              as a core product requirement — not an afterthought.
            </p>
            <p>
              Our security program is built around five principles: least-privilege access,
              defense in depth, encryption everywhere, continuous monitoring, and transparent
              disclosure. This page summarizes our practices for users, partners, and security
              researchers.
            </p>
            <div className="callout callout-green">
              <strong>Security questions or concerns?</strong> Contact our security team directly
              at <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a>. We respond to all
              security inquiries within 2 business days.
            </div>
          </Section>

          <Section id="infrastructure" title="2. Infrastructure & Hosting">
            <p>
              {BRAND} is built on enterprise-grade cloud infrastructure with strong baseline
              security postures inherited from our platform providers.
            </p>
            <div className="control-grid">
              <ControlCard icon="▲" title="Vercel (Hosting)">
                Application hosting with automatic TLS provisioning, DDoS protection,
                global edge network, and SOC 2 Type II compliance.
              </ControlCard>
              <ControlCard icon="⚡" title="Supabase (Database & Auth)">
                PostgreSQL database with row-level security, hosted on AWS infrastructure.
                SOC 2 Type II certified. Data encrypted at rest and in transit.
              </ControlCard>
              <ControlCard icon="🌐" title="Cloudflare (DNS)">
                DNS and network security layer providing DDoS mitigation, bot protection,
                and additional TLS enforcement.
              </ControlCard>
              <ControlCard icon="📧" title="Resend (Email)">
                Transactional email provider. Used only for account notifications.
                No sensitive financial data is transmitted via email.
              </ControlCard>
            </div>
            <h3>Security headers</h3>
            <p>
              All responses from {BRAND} include the following security headers enforced
              at the edge via Vercel:
            </p>
            <ul className="check-list">
              <CheckItem><strong>Strict-Transport-Security</strong> — HSTS with 2-year max-age and preload, forcing HTTPS on all connections</CheckItem>
              <CheckItem><strong>Content-Security-Policy</strong> — restricts which scripts, styles, and connections the browser may load</CheckItem>
              <CheckItem><strong>X-Frame-Options: DENY</strong> — prevents clickjacking attacks</CheckItem>
              <CheckItem><strong>X-Content-Type-Options: nosniff</strong> — prevents MIME-type sniffing</CheckItem>
              <CheckItem><strong>Referrer-Policy: strict-origin-when-cross-origin</strong> — limits referrer leakage</CheckItem>
              <CheckItem><strong>Permissions-Policy</strong> — disables camera, microphone, and other unused browser APIs</CheckItem>
            </ul>
          </Section>

          <Section id="encryption" title="3. Encryption">
            <p>
              All data handled by {BRAND} is encrypted both in transit and at rest. We do not
              store or transmit sensitive financial data in plaintext under any circumstances.
            </p>
            <table className="enc-table">
              <thead>
                <tr><th>Data</th><th>In Transit</th><th>At Rest</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consumer financial data (Plaid)</td>
                  <td>TLS 1.3</td>
                  <td>AES-256 (Supabase / AWS RDS)</td>
                  <td><span className="enc-status">Active</span></td>
                </tr>
                <tr>
                  <td>User account data</td>
                  <td>TLS 1.3</td>
                  <td>AES-256 (Supabase)</td>
                  <td><span className="enc-status">Active</span></td>
                </tr>
                <tr>
                  <td>Session tokens / JWTs</td>
                  <td>TLS 1.3 (HTTPS only)</td>
                  <td>Signed + encrypted by Supabase Auth</td>
                  <td><span className="enc-status">Active</span></td>
                </tr>
                <tr>
                  <td>API keys &amp; secrets</td>
                  <td>N/A (server-side only)</td>
                  <td>Environment variables — never in source code</td>
                  <td><span className="enc-status">Active</span></td>
                </tr>
                <tr>
                  <td>Backups</td>
                  <td>N/A</td>
                  <td>AES-256 (Supabase automated backups)</td>
                  <td><span className="enc-status">Active</span></td>
                </tr>
              </tbody>
            </table>
            <h3>TLS policy</h3>
            <ul className="check-list">
              <CheckItem>Minimum TLS 1.2 enforced; TLS 1.3 preferred and negotiated by default</CheckItem>
              <CheckItem>TLS 1.0 and 1.1 disabled on all endpoints</CheckItem>
              <CheckItem>All HTTP requests automatically redirected to HTTPS</CheckItem>
              <CheckItem>Certificates auto-renewed via Vercel&apos;s managed certificate infrastructure</CheckItem>
            </ul>
          </Section>

          <Section id="access-control" title="4. Access Control & MFA">
            <h3>Consumer-facing authentication</h3>
            <ul className="check-list">
              <CheckItem>All user accounts are protected with email and password authentication via Supabase Auth</CheckItem>
              <CheckItem>Two-factor authentication (2FA / TOTP) is available to all users from account settings</CheckItem>
              <CheckItem><strong>2FA is required before connecting any bank account</strong> — users without 2FA enabled are directed to enable it before Plaid Link opens</CheckItem>
              <CheckItem>Explicit user consent is obtained and logged (with timestamp) before any financial data is accessed via Plaid</CheckItem>
            </ul>
            <h3>Internal access controls</h3>
            <ul className="check-list">
              <CheckItem>All production systems (Supabase, Vercel, GitHub) require MFA for every team member</CheckItem>
              <CheckItem>Database access is controlled via Supabase Row-Level Security (RLS) — each user can only access their own data</CheckItem>
              <CheckItem>No direct database access from the browser — all queries go through authenticated server-side API routes</CheckItem>
              <CheckItem>API keys and service credentials are stored in environment variables, never committed to source code</CheckItem>
              <CheckItem>Access to production systems is limited to the engineering team on a need-to-know basis</CheckItem>
            </ul>
            <div className="callout callout-blue">
              <strong>Plaid financial data specifically:</strong> Access to the Plaid integration
              and stored financial data is restricted to authenticated requests scoped to the
              individual user&apos;s account. No cross-account data access is possible by design
              due to RLS enforcement at the database layer.
            </div>
          </Section>

          <Section id="financial-data" title="5. Financial Data (Plaid)">
            <p>
              {BRAND} uses <a href="https://plaid.com" target="_blank" rel="noopener noreferrer">Plaid Technologies, Inc.</a> to
              enable bank account connectivity. Plaid is a leading financial data network used
              by thousands of financial applications. Here is how the integration is secured:
            </p>
            <ul className="check-list">
              <CheckItem><strong>Read-only access:</strong> Plaid provides read-only access to transaction and balance data. We cannot and do not initiate transfers or modify your accounts.</CheckItem>
              <CheckItem><strong>Credentials never touch our servers:</strong> Your bank login credentials are entered directly into Plaid&apos;s interface and never transmitted to or stored by {BRAND}.</CheckItem>
              <CheckItem><strong>Explicit consent required:</strong> Users see a clear disclosure of exactly what data will be accessed before connecting any account. Consent is logged with a timestamp.</CheckItem>
              <CheckItem><strong>MFA gate:</strong> Two-factor authentication must be verified before Plaid Link is presented to the user.</CheckItem>
              <CheckItem><strong>Revocable at any time:</strong> Users can disconnect their bank account from Settings at any time, which revokes {BRAND}&apos;s access token.</CheckItem>
              <CheckItem><strong>Data minimization:</strong> We request only the data scopes required for bookkeeping — transactions, balances, and account identifiers.</CheckItem>
            </ul>
            <p>
              Plaid&apos;s own security and privacy practices are described in{" "}
              <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                Plaid&apos;s End User Privacy Policy
              </a>{" "}
              and their{" "}
              <a href="https://plaid.com/safety" target="_blank" rel="noopener noreferrer">
                security documentation
              </a>.
            </p>
          </Section>

          <Section id="vulnerability" title="6. Vulnerability Management">
            <h3>Dependency scanning</h3>
            <ul className="check-list">
              <CheckItem>GitHub Dependabot is enabled on the repository — automated alerts and pull requests for vulnerable dependencies</CheckItem>
              <CheckItem>All third-party packages are reviewed before adoption</CheckItem>
              <CheckItem>Security patches are applied promptly based on severity (critical within 24 hours, high within 7 days)</CheckItem>
            </ul>
            <h3>Code security</h3>
            <ul className="check-list">
              <CheckItem>Source code is hosted on GitHub with branch protection rules on the main branch</CheckItem>
              <CheckItem>All production deployments go through Vercel&apos;s build pipeline — no direct server access</CheckItem>
              <CheckItem>Secrets are managed via environment variables; secret scanning is enabled on the repository</CheckItem>
            </ul>
            <h3>Patching SLAs</h3>
            <div className="control-grid">
              <ControlCard icon="🔴" title="Critical (CVSS 9–10)">24-hour remediation target. Immediate notification to security team.</ControlCard>
              <ControlCard icon="🟠" title="High (CVSS 7–8.9)">7-day remediation target. Tracked as priority issue.</ControlCard>
              <ControlCard icon="🟡" title="Medium (CVSS 4–6.9)">30-day remediation target. Assigned to engineering backlog.</ControlCard>
              <ControlCard icon="🔵" title="Low (CVSS 0.1–3.9)">90-day remediation target. Tracked in security log.</ControlCard>
            </div>
          </Section>

          <Section id="incident" title="7. Incident Response">
            <p>
              {COMPANY} maintains an incident response process for security events affecting
              user data or platform availability.
            </p>
            <ul className="check-list">
              <CheckItem><strong>Detection:</strong> Security events are identified via platform monitoring, user reports, or third-party notifications</CheckItem>
              <CheckItem><strong>Containment:</strong> Affected systems are isolated and access revoked as appropriate within hours of confirmed incident</CheckItem>
              <CheckItem><strong>Notification:</strong> Affected users are notified by email within 72 hours of a confirmed data breach, in accordance with applicable law</CheckItem>
              <CheckItem><strong>Post-incident review:</strong> All significant incidents result in a written post-mortem and remediation plan</CheckItem>
            </ul>
            <p>
              To report a suspected security incident or breach, contact{" "}
              <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> immediately.
              Include as much detail as possible about what you observed.
            </p>
          </Section>

          <Section id="compliance" title="8. Compliance & Auditing">
            <p>
              {BRAND} is built on infrastructure from providers with strong compliance
              certifications. Our security practices are aligned with the following frameworks:
            </p>
            <div className="control-grid">
              <ControlCard icon="📋" title="SOC 2 (via Supabase)">
                Supabase is SOC 2 Type II certified. Database infrastructure, access controls,
                and availability are covered under their certification.
              </ControlCard>
              <ControlCard icon="📋" title="SOC 2 (via Vercel)">
                Vercel is SOC 2 Type II certified. Application hosting, deployment pipelines,
                and edge network security are covered.
              </ControlCard>
              <ControlCard icon="🏦" title="Plaid Compliance">
                {BRAND} is completing Plaid&apos;s security questionnaire. Our security practices are designed to meet
                Plaid&apos;s requirements for applications using their financial data APIs.
              </ControlCard>
              <ControlCard icon="🔒" title="GLBA Alignment">
                As a platform handling consumer financial data, our policies are aligned with
                the Gramm-Leach-Bliley Act safeguards rule requirements.
              </ControlCard>
            </div>
            <h3>Audit logging</h3>
            <ul className="check-list">
              <CheckItem>All Plaid consent grants are logged with user ID and timestamp</CheckItem>
              <CheckItem>Authentication events (sign-in, MFA verification, password changes) are logged by Supabase Auth</CheckItem>
              <CheckItem>Application logs are retained for 90 days then automatically purged</CheckItem>
            </ul>
          </Section>

          <Section id="employee" title="9. Employee Security">
            <ul className="check-list">
              <CheckItem>All team members complete security awareness training upon onboarding</CheckItem>
              <CheckItem>MFA is required on all accounts with access to production systems — Supabase, Vercel, GitHub, and cloud infrastructure</CheckItem>
              <CheckItem>Access to production systems follows the principle of least privilege — team members receive only the minimum access required for their role</CheckItem>
              <CheckItem>All team members operate under a security and confidentiality agreement</CheckItem>
              <CheckItem>Access is revoked within 24 hours of a team member&apos;s departure</CheckItem>
            </ul>
          </Section>

          <Section id="disclosure" title="10. Responsible Disclosure">
            <p>
              We welcome responsible disclosure of security vulnerabilities from the security
              research community. If you have discovered a potential security issue in {BRAND},
              please report it to us before making it public.
            </p>
            <div className="disclosure-card">
              <h3>How to report a vulnerability</h3>
              <ol className="disclosure-steps">
                <li><span className="step-num">1</span> Email a description of the vulnerability to <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a></li>
                <li><span className="step-num">2</span> Include steps to reproduce, potential impact, and any relevant screenshots or proof-of-concept</li>
                <li><span className="step-num">3</span> We will acknowledge your report within <strong style={{ color: "#cbd5e1" }}>2 business days</strong></li>
                <li><span className="step-num">4</span> We will provide a resolution timeline based on severity within <strong style={{ color: "#cbd5e1" }}>7 days</strong></li>
                <li><span className="step-num">5</span> We ask that you allow us reasonable time to remediate before public disclosure</li>
              </ol>
              <p style={{ marginTop: "1rem" }}>
                We do not currently offer a bug bounty program, but we genuinely appreciate
                responsible disclosures and will acknowledge researchers who help improve
                our security.
              </p>
            </div>
            <h3>Scope</h3>
            <p>In-scope for vulnerability reports:</p>
            <ul className="check-list">
              <CheckItem>Authentication and authorization vulnerabilities on ezledgr.com</CheckItem>
              <CheckItem>Data exposure or cross-account access vulnerabilities</CheckItem>
              <CheckItem>Injection attacks (SQL, XSS, CSRF) on any {BRAND} endpoint</CheckItem>
              <CheckItem>Security misconfigurations affecting user data</CheckItem>
            </ul>
          </Section>

        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="sec-footer">
        <div className="sec-footer-inner">
          <div className="sec-footer-grid">
            <div className="sec-footer-brand">
              <span className="logo">EZ <span>Ledgr</span></span>
              <p>The back office for modern small businesses.</p>
            </div>
            <div className="sec-footer-col">
              <h4>Product</h4>
              <ul><li><Link href="/#features">Features</Link></li><li><Link href="/#pricing">Pricing</Link></li><li><Link href="#">Changelog</Link></li></ul>
            </div>
            <div className="sec-footer-col">
              <h4>Company</h4>
              <ul><li><Link href="#">About</Link></li><li><Link href="#">Blog</Link></li><li><Link href="#">Careers</Link></li></ul>
            </div>
            <div className="sec-footer-col">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/security" style={{ color: "#86efac" }}>Security</Link></li>
              </ul>
            </div>
            <div className="sec-footer-col">
              <h4>Support</h4>
              <ul><li><Link href="#">Help center</Link></li><li><Link href="#">Contact</Link></li><li><Link href="#">Status</Link></li></ul>
            </div>
          </div>
          <div className="sec-footer-bottom">
            © 2026 EZ Ledgr · {COMPANY} · All rights reserved. · Made for small business owners, by small business owners.
          </div>
        </div>
      </footer>
    </>
  );
}
