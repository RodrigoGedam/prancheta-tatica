import { useForm } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { useFormationCatalog } from '@/hooks/useFormations'
import { useCreateTeam, useUpdateTeam } from '@/hooks/useTeamData'
import type { TeamSummary } from '@/lib/supabase/queries'
import { teamFormSchema } from '@/lib/supabase/schemas'
import { DEFAULT_FORMATION } from '@/stores/boardStore'
import { ColorPicker, FieldError, FormAlert, inputClass, labelClass } from './shared'

interface TeamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Time a editar; ausente = criar um novo. */
  team?: TeamSummary
  defaultColor: string
  onSaved: (teamId: string) => void
}

/** Cria ou edita um time (nome, cor e formação padrão). */
export function TeamFormDialog({ open, onOpenChange, team, defaultColor, onSaved }: TeamFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TeamForm key={team?.id ?? 'new'} team={team} defaultColor={defaultColor} onSaved={onSaved} />
      ) : null}
    </Dialog>
  )
}

function TeamForm({ team, defaultColor, onSaved }: Omit<TeamFormDialogProps, 'open' | 'onOpenChange'>) {
  const create = useCreateTeam()
  const update = useUpdateTeam()
  const mutation = team ? update : create
  const catalog = useFormationCatalog()

  const form = useForm({
    defaultValues: {
      name: team?.name ?? '',
      color: team?.color ?? defaultColor,
      default_formation: team?.default_formation ?? DEFAULT_FORMATION,
    },
    validators: { onChange: teamFormSchema, onSubmit: teamFormSchema },
    onSubmit: async ({ value }) => {
      const input = teamFormSchema.parse(value)
      const saved = team ? await update.mutateAsync({ id: team.id, input }) : await create.mutateAsync(input)
      onSaved(saved.id)
    },
  })

  return (
    <DialogContent
      title={team ? 'Editar time' : 'Novo time'}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button variant="primary" type="submit" form="team-form" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : team ? 'Salvar' : 'Criar time'}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="team-form"
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit().catch(() => undefined)
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="team-name" className={labelClass}>
                Nome do time
              </label>
              <input
                id="team-name"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                maxLength={40}
                autoFocus
              />
              {field.state.meta.isTouched ? <FieldError errors={field.state.meta.errors} /> : null}
            </div>
          )}
        </form.Field>
        <form.Field name="color">
          {(field) => <ColorPicker value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="default_formation">
          {(field) => {
            // Formação padrão que não está no catálogo (custom excluída ou ainda carregando): ganha uma opção
            // própria para o select não mostrar outra no lugar; na prancheta, o time usa a padrão do app.
            const known = [...catalog.fixed, ...catalog.custom].some((f) => f.id === field.state.value)
            return (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="team-formation" className={labelClass}>
                  Formação padrão
                </label>
                <select
                  id="team-formation"
                  className={inputClass}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {known ? null : (
                    <option value={field.state.value}>
                      {catalog.isSettled ? `Formação excluída (usa ${DEFAULT_FORMATION})` : 'Carregando…'}
                    </option>
                  )}
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
                </select>
                <span className="text-[13px] text-muted">Aparece na prancheta ao selecionar este time.</span>
              </div>
            )
          }}
        </form.Field>
        {mutation.error ? <FormAlert>{mutation.error.message}</FormAlert> : null}
      </form>
    </DialogContent>
  )
}
