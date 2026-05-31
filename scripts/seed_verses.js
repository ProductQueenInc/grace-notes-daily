// scripts/seed_verses.js
// Run once from project root: node scripts/seed_verses.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const library = JSON.parse(readFileSync('./gracenotes_verse_library.json', 'utf8'))

console.log(`Seeding ${library.verses.length} verses across ${library.themes.length} themes...`)

const { error } = await supabase
  .from('verses')
  .upsert(library.verses, { onConflict: 'id' })

if (error) {
  console.error('Verse seed failed:', error)
  process.exit(1)
}

console.log(`Done. ${library.verses.length} verses seeded.`)
