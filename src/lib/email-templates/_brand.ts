// Shared brand styles for GraceNotes Daily auth emails.
// White body background is required for deliverability/dark-mode clients.
// Google Fonts won't load reliably in email clients — use web-safe fallbacks.

export const brand = {
  grace: '#285c37',
  graceDeep: '#1a3d24',
  gold: '#debe36',
  ink: '#2a2e2b',
  inkSoft: '#5a615d',
  inkMuted: '#9aa39d',
  border: '#e8ecea',
  cream: '#faf7f1',
} as const

const headingFont = 'Fraunces, "Hoefler Text", Georgia, "Times New Roman", serif'
const bodyFont = 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: bodyFont,
    margin: 0,
    padding: '40px 0',
  },
  container: {
    margin: '0 auto',
    padding: '0 24px',
    maxWidth: '560px',
  },
  brandHeader: {
    fontFamily: headingFont,
    fontSize: '24px',
    fontWeight: 500 as const,
    color: brand.grace,
    letterSpacing: '-0.01em',
    margin: '0 0 32px',
    textAlign: 'center' as const,
  },
  h1: {
    fontFamily: headingFont,
    fontSize: '28px',
    fontWeight: 500 as const,
    color: brand.grace,
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
    margin: '0 0 20px',
  },
  text: {
    fontSize: '16px',
    color: brand.ink,
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  textSoft: {
    fontSize: '15px',
    color: brand.inkSoft,
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  buttonWrap: {
    margin: '28px 0 32px',
  },
  button: {
    backgroundColor: brand.grace,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: '999px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  link: {
    color: brand.grace,
    textDecoration: 'underline',
  },
  divider: {
    border: 'none',
    borderTop: `1px solid ${brand.border}`,
    margin: '32px 0 24px',
  },
  footer: {
    fontSize: '13px',
    color: brand.inkMuted,
    lineHeight: '1.5',
    margin: '0',
    textAlign: 'center' as const,
  },
  footerLink: {
    color: brand.inkMuted,
    textDecoration: 'underline',
  },
  fallbackUrl: {
    fontSize: '13px',
    color: brand.inkSoft,
    lineHeight: '1.5',
    margin: '0 0 20px',
    wordBreak: 'break-all' as const,
  },
  token: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '24px',
    letterSpacing: '0.15em',
    color: brand.grace,
    backgroundColor: brand.cream,
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    padding: '16px 20px',
    textAlign: 'center' as const,
    margin: '20px 0 28px',
    fontWeight: 600 as const,
  },
} as const
