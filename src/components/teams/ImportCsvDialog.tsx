import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useForm } from '@tanstack/react-form'
import { FileTextIcon, TriangleAlertIcon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { useImportTeam, useTeams } from '@/hooks/useTeamData'
import { decodeCsvBytes, parsePlayersCsv, type CsvEncoding, type CsvRow, type ParsedPlayersCsv } from '@/lib/csv'
import { teamInputSchema, type ImportPlayer } from '@/lib/supabase/schemas'
import { cn } from '@/lib/utils'
import { ColorPicker, FieldError, FormAlert, firstFreeColor, inputClass, labelClass } from './shared'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preenche nome e cor ao reimportar um time existente. */
  initialTeam?: { name: string; color: string }
  onImported: (teamId: string) => void
}

export function ImportCsvDialog({ open, onOpenChange, initialTeam, onImported }: ImportCsvDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ImportCsvContent initialTeam={initialTeam} onImported={onImported} /> : null}
    </Dialog>
  )
}

interface LoadedFile {
  fileName: string
  encoding: CsvEncoding
  parsed: ParsedPlayersCsv
}

const ENCODING_LABEL: Record<CsvEncoding, string> = { 'utf-8': 'UTF-8', 'windows-1252': 'Windows-1252' }

function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 40)
}

function toImportPlayers(rows: readonly CsvRow[]): ImportPlayer[] {
  return rows.flatMap((r) =>
    r.player
      ? [
          {
            name: r.player.name,
            number: r.player.number,
            position: r.player.position,
            nickname: r.player.nickname,
            is_starter: r.player.isStarter,
          },
        ]
      : [],
  )
}

function ImportCsvContent({ initialTeam, onImported }: Omit<ImportCsvDialogProps, 'open' | 'onOpenChange'>) {
  const teams = useTeams()
  const importTeam = useImportTeam()
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm({
    defaultValues: {
      name: initialTeam?.name ?? '',
      color: initialTeam?.color ?? firstFreeColor((teams.data ?? []).map((t) => t.color)),
    },
    validators: { onChange: teamInputSchema, onSubmit: teamInputSchema },
    onSubmit: async ({ value }) => {
      if (!loaded) return
      const team = teamInputSchema.parse(value)
      const teamId = await importTeam.mutateAsync({ team, players: toImportPlayers(loaded.parsed.rows) })
      onImported(teamId)
    },
  })

  async function loadFile(file: File) {
    setReadError(null)
    try {
      const { text, encoding } = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))
      setLoaded({ fileName: file.name, encoding, parsed: parsePlayersCsv(text) })
      if (!form.getFieldValue('name')) form.setFieldValue('name', nameFromFile(file.name))
    } catch {
      setReadError('Não foi possível ler o arquivo.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void loadFile(file)
  }

  const rows = loaded?.parsed.rows ?? []
  const fileIssues = loaded?.parsed.fileIssues ?? []
  const importable = rows.filter((r) => r.player).length
  const okCount = rows.filter((r) => r.player && r.issues.length === 0).length
  const warnCount = rows.filter((r) => r.player && r.issues.length > 0).length
  const errorCount = rows.length - importable

  return (
    <DialogContent
      title="Importar time por CSV"
      className="max-w-[880px]"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <form.Subscribe selector={(s) => [s.values.name, s.isSubmitting] as const}>
            {([name, isSubmitting]) => {
              const existing = findTeam(teams.data, name)
              const label = existing ? `Substituir jogadores (${importable})` : `Importar ${importable} jogadores`
              return (
                <Button
                  variant="primary"
                  type="submit"
                  form="import-form"
                  // Sem a lista de times não dá para avisar sobre substituição: bloqueia até carregar.
                  disabled={
                    isSubmitting || !teams.isSuccess || !loaded || importable === 0 || fileIssues.length > 0
                  }
                >
                  {isSubmitting ? 'Importando…' : label}
                </Button>
              )
            }}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="import-form"
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit().catch(() => undefined)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void loadFile(file)
            e.target.value = ''
          }}
        />

        <div className="flex flex-wrap gap-4">
          {loaded ? (
            <div className="flex flex-[1_1_280px] items-center gap-3 rounded-[10px] border border-dashed border-[#3a4652] bg-surface-2 px-3.5 py-3">
              <FileTextIcon size={28} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{loaded.fileName}</span>
                <span className="text-xs text-muted">
                  {rows.length} {rows.length === 1 ? 'linha' : 'linhas'} · separador ; · {ENCODING_LABEL[loaded.encoding]}{' '}
                  detectado
                </span>
              </div>
              <Button size="sm" onClick={() => inputRef.current?.click()}>
                Trocar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-[1_1_280px] cursor-pointer items-center gap-3 rounded-[10px] border border-dashed bg-surface-2 px-3.5 py-3 text-left text-ink',
                dragging ? 'border-accent' : 'border-[#3a4652] hover:border-accent/60',
              )}
            >
              <UploadIcon size={26} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">Escolher arquivo CSV</span>
                <span className="text-xs text-muted">ou arraste aqui · colunas nome;numero;posicao;apelido;titular</span>
              </span>
            </button>
          )}

          <form.Field name="name">
            {(field) => (
              <div className="flex flex-[1_1_220px] flex-col gap-1.5">
                <label htmlFor="import-team-name" className={labelClass}>
                  Nome do time
                </label>
                <input
                  id="import-team-name"
                  className={cn(inputClass, 'font-semibold')}
                  maxLength={40}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                />
                {field.state.meta.isTouched ? <FieldError errors={field.state.meta.errors} /> : null}
              </div>
            )}
          </form.Field>

          <form.Field name="color">
            {(field) => <ColorPicker value={field.state.value} onChange={field.handleChange} />}
          </form.Field>
        </div>

        <form.Subscribe selector={(s) => s.values.name}>
          {(name) => {
            const existing = findTeam(teams.data, name)
            return existing && loaded ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-[10px] border border-[#5c4a16] bg-[#2a2312] px-3.5 py-3"
              >
                <TriangleAlertIcon size={20} className="mt-px shrink-0 text-warning" aria-hidden="true" />
                <span className="text-sm leading-[1.45] text-[#f5e6b0]">
                  Já existe um time chamado <strong>{existing.name}</strong> com {existing.playerCount}{' '}
                  {existing.playerCount === 1 ? 'jogador' : 'jogadores'}. Ao confirmar, os jogadores atuais serão{' '}
                  <strong>substituídos</strong> pelos deste arquivo.
                </span>
              </div>
            ) : null
          }}
        </form.Subscribe>

        {teams.isError ? (
          <FormAlert>Não foi possível carregar os times para checar se este já existe: {teams.error.message}</FormAlert>
        ) : null}
        {readError ? <FormAlert>{readError}</FormAlert> : null}
        {fileIssues.map((issue) => (
          <FormAlert key={issue.message}>{issue.message}</FormAlert>
        ))}
        {importTeam.error ? <FormAlert>{importTeam.error.message}</FormAlert> : null}

        {loaded && fileIssues.length === 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Chip tone="ok">
                {okCount} {okCount === 1 ? 'válida' : 'válidas'}
              </Chip>
              {warnCount > 0 ? (
                <Chip tone="warn">
                  {warnCount} {warnCount === 1 ? 'aviso' : 'avisos'}
                </Chip>
              ) : null}
              {errorCount > 0 ? (
                <Chip tone="error">
                  {errorCount} {errorCount === 1 ? 'erro (será ignorada)' : 'erros (serão ignoradas)'}
                </Chip>
              ) : null}
            </div>
            <PreviewTable rows={rows} />
          </>
        ) : null}
      </form>
    </DialogContent>
  )
}

function findTeam<T extends { name: string }>(teams: readonly T[] | undefined, name: string): T | undefined {
  const key = name.trim().toLowerCase()
  return key ? teams?.find((t) => t.name.toLowerCase() === key) : undefined
}

const chipTones = {
  ok: 'bg-[#1e2a14] text-accent',
  warn: 'bg-[#2a2312] text-warning',
  error: 'bg-[#2e1719] text-danger',
} as const

function Chip({ tone, children }: { tone: keyof typeof chipTones; children: ReactNode }) {
  return <span className={cn('rounded-full px-2.5 py-1 text-[13px] font-semibold', chipTones[tone])}>{children}</span>
}

function PreviewTable({ rows }: { rows: readonly CsvRow[] }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-[10px] border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="sticky top-0">
          <tr className="bg-surface-2 text-left">
            {['Linha', 'Nº', 'Nome', 'Posição', 'Titular', 'Situação'].map((h) => (
              <th key={h} scope="col" className="px-3 py-[9px] text-xs font-semibold text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const hasError = !r.player
            const hasWarning = !hasError && r.issues.length > 0
            return (
              <tr
                key={r.line}
                className={cn(
                  'border-t border-[#222b34]',
                  hasError && 'bg-[rgba(245,158,158,0.07)]',
                  hasWarning && 'bg-[rgba(250,204,21,0.06)]',
                )}
              >
                <td className="px-3 py-2 text-muted">{r.line}</td>
                <td className="px-3 py-2 font-display text-base font-bold">{r.player?.number ?? (r.raw.numero || '—')}</td>
                <td className="px-3 py-2">{r.raw.nome || <span className="text-faint">(vazio)</span>}</td>
                <td className="px-3 py-2">{r.player?.position ?? r.raw.posicao}</td>
                <td className="px-3 py-2 text-ink-soft">{r.player ? (r.player.isStarter ? 'Sim' : 'Não') : '—'}</td>
                <td
                  className={cn(
                    'px-3 py-2 text-[13px] font-semibold',
                    hasError ? 'text-danger' : hasWarning ? 'text-warning' : 'text-muted',
                  )}
                >
                  {r.issues.length > 0 ? r.issues.map((i) => i.message).join(' · ') : 'OK'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
