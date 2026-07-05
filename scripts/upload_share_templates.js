// scripts/upload_share_templates.js
// One-time upload of the Canva share-card assets to the PRIVATE `share-templates`
// storage bucket (created 2026-07-05; the render-share-card function reads from it).
//
// Run once from project root:
//   SUPABASE_URL=https://tkoebogweygaabndrsvl.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/upload_share_templates.js
//
// Asset source: ../public (the parent folder's public/ - share-backgrounds/,
// share-assets/, share-captions.json). Override with a path argument if moved.
// Idempotent: uses upsert, safe to re-run.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'

const BUCKET = 'share-templates'
const root = process.argv[2] ?? join(process.cwd(), '..', 'public')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TYPES = { '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' }

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (!name.startsWith('.')) yield p
  }
}

// key layout in the bucket:
//   backgrounds/<type>/[<theme>/]<file>.png   (from share-backgrounds/)
//   assets/<file>                             (from share-assets/)
//   captions/share-captions.json
const jobs = []
for (const f of walk(join(root, 'share-backgrounds')))
  jobs.push({ file: f, key: 'backgrounds/' + relative(join(root, 'share-backgrounds'), f) })
for (const f of walk(join(root, 'share-assets')))
  jobs.push({ file: f, key: 'assets/' + relative(join(root, 'share-assets'), f) })
jobs.push({ file: join(root, 'share-captions.json'), key: 'captions/share-captions.json' })

console.log(`Uploading ${jobs.length} files from ${root} to bucket "${BUCKET}"...`)
let ok = 0
for (const { file, key } of jobs) {
  const { error } = await supabase.storage.from(BUCKET).upload(key.replaceAll('\\', '/'), readFileSync(file), {
    contentType: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    upsert: true,
  })
  if (error) {
    console.error(`FAILED ${key}:`, error.message)
    process.exitCode = 1
  } else {
    ok++
    process.stdout.write(`\r${ok}/${jobs.length} ${key.padEnd(70)}`)
  }
}
console.log(`\nDone: ${ok}/${jobs.length} uploaded.`)

// Verify by listing top-level folders
const { data } = await supabase.storage.from(BUCKET).list('backgrounds')
console.log('backgrounds/ contains:', (data ?? []).map((d) => d.name).join(', '))
