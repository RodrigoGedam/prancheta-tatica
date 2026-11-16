import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { useSavePlayer } from '@/hooks/useTeamData'
import { starterProblem } from '@/lib/players/starters'
import { POSITIONS } from '@/lib/positions'
import { playerInputSchema, type PlayerRow } from '@/lib/supabase/schemas'
import { FieldError, FormAlert, inputClass, labelClass } from './shared'

// Schema dos campos como o formulário os tem (número é texto). Antes de gravar, o valor passa ainda por
// `playerInputSchema`, que é o formato do banco.
const playerFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do jogador.').max(80, 'Use no máximo 80 caracteres.'),
  number: z
    .string()
    .trim()
    .regex(/^(\d{1,2})?$/, 'Número deve ser de 0 a 99.'),
  nickname: z.string().trim().max(40, 'Use no máximo 40 caracteres.'),
  position: z.string().min(1, 'Informe a posição.'),
  is_starter: z.boolean(),
})

interface PlayerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  /** Elenco atual, para aplicar os limites de titulares. */
  roster: readonly PlayerRow[]
  /** Jogador a editar; null = novo jogador. */
  player: PlayerRow | null
  nextSortOrder: number
  onSaved: () => void
}

/** Cria ou edita um jogador. O formulário é montado a cada abertura (e por jogador, via `key`), sempre limpo. */
export function PlayerFormDialog({ open, onOpenChange, ...props }: PlayerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <PlayerForm key={props.player?.id ?? 'new'} {...props} /> : null}
    </Dialog>
  )
}

function PlayerForm({ teamId, roster, player, nextSortOrder, onSaved }: Omit<PlayerFormDialogProps, 'open' | 'onOpenChange'>) {
  const save = useSavePlayer(teamId)
  // Um jogador importado com posição desconhecida a mantém como opção, para editar sem perdê-la.
  const positions: readonly string[] =
    player && !(POSITIONS as readonly string[]).includes(player.position) ? [player.position, ...POSITIONS] : POSITIONS

  const form = useForm({
    defaultValues: {
      name: player?.name ?? '',
      number: player?.number?.toString() ?? '',
      nickname: player?.nickname ?? '',
      position: player?.position ?? '',
      is_starter: player?.is_starter ?? false,
    },
    validators: { onChange: playerFormSchema, onSubmit: playerFormSchema },
    onSubmit: async ({ value }) => {
      const v = playerFormSchema.parse(value)
      // Limite de titulares (11, um goleiro): o botão já fica desabilitado, mas o envio confere de novo.
      if (starterProblem(roster, { id: player?.id ?? null, position: v.position, is_starter: v.is_starter })) return
      const input = playerInputSchema.parse({
        name: v.name,
        number: v.number === '' ? null : Number(v.number),
        nickname: v.nickname,
        position: v.position,
        is_starter: v.is_starter,
      })
      await save.mutateAsync({ id: player?.id ?? null, input, sortOrder: nextSortOrder })
      onSaved()
    },
  })

  return (
    <DialogContent
      title={player ? 'Editar jogador' : 'Novo jogador'}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <form.Subscribe selector={(s) => [s.isSubmitting, s.values.position, s.values.is_starter] as const}>
            {([isSubmitting, position, isStarter]) => (
              <Button
                variant="primary"
                type="submit"
                form="player-form"
                disabled={
                  isSubmitting ||
                  starterProblem(roster, { id: player?.id ?? null, position, is_starter: isStarter }) !== null
                }
              >
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="player-form"
        className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-[18px]"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit().catch(() => undefined)
        }}
      >
        <form.Field name="number">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="player-number" className={labelClass}>
                Número
              </label>
              <input
                id="player-number"
                inputMode="numeric"
                maxLength={2}
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="player-name" className={labelClass}>
                Nome
              </label>
              <input
                id="player-name"
                className={inputClass}
                maxLength={80}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                autoFocus
              />
            </div>
          )}
        </form.Field>
        {/* Erros de número e nome numa linha só, abaixo dos dois campos lado a lado. */}
        <form.Subscribe selector={(s) => [s.fieldMeta.number?.errors ?? [], s.fieldMeta.name?.isTouched ? s.fieldMeta.name.errors : []] as const}>
          {([numberErrors, nameErrors]) =>
            numberErrors.length > 0 || nameErrors.length > 0 ? (
              <div className="col-span-2 -mt-3 flex flex-col">
                <FieldError errors={numberErrors} />
                <FieldError errors={nameErrors} />
              </div>
            ) : null
          }
        </form.Subscribe>
        <form.Field name="nickname">
          {(field) => (
            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="player-nickname" className={labelClass}>
                Apelido
              </label>
              <input
                id="player-nickname"
                className={inputClass}
                maxLength={40}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>
        <form.Field name="position">
          {(field) => (
            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="player-position" className={labelClass}>
                Posição
              </label>
              <select
                id="player-position"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
              >
                <option value="" disabled>
                  Escolha a posição
                </option>
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {field.state.meta.isTouched ? <FieldError errors={field.state.meta.errors} /> : null}
            </div>
          )}
        </form.Field>
        <form.Field name="is_starter">
          {(field) => (
            <label className="col-span-2 flex cursor-pointer items-center gap-2.5 text-[15px]">
              <input
                type="checkbox"
                className="size-4 accent-action"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              Titular
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => [s.values.position, s.values.is_starter] as const}>
          {([position, isStarter]) => {
            const problem = starterProblem(roster, { id: player?.id ?? null, position, is_starter: isStarter })
            return problem ? (
              <div className="col-span-2">
                <FormAlert>{problem}</FormAlert>
              </div>
            ) : null
          }}
        </form.Subscribe>
        {save.error ? (
          <div className="col-span-2">
            <FormAlert>{save.error.message}</FormAlert>
          </div>
        ) : null}
      </form>
    </DialogContent>
  )
}
