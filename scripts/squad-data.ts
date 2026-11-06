import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { HEX_COLOR_REGEX } from '@/lib/supabase/schemas'

export const DATA_DIR = join(import.meta.dirname, '..', 'data', 'serie-a-2026')
const CLUBS_PATH = join(DATA_DIR, 'clubs.json')
const MANIFEST_PATH = join(DATA_DIR, 'manifest.json')

const clubSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR_REGEX),
  /** null: a Wikipédia não traz posições deste clube; o CSV é mantido à mão. */
  wiki: z.object({ page: z.string().min(1), sectionId: z.string().min(1).optional() }).nullable(),
})
export type Club = z.output<typeof clubSchema>

const manifestEntrySchema = z.object({
  sourceDate: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  reviewed: z.boolean(),
})
export type ManifestEntry = z.output<typeof manifestEntrySchema>
const manifestSchema = z.record(z.string(), manifestEntrySchema)
export type Manifest = z.output<typeof manifestSchema>

export function readClubs(): Club[] {
  return z.array(clubSchema).parse(JSON.parse(readFileSync(CLUBS_PATH, 'utf8')))
}

export function readManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) return {}
  return manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')))
}

export function writeManifest(manifest: Manifest): void {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`)
}

export function csvPath(slug: string): string {
  return join(DATA_DIR, `${slug}.csv`)
}
