/**
 * Baixa os elencos da Wikipédia em português e grava um CSV por clube em data/serie-a-2026.
 * Uso: pnpm squads:fetch [--only=slug] [--overwrite]
 * CSV com `reviewed: true` no manifest só é sobrescrito com --overwrite.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import { z } from 'zod'
import { parseWikipediaSquad, pickStarters, toPlayersCsv } from '@/lib/squads'
import { csvPath, readClubs, readManifest, writeManifest, type Club } from './squad-data'

const API = 'https://pt.wikipedia.org/w/api.php'
const HEADERS = { 'User-Agent': 'prancheta-tatica-squads/0.1 (projeto pessoal)', 'Api-User-Agent': 'prancheta-tatica-squads/0.1' }
// Intervalos em milissegundos: espaçam chamadas normais e dão mais tempo após recusas.
const DELAY_MS = 5_000
const RETRY_DELAY_MS = 30_000
const MAX_ATTEMPTS = 4
// Limiares de revisão: idade em dias e quantidades mínimas geram alertas, sem rejeitar o elenco.
const STALE_AFTER_DAYS = 60
const MIN_PLAYERS = 18
const MIN_GOALKEEPERS = 2
const CACHE_DIR = join(import.meta.dirname, '..', '.cache', 'wiki')

const parseResponseSchema = z.object({ parse: z.object({ text: z.object({ '*': z.string() }) }) })

async function fetchPageHtml(page: string): Promise<string> {
  const url = `${API}?action=parse&format=json&redirects=1&prop=text&page=${encodeURIComponent(page)}`
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, { headers: HEADERS })
    // O bloqueio por excesso de chamadas pode vir como texto puro, mesmo fora do status 429.
    const body = await response.text()
    const parsed = response.ok ? safeJson(body) : null
    if (parsed !== null) return parseResponseSchema.parse(parsed).parse.text['*']
    console.warn(`  Wikipédia recusou (status ${response.status}), tentativa ${attempt} de ${MAX_ATTEMPTS}.`)
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS)
  }
  throw new Error(`Não foi possível baixar "${page}".`)
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function daysSince(isoDate: string, now: Date): number {
  // Datas da fonte são dias em UTC; 86.400.000 é a quantidade de milissegundos em um dia.
  return Math.floor((now.getTime() - new Date(`${isoDate}T00:00:00Z`).getTime()) / 86_400_000)
}

async function fetchClub(club: Club & { wiki: NonNullable<Club['wiki']> }, now: Date) {
  const html = await fetchPageHtml(club.wiki.page)
  writeFileSync(join(CACHE_DIR, `${club.slug}.html`), html)
  const squad = parseWikipediaSquad(html, club.wiki.sectionId ? { sectionId: club.wiki.sectionId } : undefined)
  const players = pickStarters(squad.players)
  const goalkeepers = players.filter((player) => player.position === 'GOL').length
  const starters = players.filter((player) => player.isStarter).length
  const alerts = [...squad.issues]
  if (players.length < MIN_PLAYERS) alerts.push(`só ${players.length} jogadores`)
  if (goalkeepers < MIN_GOALKEEPERS) alerts.push(`só ${goalkeepers} goleiro(s)`)
  if (starters !== 11) alerts.push(`${starters} titulares`)
  if (squad.sourceDate === null) alerts.push('sem data na fonte')
  else if (daysSince(squad.sourceDate, now) > STALE_AFTER_DAYS) alerts.push('desatualizado')
  return { players, goalkeepers, sourceDate: squad.sourceDate, alerts }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const overwrite = args.includes('--overwrite')
  const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)
  const clubs = readClubs().filter((club) => !only || club.slug === only)
  if (clubs.length === 0) throw new Error(`Clube "${only}" não existe em clubs.json.`)
  const manifest = readManifest()
  const now = new Date()
  mkdirSync(CACHE_DIR, { recursive: true })

  let fetchedAny = false
  for (const club of clubs) {
    const entry = manifest[club.slug]
    if (!club.wiki) {
      const state = existsSync(csvPath(club.slug)) ? 'CSV presente' : 'CSV FALTANDO'
      console.log(`${club.name}: manual, ${state}`)
      continue
    }
    if (entry?.reviewed && !overwrite) {
      console.log(`${club.name}: já revisado, mantido (use --overwrite para substituir)`)
      continue
    }
    if (fetchedAny) await wait(DELAY_MS)
    fetchedAny = true
    const result = await fetchClub({ ...club, wiki: club.wiki }, now)
    // Uma extração vazia não deve sobrescrever um CSV existente nem seu registro de revisão.
    if (result.players.length > 0) {
      writeFileSync(csvPath(club.slug), toPlayersCsv(result.players))
      manifest[club.slug] = { sourceDate: result.sourceDate, fetchedAt: now.toISOString().slice(0, 10), reviewed: false }
      writeManifest(manifest)
    }
    const alerts = result.alerts.length ? ` | ALERTAS: ${result.alerts.join('; ')}` : ''
    console.log(`${club.name}: ${result.players.length} jogadores, ${result.goalkeepers} GOL, fonte ${result.sourceDate ?? '?'}${alerts}`)
  }
}

await main()
