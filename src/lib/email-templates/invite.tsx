import * as React from 'react'

import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { styles } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandHeader}>GraceNotes Daily</Text>
        <Heading style={styles.h1}>You've been invited.</Heading>
        <Text style={styles.text}>
          You've been invited to join <Link href={siteUrl} style={styles.link}>{siteName}</Link>. Tap below to accept the invitation and create your account.
        </Text>
        <Section style={styles.buttonWrap}>
          <Button style={styles.button} href={confirmationUrl}>Accept invitation</Button>
        </Section>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>If you weren't expecting this invitation, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
