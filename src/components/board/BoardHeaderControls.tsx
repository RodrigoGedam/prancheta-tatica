import { useState } from 'react'
import { BoardColorButton } from './boardColors'
import { useFormationCatalog } from '@/hooks/useFormations'
import { useTeams } from '@/hooks/useTeamData'
import type { TeamSummary } from '@/lib/supabase/queries'
import { groupTeams } from '@/lib/teams/ownership'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { ManageFormationsDialog } from './ManageFormationsDialog'
import { ResetBoardButton } from './ResetBoardButton'
import { SIDE_LABEL, useSideActions, useSideModel, type SideModel } from './useBoardModel'

const selectClass =
  'h-9 rounded-lg border border-line-strong bg-control px-2.5 text-sm text-ink outline-none focus:border-accent/70 disabled:opacity-50'
const MANAGE = '__manage__'

/** Seletores de time e formação (centro do cabeçalho, só na prancheta). */
export function BoardHeaderControls() {
  const away = useSideModel('away')
  const home = useSideModel('home')
  const [managing, setManaging] = useState(false)
  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-3">
      <SideControls model={away} otherTeamId={home.state.teamId} onManage={() => setManaging(true)} />
      <span aria-hidden="true" className="font-display text-lg text-faint">
        ×
      </span>
      <SideControls model={home} otherTeamId={away.state.teamId} onManage={() => setManaging(true)} />
      <ResetBoardButton />
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
  const signedIn = useAuthStore((s) => s.user !== null)
  const { mine, defaults } = groupTeams(teams.data ?? [])
  const { side } = model
  const id = `team-${side}`

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <BoardColorButton model={model} />
      <label htmlFor={id} className="text-[11px] tracking-[0.06em] text-muted uppercase">
        {SIDE_LABEL[side]}
      </label>
      <select
        id={id}
        className={`${selectClass} w-[150px] truncate font-semibold`}
        value={model.state.teamId ?? ''}
        onChange={(e) => {
          const teamId = e.target.value || null
          setTeam(side, teamId, teams.data?.find((t) => t.id === teamId)?.default_formation)
        }}
        disabled={!teams.isSuccess}
      >
        <option value="">{teams.isPending ? 'Carregando…' : 'Escolha o time'}</option>
        {mine.length > 0 ? (
          <optgroup label="Meus times">
            {mine.map((t) => (
              <TeamOption key={t.id} team={t} otherTeamId={otherTeamId} />
            ))}
          </optgroup>
        ) : null}
        <optgroup label="Série A 2026">
          {defaults.map((t) => (
            <TeamOption key={t.id} team={t} otherTeamId={otherTeamId} />
          ))}
        </optgroup>
      </select>
      <select
        aria-label={`Formação do ${SIDE_LABEL[side].toLowerCase()}`}
        // Largura fixa: sem ela o navegador dimensiona pela opção mais longa ("Gerenciar formações…").
        className={`${selectClass} w-[96px] truncate`}
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
        {signedIn ? <option value={MANAGE}>Gerenciar formações…</option> : null}
      </select>
    </div>
  )
}

function TeamOption({ team, otherTeamId }: { team: TeamSummary; otherTeamId: string | null }) {
  const taken = team.id === otherTeamId
  return (
    <option value={team.id} disabled={taken}>
      {team.name}
      {taken ? ' (no outro lado)' : ''}
    </option>
  )
}

