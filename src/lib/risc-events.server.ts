import { createClient } from '@supabase/supabase-js'
import type { RiscJwtPayload } from './risc-jwt'

const RISC_NS = 'https://schemas.openid.net/secevent/risc/event-type/'

const EVENT = {
  SESSIONS_REVOKED: `${RISC_NS}sessions-revoked`,
  ACCOUNT_DISABLED: `${RISC_NS}account-disabled`,
  ACCOUNT_CREDENTIAL_CHANGE: `${RISC_NS}account-credential-change-required`,
  ACCOUNT_PURGED: `${RISC_NS}account-purged`,
  ACCOUNT_HIJACKING: `${RISC_NS}account-hijacking-detected`,
} as const

function adminClient() {
  // Hardcoded to TKOEBO — where auth users live.
  const url = 'https://tkoebogweygaabndrsvl.supabase.co'
  const key = process.env.TKOEBO_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!key) throw new Error('Missing TKOEBO_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function findUserByGoogleSub(sub: string): Promise<string | null> {
  const supabase = adminClient()
  // identities table stores provider + provider_id (= Google sub)
  const { data, error } = await supabase
    .from('identities')
    .select('user_id')
    .eq('provider', 'google')
    .eq('provider_id', sub)
    .maybeSingle()

  if (error) {
    console.error('[RISC] identity lookup error', error)
    return null
  }
  return data?.user_id ?? null
}

async function revokeUserSessions(userId: string): Promise<void> {
  const supabase = adminClient()
  const { error } = await supabase.auth.admin.signOut(userId, 'global')
  if (error) console.error('[RISC] signOut error', { userId, error })
  else console.log('[RISC] sessions revoked', { userId })
}

async function disableUser(userId: string, reason: string): Promise<void> {
  const supabase = adminClient()
  // Revoke all sessions first
  await revokeUserSessions(userId)
  // Ban the user so they cannot sign in again until manually reviewed
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: '876000h', // ~100 years — effectively permanent until admin lifts
  })
  if (error) console.error('[RISC] ban error', { userId, reason, error })
  else console.log('[RISC] user disabled', { userId, reason })
}

function extractSubject(eventPayload: Record<string, unknown>): string | null {
  // SET subject claim — can be at top level (subject) or inside the event value
  const subject = eventPayload['subject'] as Record<string, unknown> | undefined
  if (subject?.sub) return String(subject.sub)
  if (subject?.email) return String(subject.email) // fallback — would need email lookup
  return null
}

export async function handleRiscEvents(jwt: RiscJwtPayload): Promise<void> {
  const events = jwt.events

  for (const [eventType, eventData] of Object.entries(events)) {
    console.log('[RISC] received event', { eventType, jti: jwt.jti })

    // The subject is in the SET top-level, not per-event. Google puts it at payload root.
    const sub = (jwt as any).sub as string | undefined

    if (!sub) {
      console.warn('[RISC] event has no subject sub, skipping', { eventType })
      continue
    }

    const userId = await findUserByGoogleSub(sub)
    if (!userId) {
      console.warn('[RISC] no local user found for Google sub', { sub, eventType })
      continue
    }

    switch (eventType) {
      case EVENT.SESSIONS_REVOKED:
        await revokeUserSessions(userId)
        break

      case EVENT.ACCOUNT_HIJACKING:
        // Treat hijacking as: revoke sessions immediately, force re-auth
        await revokeUserSessions(userId)
        break

      case EVENT.ACCOUNT_CREDENTIAL_CHANGE:
        // Password/credential changed — revoke all existing sessions
        await revokeUserSessions(userId)
        break

      case EVENT.ACCOUNT_DISABLED:
      case EVENT.ACCOUNT_PURGED:
        await disableUser(userId, eventType)
        break

      default:
        console.log('[RISC] unhandled event type (no action taken)', { eventType })
    }
  }
}
