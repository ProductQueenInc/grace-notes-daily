import * as React from 'react'

import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { brand } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const MEDALLION_URL =
  'https://jtjizrchmmmvphkndmhs.supabase.co/storage/v1/object/public/email-assets/dove-medallion.png'

const headingFont = 'Georgia, "Times New Roman", serif'
const bodyFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: bodyFont,
  margin: 0,
  padding: '0',
}

const outer = {
  margin: '0 auto',
  padding: '32px 16px',
  maxWidth: '600px',
}

// Green banner header — centered for predictable rendering across email clients.
const banner = {
  backgroundColor: brand.grace,
  borderRadius: '20px 20px 0 0',
  padding: '30px 28px 28px',
  textAlign: 'center' as const,
}

const wordmark = {
  fontFamily: headingFont,
  fontSize: '30px',
  fontWeight: 400 as const,
  color: '#ffffff',
  letterSpacing: '0',
  margin: '0',
  lineHeight: '1.15',
  textAlign: 'center' as const,
}

const tagline = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.82)',
  margin: '8px 0 0',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
}

// Parchment card body — matches in-app .glass-parchment feel
const card = {
  backgroundColor: brand.cream,
  borderRadius: '0 0 20px 20px',
  borderLeft: `1px solid ${brand.border}`,
  borderRight: `1px solid ${brand.border}`,
  borderBottom: `1px solid ${brand.border}`,
  padding: '36px 32px 32px',
}

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: brand.gold,
  fontWeight: 700 as const,
  margin: '0 0 10px',
}

const h1 = {
  fontFamily: headingFont,
  fontSize: '29px',
  fontWeight: 400 as const,
  color: brand.grace,
  lineHeight: '1.2',
  letterSpacing: '0',
  margin: '0 0 16px',
}

const text = {
  fontSize: '16px',
  color: brand.ink,
  lineHeight: '1.65',
  margin: '0 0 18px',
}

const textSoft = {
  fontSize: '14px',
  color: brand.inkSoft,
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const buttonWrap = {
  margin: '24px 0 28px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: brand.grace,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '999px',
  padding: '14px 36px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 14px rgba(40, 92, 55, 0.25)',
}

const divider = {
  border: 'none',
  borderTop: `1px solid ${brand.border}`,
  margin: '24px 0 18px',
}

const fallbackLabel = {
  fontSize: '13px',
  color: brand.inkSoft,
  margin: '0 0 6px',
}

const fallbackUrl = {
  fontSize: '13px',
  color: brand.grace,
  lineHeight: '1.5',
  margin: '0',
  wordBreak: 'break-all' as const,
}

const link = {
  color: brand.grace,
  textDecoration: 'underline',
}

const footer = {
  fontSize: '12px',
  color: brand.inkMuted,
  lineHeight: '1.55',
  margin: '20px 0 0',
  textAlign: 'center' as const,
}

const footerBrand = {
  fontFamily: headingFont,
  fontSize: '14px',
  color: brand.grace,
  margin: '0 0 4px',
  textAlign: 'center' as const,
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}</Preview>
    <Body style={main}>
      <Container style={outer}>
        {/* Green banner */}
        <Section style={banner}>
          <table style={bannerInner} role="presentation" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td style={medallionCell}>
                  <Img
                    src={MEDALLION_URL}
                    alt=""
                    width="48"
                    height="48"
                    style={{ display: 'block', borderRadius: '50%' }}
                  />
                </td>
                <td style={wordmarkCell}>
                  <Text style={wordmark}>GraceNotes Daily</Text>
                  <Text style={tagline}>Held · Seen · Welcome</Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Parchment body */}
        <Section style={card}>
          <Text style={eyebrow}>Your sign-in link</Text>
          <Heading style={h1}>Welcome back.</Heading>
          <Text style={text}>
            Tap the button below to return to your daily grace. This link will expire shortly and can only be used once.
          </Text>

          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>Open GraceNotes Daily</Button>
          </Section>

          <Hr style={divider} />

          <Text style={fallbackLabel}>If the button doesn't work, paste this link into your browser:</Text>
          <Text style={fallbackUrl}>
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>

          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email — no account changes will be made.
          </Text>
        </Section>

        <Text style={footerBrand}>GraceNotes Daily</Text>
        <Text style={footer}>
          gracenotesdaily.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
