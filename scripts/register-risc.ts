/**
 * One-time script: registers the GraceNotes RISC receiver endpoint with Google.
 *
 * Prerequisites:
 *   1. Set GOOGLE_SERVICE_ACCOUNT_JSON env var (contents of the .json key file)
 *   2. Set GOOGLE_CLIENT_ID env var (OAuth client ID for GraceNotes)
 *   3. The RISC API must be enabled in Google Cloud Console for this project.
 *
 * Run:
 *   GOOGLE_SERVICE_ACCOUNT_JSON=$(cat path/to/key.json) \
 *   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com \
 *   npx tsx scripts/register-risc.ts
 */

import { SignJWT, importPKCS8 } from 'jose'

const RISC_STREAM_UPDATE = 'https://risc.googleapis.com/v1beta/stream:update'
const RECEIVER_URL = 'https://gracenotesdaily.com/api/risc/receiver'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/risc.configuration.readwrite'

interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri: string
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(sa.private_key, 'RS256')

  const assertion = await new SignJWT({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey)

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Token request failed ${resp.status}: ${text}`)
  }

  const data = (await resp.json()) as { access_token: string }
  return data.access_token
}

async function registerRiscEndpoint(): Promise<void> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set')

  const sa: ServiceAccount = JSON.parse(saJson)

  console.log('Obtaining service account access token...')
  const token = await getAccessToken(sa)

  // Events we want to receive
  const events_requested = [
    'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
    'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
    'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
    'https://schemas.openid.net/secevent/risc/event-type/account-purged',
    'https://schemas.openid.net/secevent/risc/event-type/account-hijacking-detected',
  ]

  const body = {
    delivery: {
      delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
      url: RECEIVER_URL,
    },
    events_requested,
  }

  console.log('Registering RISC receiver endpoint...')
  const resp = await fetch(RISC_STREAM_UPDATE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await resp.text()

  if (!resp.ok) {
    throw new Error(`RISC stream update failed ${resp.status}: ${text}`)
  }

  console.log('✓ RISC endpoint registered successfully')
  console.log('Response:', text)
}

registerRiscEndpoint().catch((err) => {
  console.error('Registration failed:', err)
  process.exit(1)
})
