import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ShieldCheck } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | GraceNotes Daily" },
      { name: "description", content: "GraceNotes Daily Privacy Policy. How we collect, use, and protect your personal data, including your journal entries, prayers, and spiritual reflections." },
    ],
  }),
  component: Privacy,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl text-grace">{title}</h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground/75 leading-relaxed text-sm">{children}</p>;
}

function Privacy() {
  const updated = "May 25, 2026";
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
      </header>
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 text-foreground space-y-8">
          <div className="space-y-2">
            <ShieldCheck className="w-7 h-7 text-grace" />
            <h1 className="font-display text-4xl text-grace">Privacy Policy</h1>
            <p className="text-sm text-foreground/55">Last updated: {updated}</p>
            <P>
              GraceNotes Daily is built around a simple conviction: what you write to God stays between you and God. This Privacy Policy explains in plain terms what personal information we collect, why we collect it, how we protect it, and what rights you have over it. It applies to all users of the GraceNotes Daily web application and any future mobile applications accessible at gracenotesdaily.com.
            </P>
            <P>
              Please read this policy carefully. By creating an account or using GraceNotes Daily, you acknowledge that you have read and understood it.
            </P>
          </div>

          <Section title="1. Who We Are">
            <P>
              GraceNotes Daily ("we," "us," or "our") is operated by GraceNotes Daily and accessible at https://www.gracenotesdaily.com. For privacy-related enquiries, you may contact us at privacy@gracenotesdaily.com.
            </P>
            <P>
              For users in the European Economic Area (EEA) or United Kingdom, GraceNotes Daily acts as the data controller of your personal data as defined under the General Data Protection Regulation (GDPR) and the UK GDPR.
            </P>
          </Section>

          <Section title="2. What Personal Data We Collect">
            <P>We collect the following categories of personal data:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li><strong>Account information:</strong> Your name, email address, and authentication credentials. If you sign in via Google OAuth, we receive your name, email address, and profile image from Google.</li>
              <li><strong>Profile and preference data:</strong> Your faith phase (exploring, growing, or deepening), preferred daily rhythms (morning, midday, evening, night), current life seasons, tone preferences, Bible translation preference, and time zone. You provide this during onboarding and may update it in Settings.</li>
              <li><strong>User-generated spiritual content:</strong> Heart Notes (daily journal reflections), prayer entries including any you mark as answered, devotional responses, and daily chat messages. This is the most sensitive category of data we hold. It is private by design and is never used for advertising, never sold, and never shared with third parties for their own purposes.</li>
              <li><strong>Usage and habit data:</strong> Daily habit completion records (whether you completed your devotional, daily message, and heart note on a given day), streak counts, and journey archive data. This is used solely to display your progress within the app.</li>
              <li><strong>Device and technical data:</strong> Browser type and version, operating system, IP address, and general geographic location (country/region level only). This data is collected automatically when you access the service and is used for security, fraud prevention, and service improvement.</li>
              <li><strong>Communications:</strong> If you contact us by email or through a contact form, we retain records of that correspondence.</li>
            </ul>
          </Section>

          <Section title="3. How We Collect Your Data">
            <P>We collect data in three ways: (1) directly from you when you create an account, complete onboarding, or use the app; (2) automatically through your use of the service via cookies, server logs, and similar technologies; and (3) from third-party authentication providers (currently Google) when you choose to sign in using those services.</P>
            <P>
              We use session cookies necessary for authentication and service delivery. We do not use advertising cookies or third-party tracking cookies.
            </P>
          </Section>

          <Section title="4. Legal Basis for Processing (GDPR)">
            <P>If you are located in the EEA or UK, we rely on the following legal bases under the GDPR:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li><strong>Contract performance:</strong> Processing your account information and user-generated content is necessary to provide the service you signed up for.</li>
              <li><strong>Legitimate interests:</strong> We process technical and usage data to maintain security, prevent abuse, and improve the service. Our legitimate interests do not override your fundamental rights.</li>
              <li><strong>Legal obligation:</strong> In limited circumstances, we may process data to comply with applicable law.</li>
              <li><strong>Consent:</strong> Where we rely on consent, such as for optional communications, you may withdraw it at any time without affecting prior processing.</li>
            </ul>
          </Section>

          <Section title="5. How We Use Your Data">
            <P>We use your personal data only for the purposes for which it was collected:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li>To provide, personalise, and improve the GraceNotes Daily service</li>
              <li>To generate your daily grace note, devotional, and AI-powered responses, personalised to your profile and spiritual journey</li>
              <li>To maintain your streak, habit records, and journey archive</li>
              <li>To authenticate your identity and maintain account security</li>
              <li>To respond to support enquiries</li>
              <li>To comply with legal obligations</li>
              <li>To send you service-related notifications (never marketing without your explicit consent)</li>
            </ul>
            <P>We do not use your data to build advertising profiles, sell to data brokers, or train AI models on your personal spiritual content.</P>
          </Section>

          <Section title="6. Artificial Intelligence Processing">
            <P>
              GraceNotes Daily uses artificial intelligence to generate personalised spiritual content. Specifically:
            </P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li><strong>Claude by Anthropic:</strong> Used to generate your daily grace note, devotional reading, and responses to heart notes. Your profile data (faith phase, rhythms, seasons, voice preference) is sent to Anthropic's API to personalise generation. The content of your individual journal entries and prayers is not sent to Anthropic unless you are using the heart note response feature, in which case the text of that specific entry is transmitted solely to generate a response for you.</li>
              <li><strong>OpenAI GPT:</strong> Used to generate conversational replies in the daily chat feature. Your chat messages are transmitted to OpenAI's API for this purpose only.</li>
            </ul>
            <P>
              Both Anthropic and OpenAI are contractually prohibited from using API inputs to train their models unless you separately consent through their own platforms. Your spiritual content is processed for the sole purpose of generating your personalised response and is not retained by these providers beyond the context of each request.
            </P>
            <P>
              AI-generated content in GraceNotes Daily is for personal spiritual enrichment only. It is not a substitute for pastoral care, professional counselling, or medical advice. We make no representations that AI-generated devotionals or grace notes are doctrinally authoritative.
            </P>
          </Section>

          <Section title="7. Third-Party Service Providers">
            <P>We share limited personal data with the following categories of trusted third-party providers, solely to operate the service:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li><strong>Supabase:</strong> Our database and authentication infrastructure provider. Your account data, user-generated content, and habit data are stored in Supabase. Supabase is SOC 2 Type II compliant and encrypts data at rest and in transit.</li>
              <li><strong>Cloudflare:</strong> Our hosting and edge delivery provider. Cloudflare processes technical request data (IP addresses, headers) as part of delivering the service and providing security protections.</li>
              <li><strong>Google (OAuth):</strong> If you sign in with Google, Google processes your authentication. We receive only your name, email, and profile image.</li>
              <li><strong>Anthropic:</strong> AI model provider. See Section 6 above.</li>
              <li><strong>OpenAI:</strong> AI model provider. See Section 6 above.</li>
              <li><strong>Future payment processors:</strong> We anticipate introducing premium subscription features and an in-app store in future. If and when payments are enabled, they will be processed by a PCI DSS-compliant payment provider such as Stripe. GraceNotes Daily will not store your full card number or payment credentials. We will update this policy and notify you before any payment processing begins.</li>
            </ul>
            <P>We do not sell your data to any third party. We do not share your personal data with advertisers, data brokers, or analytics companies for their own commercial use.</P>
          </Section>

          <Section title="8. International Data Transfers">
            <P>
              GraceNotes Daily operates from servers located in the United States. If you are accessing the service from the European Economic Area, United Kingdom, or other jurisdictions with data protection laws, your personal data will be transferred to and processed in the United States.
            </P>
            <P>
              Where required by applicable law, such transfers are made subject to appropriate safeguards including Standard Contractual Clauses (SCCs) approved by the European Commission, or equivalent mechanisms under UK law. You may request details of the transfer mechanisms in place by contacting us at privacy@gracenotesdaily.com.
            </P>
          </Section>

          <Section title="9. Data Retention">
            <P>
              We retain your personal data for as long as your account is active or as needed to provide the service. If you delete your account, your personal data including all journal entries, prayers, and heart notes will be permanently deleted within 30 days of your deletion request, except where retention is required to comply with a legal obligation or to resolve a dispute.
            </P>
            <P>
              Anonymised, aggregated usage statistics that cannot identify you personally may be retained indefinitely for service improvement purposes.
            </P>
          </Section>

          <Section title="10. Your Rights">
            <P>Depending on your location, you may have the following rights regarding your personal data:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li><strong>Right of access:</strong> You may request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> You may request correction of inaccurate data. Most profile data can be updated directly in Settings.</li>
              <li><strong>Right to erasure ("right to be forgotten"):</strong> You may request deletion of your personal data. You can delete your account directly in Settings, which initiates permanent deletion of all your content.</li>
              <li><strong>Right to data portability:</strong> You may request your personal data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> You may object to processing based on legitimate interests.</li>
              <li><strong>Right to restrict processing:</strong> You may request that we limit how we use your data in certain circumstances.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
              <li><strong>Right to lodge a complaint:</strong> You have the right to lodge a complaint with your local data protection authority. In the EU, this is your national supervisory authority. In the UK, this is the Information Commissioner's Office (ICO) at ico.org.uk.</li>
            </ul>
            <P>To exercise any of these rights, contact us at privacy@gracenotesdaily.com. We will respond within 30 days.</P>
          </Section>

          <Section title="11. Data Security">
            <P>
              We implement industry-standard technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction. These include:
            </P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li>Encryption of all data in transit using TLS 1.2 or higher</li>
              <li>Encryption of data at rest in our database infrastructure</li>
              <li>Row-level security policies ensuring no user can access another user's data</li>
              <li>Access controls limiting which personnel can access production systems</li>
              <li>Authentication through industry-standard OAuth 2.0 protocols</li>
            </ul>
            <P>
              No method of transmission over the internet or electronic storage is 100% secure. While we take robust precautions, we cannot guarantee absolute security. In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the relevant supervisory authority as required by applicable law.
            </P>
          </Section>

          <Section title="12. Children's Privacy">
            <P>
              GraceNotes Daily is not directed at children under the age of 13 (or 16 in certain EEA jurisdictions). We do not knowingly collect personal data from children below these ages. If you believe a child has provided us with personal data without appropriate consent, please contact us at privacy@gracenotesdaily.com and we will delete it promptly.
            </P>
          </Section>

          <Section title="13. Future Commerce and Payments">
            <P>
              GraceNotes Daily may introduce premium subscription tiers, digital goods, and a curated in-app store featuring Christian products and resources in future. Any such features will be clearly labelled, opt-in, and will not be introduced without advance notice to existing users and an update to this Privacy Policy.
            </P>
            <P>
              If payment processing is introduced, it will be handled by a PCI DSS-compliant third-party provider such as Stripe. GraceNotes Daily will not store full payment card details. Any personal data processed for commerce purposes will be described in an updated version of this policy prior to activation.
            </P>
          </Section>

          <Section title="14. Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email (to the address associated with your account) and display a notice within the app at least 14 days before the changes take effect. Your continued use of GraceNotes Daily after the effective date of any update constitutes acceptance of the revised policy.
            </P>
            <P>The date at the top of this page always reflects when the policy was last updated.</P>
          </Section>

          <Section title="15. Contact Us">
            <P>
              For any questions, requests, or concerns about this Privacy Policy or the handling of your personal data, please contact us:
            </P>
            <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/75">
              <li><strong>Email:</strong> privacy@gracenotesdaily.com</li>
              <li><strong>Website:</strong> https://www.gracenotesdaily.com/contact</li>
            </ul>
            <P>We aim to respond to all privacy-related enquiries within 5 business days.</P>
          </Section>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
