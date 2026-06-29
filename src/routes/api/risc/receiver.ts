import { createFileRoute } from '@tanstack/react-router'
import { verifyRiscJwt } from '@/lib/risc-jwt'
import { handleRiscEvents } from '@/lib/risc-events.server'

export const Route = createFileRoute('/api/risc/receiver')({
  server: {
    handlers: {
      // Google RISC verification: GET with a challenge query param
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const challenge = url.searchParams.get('challenge')
        if (!challenge) {
          return new Response('Missing challenge', { status: 400 })
        }
        // Echo the challenge back — proves we own the endpoint
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      },

      POST: async ({ request }) => {
        const clientId = process.env.GOOGLE_CLIENT_ID
        if (!clientId) {
          console.error('[RISC] GOOGLE_CLIENT_ID not configured')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Content-Type must be application/secevent+jwt
        const contentType = request.headers.get('content-type') ?? ''
        if (!contentType.includes('secevent+jwt') && !contentType.includes('text/plain') && !contentType.includes('application/jwt')) {
          return Response.json({ error: 'Invalid content-type' }, { status: 415 })
        }

        let token: string
        try {
          token = await request.text()
          if (!token) throw new Error('Empty body')
        } catch {
          return Response.json({ error: 'Failed to read body' }, { status: 400 })
        }

        let jwt
        try {
          jwt = await verifyRiscJwt(token, clientId)
        } catch (err) {
          console.error('[RISC] JWT verification failed', err)
          // Return 202 to prevent Google retrying on a permanently bad token
          return Response.json({ error: 'Invalid token' }, { status: 202 })
        }

        try {
          await handleRiscEvents(jwt)
        } catch (err) {
          console.error('[RISC] event handling error', err)
          // Return 202 so Google doesn't retry — we received it, processing failed internally
          return Response.json({ error: 'Internal error' }, { status: 202 })
        }

        return new Response(null, { status: 202 })
      },
    },
  },
})
