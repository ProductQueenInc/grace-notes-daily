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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>One small step to begin — confirm your email for {siteName}.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Welcome in.</Heading>
        <Text style={styles.text}>
          We're glad you're here. Confirm your email and your daily space is ready —
          a quiet note, a verse, and room to breathe.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm your email
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
          Didn't sign up? You can safely ignore this email — nothing will happen.
          <br />
          <Link href={siteUrl} style={styles.footerLink}>
            gracenotesdaily.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
