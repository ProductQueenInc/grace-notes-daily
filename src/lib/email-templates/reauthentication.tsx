import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface ReauthenticationEmailProps {
  siteUrl?: string
  token: string
}

export const ReauthenticationEmail = ({ siteUrl, token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Verification code</Heading>
        <Text style={styles.text}>Enter this code to confirm it's you:</Text>
        <Text style={styles.token}>{token}</Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          The code expires shortly. Didn't request this? You can ignore the email.<br />
          <Link href={siteUrl ?? 'https://gracenotesdaily.com'} style={styles.footerLink}>gracenotesdaily.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
