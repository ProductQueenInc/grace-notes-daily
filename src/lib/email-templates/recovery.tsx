import * as React from 'react'

import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Let's get you back in.</Heading>
        <Text style={styles.text}>
          We received a request to reset your password. Tap the button below to choose a new one. It only takes a moment.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>Reset your password</Button>
        </Section>
        <Text style={styles.textSoft}>If the button doesn't work, paste this link into your browser:</Text>
        <Text style={styles.fallbackUrl}>
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Didn't ask for this? You can safely ignore this email. Your password stays the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
