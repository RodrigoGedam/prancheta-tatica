/**
 * Carrega os times padrão de data/serie-a-2026 no Supabase pela função import_team.
 * Uso: pnpm squads:seed [--apply] [--force]
 * Sem --apply apenas simula. Time já existente é pulado, salvo com --force (substitui elenco e cor).
 * Valida todos os clubes antes de gravar: qualquer problema cancela a carga inteira.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { decodeCsvBytes, parsePlayersCsv } from '@/lib/csv'
import { importPlayerSchema, teamInputSchema, type ImportPlayer } from '@/lib/supabase/schemas'
import { csvPath, readClubs, readManifest, type Club } from './squad-data'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

interface ValidatedClub {
  club: Club
  players: ImportPlayer[]
  warnings: string[]
}

function validateClub(club: Club, reviewed: boolean): { valid: ValidatedClub | null; errors: string[] } {
  const errors: string[] = []
  if (!reviewed) errors.push('não revisado no manifest')
  let bytes: Uint8Array
  try {
    bytes = readFileSync(csvPath(club.slug))
  } catch {
    return { valid: null, errors: [...errors, 'CSV não encontrado'] }
  }
  const { rows, fileIssues } = parsePlayersCsv(decodeCsvBytes(bytes).text)
  errors.push(...fileIssues.map((issue) => issue.message))
  const warnings: string[] = []
  const players: ImportPlayer[] = []
  for (const row of rows) {
    for (const issue of row.issues) {
      const text = `linha ${row.line}: ${issue.message}`
      if (issue.severity === 'error') errors.push(text)
      else warnings.push(text)
    }
    if (row.player) {
      players.push(
        importPlayerSchema.parse({
          name: row.player.name,
          number: row.player.number,
          position: row.player.position,
          nickname: row.player.nickname,
          is_starter: row.player.isStarter,
        }),
      )
    }
  }
  if (players.length === 0 && errors.length === 0) errors.push('nenhum jogador')
  return { valid: errors.length ? null : { club, players, warnings }, errors }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const force = args.includes('--force')

  const manifest = readManifest()
  const validated: ValidatedClub[] = []
  let failed = false
  for (const club of readClubs()) {
    const { valid, errors } = validateClub(club, manifest[club.slug]?.reviewed === true)
    if (valid) validated.push(valid)
    else {
      failed = true
      console.error(`${club.name}: RECUSADO: ${errors.join('; ')}`)
    }
  }
  if (failed) {
    console.error('Nada foi gravado. Corrija os clubes recusados e rode de novo.')
    process.exitCode = 1
    return
  }

  const env = envSchema.parse(process.env)
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.from('teams').select('name')
  if (error) throw new Error(`Erro ao ler os times: ${error.message}`)
  const existingNames = z.array(z.object({ name: z.string() })).parse(data).map((team) => team.name)
  const existing = new Set(existingNames.map((name) => name.toLowerCase()))
  const seedNames = new Set(validated.map(({ club }) => club.name.toLowerCase()))

  const prefix = apply ? '' : '[simulação] '
  for (const { club, players, warnings } of validated) {
    const exists = existing.has(club.name.toLowerCase())
    const details = warnings.length ? ` | avisos: ${warnings.join('; ')}` : ''
    if (exists && !force) {
      console.log(`${prefix}${club.name}: já existe, pulado`)
      continue
    }
    const verb = exists ? 'substitui' : 'cria'
    console.log(`${prefix}${club.name}: ${verb}, ${players.length} jogadores${details}`)
    if (!apply) continue
    const team = teamInputSchema.parse({ name: club.name, color: club.color })
    const { error: importError } = await supabase.rpc('import_team', {
      p_name: team.name,
      p_color: team.color,
      p_players: players,
    })
    if (importError) throw new Error(`Erro ao gravar ${club.name}: ${importError.message}`)
  }

  const others = existingNames.filter((name) => !seedNames.has(name.toLowerCase()))
  if (others.length) console.log(`Outros times no banco (não mexidos): ${others.join(', ')}`)
}

await main()
