import { useState, type ReactNode } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import type { PlayerRow } from '@/lib/supabase/schemas'
import { cn } from '@/lib/utils'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})

const helper = createColumnHelper<typeof features, PlayerRow>()

interface PlayersTableProps {
  players: PlayerRow[]
  numberColor: string
  onEdit: (player: PlayerRow) => void
  onDelete: (player: PlayerRow) => void
}

export function PlayersTable({ players, numberColor, onEdit, onDelete }: PlayersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = helper.columns([
    helper.accessor('number', {
      header: 'Nº',
      sortFn: 'basic',
      sortUndefined: 'last',
      cell: (info) => (
        <span className="font-display text-[17px] font-bold" style={{ color: numberColor }}>
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    helper.accessor('name', { header: 'Nome', sortFn: 'alphanumeric' }),
    helper.accessor('nickname', {
      header: 'Apelido',
      enableSorting: false,
      cell: (info) => <span className="text-ink-soft">{info.getValue() ?? '—'}</span>,
    }),
    helper.accessor('position', {
      header: 'Posição',
      sortFn: 'alphanumeric',
      cell: (info) => (
        <span className="rounded bg-[#2a343e] px-2 py-0.5 text-xs font-semibold">{info.getValue()}</span>
      ),
    }),
    helper.accessor('is_starter', {
      header: 'Titular',
      sortFn: 'basic',
      cell: (info) => (
        <span className={cn('text-xs font-semibold', info.getValue() ? 'text-accent' : 'text-muted')}>
          {info.getValue() ? 'Titular' : 'Reserva'}
        </span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <IconButton label={`Editar ${row.original.name}`} onClick={() => onEdit(row.original)}>
            <PencilIcon size={16} aria-hidden="true" />
          </IconButton>
          <IconButton label={`Excluir ${row.original.name}`} onClick={() => onDelete(row.original)} danger>
            <Trash2Icon size={16} aria-hidden="true" />
          </IconButton>
        </div>
      ),
    }),
  ])

  const table = useTable({
    features,
    columns,
    data: players,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  })

  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="bg-surface-2 text-left">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const canSort = header.column.getCanSort()
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn(
                      'px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] text-muted uppercase',
                      header.column.id === 'number' && 'w-14',
                      header.column.id === 'actions' && 'w-20',
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
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
            <tr key={row.id} className="border-t border-[#222b34] hover:bg-surface-2/60">
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
        danger ? 'hover:bg-[#241a1c] hover:text-danger' : 'hover:bg-control hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
