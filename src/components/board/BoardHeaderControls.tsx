import { useState } from 'react'
import { UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportCsvDialog } from '@/components/teams/ImportCsvDialog'
import { useFormationCatalog } from '@/hooks/useFormations'
import { useTeams } from '@/hooks/useTeamData'
import { useBoardStore } from '@/stores/boardStore'
import { ManageFormationsDialog } from './ManageFormationsDialog'
import { SIDES, SIDE_LABEL, useSideActions, useSideModel, type SideModel } from './useBoardModel'

const selectClass =
  'h-9 rounded-lg border border-line-strong bg-control px-2.5 text-sm text-ink outline-none focus:border-accent/70 disabled:opacity-50'
const MANAGE = '__manage__'

/** Seletores de time e formação (centro do cabeçalho, só na prancheta). */
export function BoardHeaderControls() {
  const away = useSideModel('away')
  const home = useSideModel('home')
  const [managing, setManaging] = useState(false)
  return (
    <div className="flex flex-1 flex-wrap items-center justify-center gap-3.5">
      <SideControls model={away} otherTeamId={home.state.teamId} onManage={() => setManaging(true)} />
      <span aria-hidden="true" className="font-display text-lg text-faint">
        ×
      </span>
      <SideControls model={home} otherTeamId={away.state.teamId} onManage={() => setManaging(true)} />
      <ManageFormationsDialog open={managing} onOpenChange={setManaging} />
    </div>
  )
}

function SideControls({
  model,
  otherTeamId,
  onManage,
}: {
  model: SideModel
  otherTeamId: string | null
  onManage: () => void
}) {
  const teams = useTeams()
  const catalog = useFormationCatalog()
  const actions = useSideActions(model)
  const setTeam = useBoardStore((s) => s.setTeam)
  const { side } = model
  const id = `team-${side}`

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: model.team ? model.color : '#3a4652' }} />
      <label htmlFor={id} className="text-xs tracking-[0.08em] text-muted uppercase">
        {SIDE_LABEL[side]}
      </label>
      <select
        id={id}
        className={`${selectClass} max-w-[190px] font-semibold`}
        value={model.state.teamId ?? ''}
        onChange={(e) => setTeam(side, e.target.value || null)}
        disabled={!teams.isSuccess}
      >
        <option value="">{teams.isPending ? 'Carregando…' : 'Escolha o time'}</option>
        {(teams.data ?? []).map((t) => (
          <option key={t.id} value={t.id} disabled={t.id === otherTeamId}>
            {t.name}
            {t.id === otherTeamId ? ' (no outro lado)' : ''}
          </option>
        ))}
      </select>
      <select
        aria-label={`Formação do ${SIDE_LABEL[side].toLowerCase()}`}
        className={selectClass}
        value={model.formation.id}
        onChange={(e) => {
          if (e.target.value === MANAGE) onManage()
          else actions.chooseFormation(e.target.value)
        }}
      >
        {catalog.fixed.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        {catalog.custom.length > 0 ? (
          <optgroup label="Minhas formações">
            {catalog.custom.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        <option value={MANAGE}>Gerenciar formações…</option>
      </select>
    </div>
  )
}

/** Botão "Importar CSV" da prancheta: o time importado entra no primeiro lado vazio. */
export function BoardImportButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="primary" className="ml-1.5 h-9" onClick={() => setOpen(true)}>
        <UploadIcon size={16} aria-hidden="true" />
        Importar CSV
      </Button>
      <ImportCsvDialog
        open={open}
        onOpenChange={setOpen}
        onImported={(teamId) => {
          setOpen(false)
          const { sides, setTeam } = useBoardStore.getState()
          if (SIDES.some((s) => sides[s].teamId === teamId)) return
          const empty = (['home', 'away'] as const).find((s) => !sides[s].teamId)
          if (empty) setTeam(empty, teamId)
        }}
      />
    </>
  )
}
