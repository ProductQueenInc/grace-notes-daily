// scripts/seed_crisis_lines.js
// Run once from project root: node scripts/seed_crisis_lines.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
//
// IMPORTANT: Verify every entry before seeding to production.
// Crisis line numbers change. Cross-reference at findahelpline.com or befrienders.org.
// Re-verify every 6 months.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const crisisData = JSON.parse(readFileSync('./gracenotes_crisis_lines.json', 'utf8'))

console.log(`Seeding ${crisisData.crisis_lines.length} crisis line entries...`)
console.log('WARNING:', crisisData.meta?.warning ?? 'Verify all numbers before production use.')

const { error } = await supabase
  .from('crisis_lines')
  .upsert(crisisData.crisis_lines, { onConflict: 'country_code' })

if (error) {
  console.error('Crisis lines seed failed:', error)
  process.exit(1)
}

console.log(`Done. ${crisisData.crisis_lines.length} crisis line entries seeded.`)
