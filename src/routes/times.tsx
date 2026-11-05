import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon, PlusIcon, UploadIcon } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ImportCsvDialog } from '@/components/teams/ImportCsvDialog'
import { TeamFormDialog } from '@/components/teams/TeamFormDialog'
import { TeamPanel } from '@/components/teams/TeamPanel'
import { TeamDot, firstFreeColor } from '@/components/teams/shared'
import { useTeams } from '@/hooks/useTeamData'
import { cn } from '@/lib/utils'

const searchSchema = z.object({ time: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/times')({
  validateSearch: (search) => searchSchema.parse(search),
  component: TimesPage,
})

type ImportState = { initialTeam?: { name: string; color: string } } | null

function TimesPage() {
  const { time } = Route.useSearch()
  const navigate = Route.useNavigate()
  const teams = useTeams()
  const [teamDialog, setTeamDialog] = useState<'new' | 'edit' | null>(null)
  const [importState, setImportState] = useState<ImportState>(null)

  const list = teams.data ?? []
  const selected = list.find((t) => t.id === time) ?? list[0]
  const select = (id: string | undefined) => void navigate({ search: { time: id }, replace: true })

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-wrap content-start gap-6 overflow-y-auto px-8 py-7">
      <section aria-label="Lista de times" className="flex max-w-[340px] flex-[1_1_300px] flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="m-0 font-display text-[32px] font-bold">Times</h1>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              aria-label="Importar CSV"
              title="Importar CSV"
              onClick={() => setImportState({})}
            >
              <UploadIcon size={16} aria-hidden="true" />
            </Button>
            <Button onClick={() => setTeamDialog('new')}>
              <PlusIcon size={16} aria-hidden="true" />
              Novo time
            </Button>
          </div>
        </div>

        {teams.isPending ? <p className="m-0 text-sm text-muted">Carregando times…</p> : null}
        {teams.isError ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {teams.error.message}
          </p>
        ) : null}

        {list.map((t) => {
          const active = t.id === selected?.id
          return (
            <Link
              key={t.id}
              to="/times"
              search={{ time: t.id }}
              replace
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3.5 text-ink no-underline transition-colors',
                active ? 'border-accent bg-control' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <TeamDot color={t.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold">{t.name}</span>
                <span className="text-xs text-muted">
                  {t.playerCount} {t.playerCount === 1 ? 'jogador' : 'jogadores'}
                </span>
              </span>
              <ChevronRightIcon size={18} className="text-faint" aria-hidden="true" />
            </Link>
          )
        })}
      </section>

      {selected ? (
        <TeamPanel
          key={selected.id}
          team={selected}
          onEditTeam={() => setTeamDialog('edit')}
          onReimport={() => setImportState({ initialTeam: { name: selected.name, color: selected.color } })}
          onDeleted={() => select(undefined)}
        />
      ) : teams.isSuccess ? (
        <section className="flex flex-[999_1_640px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-line-strong bg-surface p-10 text-center">
          <h2 className="m-0 font-display text-2xl font-bold">Nenhum time ainda</h2>
          <p className="m-0 max-w-md text-sm text-muted">
            Importe um CSV com as colunas <code>nome;numero;posicao;apelido;titular</code> ou crie um time vazio e
            adicione os jogadores à mão.
          </p>
          <div className="flex gap-2.5">
            <Button variant="primary" onClick={() => setImportState({})}>
              <UploadIcon size={16} aria-hidden="true" />
              Importar CSV
            </Button>
            <Button onClick={() => setTeamDialog('new')}>Novo time</Button>
          </div>
        </section>
      ) : null}

      <TeamFormDialog
        open={teamDialog !== null}
        onOpenChange={(open) => !open && setTeamDialog(null)}
        team={teamDialog === 'edit' ? selected : undefined}
        defaultColor={firstFreeColor(list.map((t) => t.color))}
        onSaved={(id) => {
          setTeamDialog(null)
          select(id)
        }}
      />

      <ImportCsvDialog
        open={importState !== null}
        onOpenChange={(open) => !open && setImportState(null)}
        initialTeam={importState?.initialTeam}
        onImported={(id) => {
          setImportState(null)
          select(id)
        }}
      />
    </main>
  )
}
