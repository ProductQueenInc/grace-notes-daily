import { createRemoteJWKSet, jwtVerify } from 'jose'

const RISC_DISCOVERY = 'https://accounts.google.com/.well-known/risc-configuration'
const GOOGLE_ISSUER = 'https://accounts.google.com'

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null
let jwksUri: string | null = null

async function getJwks(): Promise<ReturnType<typeof createRemoteJWKSet>> {
  if (jwksCache && jwksUri) return jwksCache

  const resp = await fetch(RISC_DISCOVERY)
  if (!resp.ok) throw new Error(`Failed to fetch RISC discovery: ${resp.status}`)
  const config = (await resp.json()) as { jwks_uri: string }
  jwksUri = config.jwks_uri
  jwksCache = createRemoteJWKSet(new URL(jwksUri))
  return jwksCache
}

export interface RiscJwtPayload {
  iss: string
  aud: string | string[]
  iat: number
  jti: string
  events: Record<string, Record<string, unknown>>
}

export async function verifyRiscJwt(token: string, audience: string): Promise<RiscJwtPayload> {
  const jwks = await getJwks()

  const { payload } = await jwtVerify(token, jwks, {
    issuer: GOOGLE_ISSUER,
    audience,
  })

  if (!payload.events || typeof payload.events !== 'object') {
    throw new Error('JWT missing events claim')
  }

  return payload as unknown as RiscJwtPayload
}
