import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { styles } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Set a new password for {siteName}.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Reset your password</Heading>
        <Text style={styles.text}>
          We received a request to reset the password for your account.
          Choose a new one using the link below.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>
            Set a new password
          </Button>
        </Section>
        <Text style={styles.textSoft}>
          If the button doesn't work, paste this link into your browser:
        </Text>
        <Text style={styles.fallbackUrl}>
          <Link href={confirmationUrl} style={styles.link}>
            {confirmationUrl}
          </Link>
        </Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          This link expires soon for your safety. If you didn't request a reset,
          you can ignore this email — your password stays the same.
          <br />
          <Link href={siteUrl} style={styles.footerLink}>
            gracenotesdaily.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
