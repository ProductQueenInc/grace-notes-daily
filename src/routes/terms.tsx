import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { BookOpen } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | GraceNotes Daily" },
      { name: "description", content: "GraceNotes Daily Terms of Use. Your rights and responsibilities as a user of the GraceNotes Daily platform." },
    ],
  }),
  component: Terms,
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

function Terms() {
  const updated = "May 25, 2026";
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="white" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
      </header>
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 text-foreground space-y-8">
          <div className="space-y-2">
            <BookOpen className="w-7 h-7 text-grace" />
            <h1 className="font-display text-4xl text-grace">Terms of Use</h1>
            <p className="text-sm text-foreground/55">Last updated: {updated}</p>
            <P>
              These Terms of Use ("Terms") govern your access to and use of the GraceNotes Daily web application and related services ("Service") operated by GraceNotes Daily ("we," "us," or "our"), accessible at https://www.gracenotesdaily.com. Please read these Terms carefully before creating an account or using the Service.
            </P>
            <P>
              By accessing or using GraceNotes Daily, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not use the Service.
            </P>
          </div>

          <Section title="1. Eligibility">
            <P>
              You must be at least 13 years of age to use GraceNotes Daily. Users in the European Economic Area must be at least 16 years of age, or have verifiable parental consent. By creating an account, you represent that you meet these age requirements.
            </P>
            <P>
              You must not use the Service if you are barred from doing so under the laws of your jurisdiction or have previously had your account terminated by us for a breach of these Terms.
            </P>
          </Section>

          <Section title="2. Account Registration and Security">
            <P>
              To access the core features of GraceNotes Daily, you must create an account using a valid email address and password, or by authenticating through a supported third-party provider (currently Google OAuth). You agree to provide accurate, current, and complete information during registration and to keep your account information updated.
            </P>
            <P>
              You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at support@gracenotesdaily.com if you suspect any unauthorised access to or use of your account. GraceNotes Daily will not be liable for any loss or damage arising from your failure to protect your credentials.
            </P>
            <P>
              You may not create more than one account per person, share your account with any other person, or transfer your account to another party without our written consent.
            </P>
          </Section>

          <Section title="3. Description of Service">
            <P>
              GraceNotes Daily is a faith-based personal devotional companion application providing daily AI-generated grace notes, guided devotional readings, prayer journaling, heart note journaling, and habit tracking features. The Service is designed for personal, non-commercial spiritual enrichment.
            </P>
            <P>
              We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time with reasonable notice where practicable. We will not be liable to you for any modification, suspension, or discontinuation of the Service.
            </P>
          </Section>

          <Section title="4. Artificial Intelligence and Generated Content">
            <P>
              GraceNotes Daily uses third-party artificial intelligence services including Claude by Anthropic and GPT models by OpenAI to generate personalised devotional content, grace notes, and conversational responses. By using the Service, you acknowledge and agree to the following:
            </P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li>AI-generated content is produced algorithmically based on your profile and inputs. It is intended for personal spiritual reflection and encouragement only.</li>
              <li>AI-generated content does not constitute pastoral counselling, theological instruction, medical or psychological advice, or any form of professional guidance. It is not a substitute for qualified pastoral care, mental health support, or medical treatment.</li>
              <li>GraceNotes Daily does not warrant that AI-generated content is doctrinally authoritative, free from error, or suitable for any particular theological tradition.</li>
              <li>Certain content you submit, specifically the text of heart notes and daily chat messages, is transmitted to third-party AI providers solely to generate your personalised response. Please refer to our Privacy Policy for full details.</li>
              <li>You should not make significant life, financial, medical, or spiritual decisions based solely on AI-generated content within the Service.</li>
            </ul>
          </Section>

          <Section title="5. User Content">
            <P>
              "User Content" means any text, data, or information you create, submit, or store within the Service, including journal entries, prayers, heart notes, and profile information.
            </P>
            <P>
              <strong>Ownership:</strong> You retain full ownership of all User Content you create. GraceNotes Daily does not claim any intellectual property rights over your User Content.
            </P>
            <P>
              <strong>Licence to us:</strong> By submitting User Content, you grant GraceNotes Daily a limited, non-exclusive, royalty-free licence to store, process, and transmit your User Content solely as necessary to provide the Service to you. This licence terminates when you delete the content or your account.
            </P>
            <P>
              <strong>Privacy of User Content:</strong> Your User Content is private by default and is never shared with other users, sold to third parties, or used for advertising. It is processed by AI providers only as described in Section 4 and our Privacy Policy.
            </P>
            <P>
              <strong>Your responsibility:</strong> You are solely responsible for your User Content. You represent that you have all rights necessary to submit it and that it does not violate any third-party rights or applicable law.
            </P>
          </Section>

          <Section title="6. Acceptable Use">
            <P>You agree not to use GraceNotes Daily to:</P>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/75">
              <li>Violate any applicable local, national, or international law or regulation</li>
              <li>Transmit or store any content that is unlawful, defamatory, obscene, or that infringes any third-party intellectual property rights</li>
              <li>Attempt to gain unauthorised access to any part of the Service, its servers, or connected systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
              <li>Use the Service for any commercial purpose without our written consent</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
              <li>Use automated means to access or scrape the Service</li>
            </ul>
            <P>We reserve the right to suspend or terminate accounts found to be in violation of these restrictions without prior notice.</P>
          </Section>

          <Section title="7. Subscriptions, Payments, and Future Commerce">
            <P>
              The core daily experience of GraceNotes Daily is currently available free of charge. We reserve the right to introduce premium subscription tiers, one-time purchases, or other paid features in future.
            </P>
            <P>
              <strong>Premium features (future):</strong> If and when premium features are introduced, pricing, billing frequency, and what is included will be clearly disclosed before any charge is made. You will never be charged without your explicit consent.
            </P>
            <P>
              <strong>In-app store (future):</strong> We may introduce a curated store of Christian products, resources, and goods accessible from within the app. Any purchases made through the in-app store will be subject to their own purchase terms, which will be presented to you at the time of transaction.
            </P>
            <P>
              <strong>Payment processing (future):</strong> Payments will be processed by a PCI DSS-compliant third-party payment processor such as Stripe. GraceNotes Daily does not store full credit card numbers or payment credentials. All payment data is handled directly by the payment processor under their own terms and privacy policy.
            </P>
            <P>
              <strong>Refunds (future):</strong> Refund policies for any paid features will be stated at the time of purchase. Where applicable, your statutory consumer rights are unaffected.
            </P>
            <P>
              We will provide at least 30 days' notice before activating any paid features, and will update these Terms and our Privacy Policy accordingly.
            </P>
          </Section>

          <Section title="8. Intellectual Property">
            <P>
              All content, design, software, and intellectual property comprising the GraceNotes Daily Service, excluding your User Content, is owned by or licenced to GraceNotes Daily and is protected by applicable copyright, trademark, and other intellectual property laws.
            </P>
            <P>
              You may not copy, reproduce, distribute, publicly display, or create derivative works from any part of the Service without our prior written permission, except as expressly permitted by these Terms.
            </P>
          </Section>

          <Section title="9. Privacy">
            <P>
              Your use of the Service is also governed by our Privacy Policy, available at https://www.gracenotesdaily.com/privacy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your personal data as described in the Privacy Policy.
            </P>
          </Section>

          <Section title="10. Disclaimers">
            <P>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </P>
            <P>
              GraceNotes Daily does not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We do not warrant the accuracy, completeness, or reliability of any AI-generated content. We are not responsible for any decisions you make based on content generated by the Service.
            </P>
            <P>
              GraceNotes Daily is not a religious organisation, church, or spiritual authority. Content within the app reflects general Christian themes and Scripture but does not represent any specific denomination, theological tradition, or institutional position.
            </P>
          </Section>

          <Section title="11. Limitation of Liability">
            <P>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, GRACENOTESDAILY AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR EMOTIONAL DISTRESS, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </P>
            <P>
              WHERE LIABILITY CANNOT BE EXCLUDED BY LAW, OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USD $100).
            </P>
            <P>Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any other matter that cannot lawfully be limited.</P>
          </Section>

          <Section title="12. Indemnification">
            <P>
              You agree to defend, indemnify, and hold harmless GraceNotes Daily and its officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments, and expenses (including reasonable legal fees) arising out of or in connection with (a) your breach of these Terms; (b) your User Content; or (c) your violation of any law or rights of a third party.
            </P>
          </Section>

          <Section title="13. Termination">
            <P>
              You may terminate your account at any time by deleting it through the Settings page within the app. Upon deletion, your User Content will be permanently removed within 30 days as described in our Privacy Policy.
            </P>
            <P>
              We may suspend or terminate your access to the Service immediately, without notice, if you breach these Terms or if we are required to do so by law. Upon termination by us for cause, your right to use the Service ceases immediately.
            </P>
            <P>
              Sections 5 (User Content — ownership and liability), 8 (Intellectual Property), 10 (Disclaimers), 11 (Limitation of Liability), and 12 (Indemnification) survive termination of these Terms.
            </P>
          </Section>

          <Section title="14. Governing Law and Dispute Resolution">
            <P>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. If you are located in the European Union or United Kingdom, you also benefit from any mandatory consumer protection provisions of the law of your country of residence.
            </P>
            <P>
              Before initiating any formal legal proceedings, we encourage you to contact us at support@gracenotesdaily.com to attempt to resolve any dispute informally. We will make a genuine effort to resolve concerns within 30 days.
            </P>
            <P>
              If informal resolution is not possible, any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of courts in the United States, subject to any mandatory jurisdiction rules applicable in your country of residence.
            </P>
          </Section>

          <Section title="15. Changes to These Terms">
            <P>
              We may update these Terms from time to time. When we make material changes, we will notify you via the email address associated with your account and display a notice within the app at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.
            </P>
            <P>
              If you do not agree to the updated Terms, you must stop using the Service and may delete your account before the effective date.
            </P>
          </Section>

          <Section title="16. Miscellaneous">
            <P>
              <strong>Entire agreement:</strong> These Terms and the Privacy Policy constitute the entire agreement between you and GraceNotes Daily regarding the Service and supersede any prior agreements.
            </P>
            <P>
              <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, it will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force and effect.
            </P>
            <P>
              <strong>No waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision.
            </P>
            <P>
              <strong>Assignment:</strong> You may not assign your rights under these Terms without our written consent. We may assign our rights to a successor in connection with a merger, acquisition, or sale of assets.
            </P>
          </Section>

          <Section title="17. Contact Us">
            <P>For questions about these Terms, please contact us:</P>
            <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/75">
              <li><strong>Email:</strong> support@gracenotesdaily.com</li>
              <li><strong>Website:</strong> https://www.gracenotesdaily.com/contact</li>
            </ul>
          </Section>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
