import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, siteUrl, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Your sign-in link</Heading>
        <Text style={styles.text}>Tap below to sign in. The link works once and expires soon.</Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>Sign in</Button>
        </Section>
        <Text style={styles.fallbackUrl}>
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Didn't request this? You can ignore the email.<br />
          <Link href={siteUrl} style={styles.footerLink}>gracenotesdaily.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
