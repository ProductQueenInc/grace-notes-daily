import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteUrl, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email address.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Confirm your new email</Heading>
        <Text style={styles.text}>
          You asked to change your email from <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
          Confirm the change below.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>Confirm change</Button>
        </Section>
        <Text style={styles.fallbackUrl}>
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Didn't request this? Please secure your account.<br />
          <Link href={siteUrl} style={styles.footerLink}>gracenotesdaily.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
