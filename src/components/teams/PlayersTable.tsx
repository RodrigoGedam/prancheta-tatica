import { useMemo, useState, type ReactNode } from 'react'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { DEFAULT_PLAYER_SORT, sortPlayers, togglePlayerSort, type PlayerSort, type PlayerSortColumn } from '@/lib/players/sort'
import type { PlayerRow } from '@/lib/supabase/schemas'
import { cn } from '@/lib/utils'

// Tabela do elenco com TanStack Table, usado só para colunas e células: nenhuma feature ligada.
// A ordenação é feita antes, por `sortPlayers`, porque "titulares primeiro" é regra de domínio.
const features = tableFeatures({})

const SORTABLE_COLUMNS: readonly string[] = ['number', 'name', 'position'] satisfies PlayerSortColumn[]

/** Guarda de tipo: depois deste teste, o TypeScript trata `columnId` como coluna ordenável. */
function isSortable(columnId: string): columnId is PlayerSortColumn {
  return SORTABLE_COLUMNS.includes(columnId)
}

const helper = createColumnHelper<typeof features, PlayerRow>()

/** Linhas identificadas pelo id do jogador (e não pelo índice), estáveis ao reordenar. */
const getRowId = (row: PlayerRow) => row.id

interface PlayersTableProps {
  players: PlayerRow[]
  numberColor: string
  /** Sem as ações, a tabela é só leitura (times padrão). */
  actions?: {
    onEdit: (player: PlayerRow) => void
    onDelete: (player: PlayerRow) => void
  }
}

function buildColumns(numberColor: string, actions: PlayersTableProps['actions']) {
  return helper.columns([
    helper.accessor('number', {
      header: 'Nº',
      cell: (info) => (
        <span className="font-display text-[17px] font-bold" style={{ color: numberColor }}>
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    helper.accessor('name', { header: 'Nome' }),
    helper.accessor('nickname', {
      header: 'Apelido',
      cell: (info) => <span className="text-ink-soft">{info.getValue() ?? '—'}</span>,
    }),
    helper.accessor('position', {
      header: 'Posição',
      cell: (info) => (
        <span className="rounded bg-chip px-2 py-0.5 text-xs font-semibold text-accent">{info.getValue()}</span>
      ),
    }),
    helper.accessor('is_starter', {
      header: 'Titular',
      cell: (info) => (
        <span className={cn('text-xs font-semibold', info.getValue() ? 'text-accent' : 'text-muted')}>
          {info.getValue() ? 'Titular' : 'Reserva'}
        </span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: () => (actions ? <span className="sr-only">Ações</span> : null),
      cell: ({ row }) =>
        actions ? (
          <div className="flex justify-end gap-1">
            <IconButton label={`Editar ${row.original.name}`} onClick={() => actions.onEdit(row.original)}>
              <PencilIcon size={16} aria-hidden="true" />
            </IconButton>
            <IconButton label={`Excluir ${row.original.name}`} onClick={() => actions.onDelete(row.original)} danger>
              <Trash2Icon size={16} aria-hidden="true" />
            </IconButton>
          </div>
        ) : null,
    }),
  ])
}

/** Elenco em tabela; clicar no cabeçalho de Nº, Nome ou Posição alterna a ordenação. */
export function PlayersTable({ players, numberColor, actions }: PlayersTableProps) {
  const [sort, setSort] = useState<PlayerSort>(DEFAULT_PLAYER_SORT)
  const sortedPlayers = useMemo(() => sortPlayers(players, sort), [players, sort])
  const columns = useMemo(() => buildColumns(numberColor, actions), [numberColor, actions])

  const table = useTable({
    features,
    columns,
    data: sortedPlayers,
    getRowId,
  })

  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="bg-surface-2 text-left">
              {group.headers.map((header) => {
                const columnId = header.column.id
                const sorted = sort.column === columnId ? (sort.desc ? 'desc' : 'asc') : false
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn(
                      'px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] text-muted uppercase',
                      columnId === 'number' && 'w-14',
                      columnId === 'actions' && 'w-20',
                    )}
                  >
                    {isSortable(columnId) ? (
                      <button
                        type="button"
                        onClick={() => setSort((current) => togglePlayerSort(current, columnId))}
                        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-inherit uppercase hover:text-ink"
                      >
                        <table.FlexRender header={header} />
                        {sorted === 'asc' ? <ArrowUpIcon size={12} aria-hidden="true" /> : null}
                        {sorted === 'desc' ? <ArrowDownIcon size={12} aria-hidden="true" /> : null}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-line hover:bg-surface-2/60">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-3.5 py-[9px]">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-muted',
        danger ? 'hover:bg-[#2b1510] hover:text-danger' : 'hover:bg-control hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
