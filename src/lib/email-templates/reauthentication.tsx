import * as React from 'react'

import {
  Body, Container, Head, Heading, Hr, Html, Preview, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>Verify it's you.</Heading>
        <Text style={styles.text}>Use the code below to confirm your identity. It expires shortly.</Text>
        <Text style={styles.token}>{token}</Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>If you didn't request this, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
