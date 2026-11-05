import { useMemo } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { FieldError, FormAlert, inputClass, labelClass } from '@/components/teams/shared'
import { useCreateFormation } from '@/hooks/useFormations'
import { buildCustomSlots, validateCustomFormation } from '@/lib/formations'
import { useBoardStore } from '@/stores/boardStore'
import { SIDE_LABEL, type SideModel } from './useBoardModel'

export const formationNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome da formação.')
  .max(40, 'Use no máximo 40 caracteres.')

interface SaveFormationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: SideModel
}

export function SaveFormationDialog({ open, onOpenChange, model }: SaveFormationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <SaveFormationForm model={model} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  )
}

function SaveFormationForm({ model, onDone }: { model: SideModel; onDone: () => void }) {
  const create = useCreateFormation()
  const validation = useMemo(
    () =>
      validateCustomFormation(
        buildCustomSlots(
          model.onPitch.map(({ player, placement }) => ({ position: player.position, point: placement })),
          model.side,
        ),
      ),
    [model.onPitch, model.side],
  )

  const form = useForm({
    defaultValues: { name: '' },
    validators: { onChange: z.object({ name: formationNameSchema }), onSubmit: z.object({ name: formationNameSchema }) },
    onSubmit: async ({ value }) => {
      if (!validation.ok) return
      const saved = await create.mutateAsync({ name: formationNameSchema.parse(value.name), slots: validation.slots })
      useBoardStore.getState().setFormationId(model.side, saved.id)
      onDone()
    },
  })

  return (
    <DialogContent
      title="Salvar como formação"
      description={`Usa as posições atuais do ${SIDE_LABEL[model.side].toLowerCase()} (${model.team?.name ?? ''}).`}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button variant="primary" type="submit" form="formation-form" disabled={isSubmitting || !validation.ok}>
                {isSubmitting ? 'Salvando…' : 'Salvar formação'}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="formation-form"
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit().catch(() => undefined)
        }}
      >
        {validation.ok ? (
          <p className="m-0 text-sm text-ink-soft">
            11 jogadores em campo, um goleiro. A formação vale para os dois lados (é espelhada para o time de cima).
          </p>
        ) : (
          <div role="alert" className="flex flex-col gap-1.5 rounded-lg border border-[#5c4a16] bg-[#2a2312] px-3.5 py-3">
            <span className="text-sm font-semibold text-warning">Ainda não dá para salvar:</span>
            <ul className="m-0 flex flex-col gap-0.5 pl-5 text-sm text-[#f5e6b0]">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <span className="text-xs text-muted">Posições inválidas se corrigem na página Times.</span>
          </div>
        )}
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="formation-name" className={labelClass}>
                Nome da formação
              </label>
              <input
                id="formation-name"
                className={inputClass}
                maxLength={40}
                placeholder="Ex.: 4-1-4-1 pressão alta"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                autoFocus
              />
              {field.state.meta.isTouched ? <FieldError errors={field.state.meta.errors} /> : null}
            </div>
          )}
        </form.Field>
        {create.error ? <FormAlert>{create.error.message}</FormAlert> : null}
      </form>
    </DialogContent>
  )
}
