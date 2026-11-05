import { useState } from 'react'
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormAlert, inputClass } from '@/components/teams/shared'
import { useCustomFormations, useDeleteFormation, useRenameFormation } from '@/hooks/useFormations'
import type { FormationRow } from '@/lib/supabase/schemas'
import { cn } from '@/lib/utils'
import { formationNameSchema } from './SaveFormationDialog'

const iconButton =
  'flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-muted hover:bg-control hover:text-ink disabled:opacity-40'

export function ManageFormationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const formations = useCustomFormations()
  const remove = useDeleteFormation()
  const [deleting, setDeleting] = useState<FormationRow | null>(null)
  const list = formations.data ?? []

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {open ? (
          <DialogContent
            title="Minhas formações"
            description="Para criar, monte os 11 em campo e use “Salvar como formação” no banco do time."
          >
            {formations.isPending ? <p className="m-0 text-sm text-muted">Carregando…</p> : null}
            {formations.isError ? <FormAlert>{formations.error.message}</FormAlert> : null}
            {formations.isSuccess && list.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nenhuma formação customizada ainda.</p>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {list.map((f) => (
                <FormationItem
                  key={f.id}
                  formation={f}
                  onDelete={() => {
                    remove.reset()
                    setDeleting(f)
                  }}
                />
              ))}
            </ul>
          </DialogContent>
        ) : null}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir formação?"
        description={
          <>
            A formação <strong>{deleting?.name}</strong> será excluída. Quem estiver usando volta para a formação padrão.
          </>
        }
        confirmLabel="Excluir formação"
        pending={remove.isPending}
        error={remove.error?.message}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

function FormationItem({ formation, onDelete }: { formation: FormationRow; onDelete: () => void }) {
  const rename = useRenameFormation()
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? null : formationNameSchema.safeParse(draft)
  const error = parsed && !parsed.success ? parsed.error.issues[0]?.message : (rename.error?.message ?? null)

  function save() {
    if (!parsed?.success) return
    rename.mutate({ id: formation.id, name: parsed.data }, { onSuccess: () => setDraft(null) })
  }

  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-2">
        {draft === null ? (
          <span className="flex-1 truncate text-[15px] font-semibold">{formation.name}</span>
        ) : (
          <input
            aria-label="Novo nome"
            className={cn(inputClass, 'h-9 flex-1 text-sm')}
            value={draft}
            maxLength={40}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') {
                e.stopPropagation()
                setDraft(null)
              }
            }}
            aria-invalid={Boolean(error)}
          />
        )}
        {draft === null ? (
          <>
            <button type="button" className={iconButton} aria-label={`Renomear ${formation.name}`} onClick={() => setDraft(formation.name)}>
              <PencilIcon size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(iconButton, 'hover:bg-[#241a1c] hover:text-danger')}
              aria-label={`Excluir ${formation.name}`}
              onClick={onDelete}
            >
              <Trash2Icon size={15} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className={iconButton} aria-label="Salvar nome" disabled={rename.isPending} onClick={save}>
              <CheckIcon size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label="Cancelar"
              onClick={() => {
                rename.reset()
                setDraft(null)
              }}
            >
              <XIcon size={16} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {draft !== null && error ? <span className="text-[13px] text-danger">{error}</span> : null}
    </li>
  )
}
