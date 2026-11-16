import { useMemo, useState } from 'react'
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { SignInButton } from '@/components/AuthMenu'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useFormationCatalog } from '@/hooks/useFormations'
import { useCopyTeam, useDeletePlayer, useDeleteTeam, usePlayers } from '@/hooks/useTeamData'
import { lighten } from '@/lib/colors'
import { POSITIONS } from '@/lib/positions'
import type { TeamSummary } from '@/lib/supabase/queries'
import type { PlayerRow } from '@/lib/supabase/schemas'
import { isDefaultTeam } from '@/lib/teams/ownership'
import { useAuthStore } from '@/stores/authStore'
import { PlayerFormDialog } from './PlayerFormDialog'
import { PlayersTable } from './PlayersTable'
import { TeamDot, formatDate, inputClass } from './shared'

interface TeamPanelProps {
  team: TeamSummary
  onEditTeam: () => void
  onReimport: () => void
  onDeleted: () => void
  onCopied: (copyId: string) => void
}

/** Texto para busca sem acentos nem caixa: "João" e "joao" casam. */
function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/**
 * Painel de um time em /times: resumo, busca e filtro, tabela do elenco e as ações.
 * Times padrão são só leitura; quem está logado pode copiá-los para "Meus times".
 */
export function TeamPanel({ team, onEditTeam, onReimport, onDeleted, onCopied }: TeamPanelProps) {
  const players = usePlayers(team.id)
  const deleteTeam = useDeleteTeam()
  const deletePlayer = useDeletePlayer(team.id)
  const catalog = useFormationCatalog()
  const copy = useCopyTeam()
  const signedIn = useAuthStore((s) => s.user !== null)
  const readOnly = isDefaultTeam(team)

  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  // null = diálogo fechado; `{ player: null }` = novo jogador; `{ player }` = edição.
  const [editing, setEditing] = useState<{ player: PlayerRow | null } | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerRow | null>(null)
  const [confirmTeamDelete, setConfirmTeamDelete] = useState(false)

  const all = useMemo(() => players.data ?? [], [players.data])
  const starters = all.filter((p) => p.is_starter).length
  // Posições válidas e, no fim, as desconhecidas que aparecem no elenco (o CSV as aceita com aviso).
  const positionOptions = useMemo(() => {
    const extra = [...new Set(all.map((p) => p.position))].filter((p) => !(POSITIONS as readonly string[]).includes(p))
    return [...POSITIONS, ...extra.sort()]
  }, [all])

  const visible = useMemo(() => {
    const q = normalizeSearch(search)
    return all.filter(
      (p) =>
        (!position || p.position === position) &&
        (!q ||
          normalizeSearch(p.name).includes(q) ||
          normalizeSearch(p.nickname ?? '').includes(q) ||
          String(p.number ?? '') === q),
    )
  }, [all, search, position])

  // Um jogador novo entra depois do último na ordem de cadastro.
  const nextSortOrder = all.reduce((max, p) => Math.max(max, p.sort_order), -1) + 1

  // Ações memoizadas: um objeto novo a cada render faria PlayersTable recriar as colunas.
  const resetDeletePlayer = deletePlayer.reset
  const tableActions = useMemo(
    () =>
      readOnly
        ? undefined
        : {
            onEdit: (player: PlayerRow) => setEditing({ player }),
            onDelete: (player: PlayerRow) => {
              resetDeletePlayer()
              setDeletingPlayer(player)
            },
          },
    [readOnly, resetDeletePlayer],
  )

  return (
    <section
      aria-label="Jogadores do time"
      className="flex min-w-0 flex-[999_1_640px] flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-[22px]"
    >
      <div className="flex flex-wrap items-center gap-3.5">
        <TeamDot color={team.color} size={44} />
        <div className="flex min-w-[200px] flex-1 flex-col">
          <h2 className="m-0 font-display text-[28px] font-bold">{team.name}</h2>
          <span className="text-[13px] text-muted">
            {team.playerCount} {team.playerCount === 1 ? 'jogador' : 'jogadores'} · {starters}{' '}
            {starters === 1 ? 'titular' : 'titulares'} · formação padrão {catalog.resolve(team.default_formation).name} · atualizado em {formatDate(team.updated_at)}
          </span>
        </div>
        {readOnly ? (
          signedIn ? (
            <Button
              variant="primary"
              disabled={copy.isPending}
              onClick={() => copy.mutate(team.id, { onSuccess: onCopied })}
            >
              <CopyIcon size={16} aria-hidden="true" />
              {copy.isPending ? 'Copiando…' : 'Copiar para Meus times'}
            </Button>
          ) : (
            <SignInButton variant="primary" label="Entre para copiar" />
          )
        ) : (
          <>
            <Button variant="primary" onClick={onReimport}>
              <UploadIcon size={16} aria-hidden="true" />
              Reimportar CSV
            </Button>
            <Button onClick={onEditTeam}>
              <PencilIcon size={15} aria-hidden="true" />
              Editar time
            </Button>
            <Button
              variant="danger"
              size="icon"
              aria-label="Excluir time"
              title="Excluir time"
              onClick={() => {
                deleteTeam.reset()
                setConfirmTeamDelete(true)
              }}
            >
              <Trash2Icon size={17} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {copy.error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {copy.error.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <label htmlFor="player-search" className="sr-only">
          Buscar jogador
        </label>
        <input
          id="player-search"
          type="search"
          placeholder="Buscar jogador…"
          className={`${inputClass} h-[38px] min-w-[200px] flex-1 text-sm`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="position-filter" className="sr-only">
          Filtrar posição
        </label>
        <select
          id="position-filter"
          className={`${inputClass} h-[38px] text-sm`}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">Todas as posições</option>
          {positionOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {readOnly ? null : (
          <Button onClick={() => setEditing({ player: null })}>
            <PlusIcon size={16} aria-hidden="true" />
            Jogador
          </Button>
        )}
      </div>

      {players.isPending ? (
        <p className="m-0 text-sm text-muted">Carregando jogadores…</p>
      ) : players.isError ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {players.error.message}
        </p>
      ) : all.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          {readOnly ? 'Nenhum jogador.' : 'Nenhum jogador. Importe um CSV ou adicione jogadores.'}
        </p>
      ) : visible.length === 0 ? (
        <p className="m-0 text-sm text-muted">Nenhum jogador encontrado com esses filtros.</p>
      ) : (
        <PlayersTable
          key={team.id}
          players={visible}
          numberColor={lighten(team.color)}
          actions={tableActions}
        />
      )}

      <PlayerFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        teamId={team.id}
        roster={all}
        player={editing?.player ?? null}
        nextSortOrder={nextSortOrder}
        onSaved={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deletingPlayer !== null}
        onOpenChange={(open) => !open && setDeletingPlayer(null)}
        title="Excluir jogador?"
        description={
          <>
            <strong>{deletingPlayer?.name}</strong> será removido de {team.name}.
          </>
        }
        confirmLabel="Excluir jogador"
        pending={deletePlayer.isPending}
        error={deletePlayer.error?.message}
        onConfirm={() => {
          if (deletingPlayer) deletePlayer.mutate(deletingPlayer.id, { onSuccess: () => setDeletingPlayer(null) })
        }}
      />

      <ConfirmDialog
        open={confirmTeamDelete}
        onOpenChange={setConfirmTeamDelete}
        title="Excluir time?"
        description={
          <>
            O time <strong>{team.name}</strong> e seus {team.playerCount}{' '}
            {team.playerCount === 1 ? 'jogador' : 'jogadores'} serão excluídos. Não dá para desfazer.
          </>
        }
        confirmLabel="Excluir time"
        pending={deleteTeam.isPending}
        error={deleteTeam.error?.message}
        onConfirm={() =>
          deleteTeam.mutate(team.id, {
            onSuccess: () => {
              setConfirmTeamDelete(false)
              onDeleted()
            },
          })
        }
      />
    </section>
  )
}
