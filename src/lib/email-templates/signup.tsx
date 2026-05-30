import * as React from 'react'

import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Confirm your email.</Heading>
        <Text style={styles.text}>
          Welcome to {siteName}. Tap the button below to confirm <Link href={`mailto:${recipient}`} style={styles.link}>{recipient}</Link> and begin your quiet daily rhythm.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>Confirm email</Button>
        </Section>
        <Text style={styles.textSoft}>If the button doesn't work, paste this link into your browser:</Text>
        <Text style={styles.fallbackUrl}>
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          If you didn't create an account, you can safely ignore this email.
          <br />
          <Link href={siteUrl} style={styles.footerLink}>gracenotesdaily.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
