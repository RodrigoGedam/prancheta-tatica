import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { FieldError, FormAlert, inputClass, labelClass } from '@/components/teams/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { signInSchema, signUpSchema } from '@/lib/auth/credentials'
import { cn } from '@/lib/utils'
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '@/stores/authStore'

type Mode = 'signIn' | 'signUp'

const TABS: readonly { id: Mode; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
]

/** Entrar ou criar conta, com e-mail e senha ou com Google. */
export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{open ? <AuthContent onDone={() => onOpenChange(false)} /> : null}</Dialog>
}

function AuthContent({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('signIn')
  const google = useMutation({ mutationFn: signInWithGoogle })

  return (
    <DialogContent title={mode === 'signIn' ? 'Entrar' : 'Criar conta'} description="Seus times e formações ficam só na sua conta." className="max-w-md">
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 gap-1 rounded-lg bg-control p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => setMode(tab.id)}
            className={cn(
              'h-8 cursor-pointer rounded-md border-0 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              mode === tab.id ? 'bg-surface text-ink' : 'bg-transparent text-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CredentialsForm key={mode} mode={mode} onDone={onDone} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        ou
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      <Button disabled={google.isPending} onClick={() => google.mutate()}>
        Entrar com Google
      </Button>
      {google.error ? <FormAlert>{google.error.message}</FormAlert> : null}
    </DialogContent>
  )
}

function CredentialsForm({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const schema = mode === 'signIn' ? signInSchema : signUpSchema
  const submit = useMutation({ mutationFn: mode === 'signIn' ? signInWithPassword : signUpWithPassword, onSuccess: onDone })
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      await submit.mutateAsync(schema.parse(value))
    },
  })

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit().catch(() => undefined)
      }}
    >
      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className={labelClass}>
              E-mail
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              className={inputClass}
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
      <form.Field name="password">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className={labelClass}>
              Senha
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              className={inputClass}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
            />
            {field.state.meta.isTouched ? <FieldError errors={field.state.meta.errors} /> : null}
          </div>
        )}
      </form.Field>
      {mode === 'signUp' ? (
        <p className="m-0 text-[13px] text-muted">
          <strong className="text-ink-soft">Guarde sua senha:</strong> não há como recuperá-la. O e-mail não é verificado.
        </p>
      ) : null}
      {submit.error ? <FormAlert>{submit.error.message}</FormAlert> : null}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aguarde…' : mode === 'signIn' ? 'Entrar' : 'Criar conta'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
