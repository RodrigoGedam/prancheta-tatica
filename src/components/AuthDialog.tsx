import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { FieldError, FormAlert, inputClass, labelClass } from '@/components/teams/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { signInSchema, signUpSchema, type SignUpCredentials } from '@/lib/auth/credentials'
import { cn } from '@/lib/utils'
import { signInWithPassword, signUpWithPassword } from '@/stores/authStore'

type Mode = 'signIn' | 'signUp'

const TABS: readonly { id: Mode; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
]

/** Entrar com e-mail e senha ou criar conta com nome, e-mail e senha. */
export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{open ? <AuthContent onDone={() => onOpenChange(false)} /> : null}</Dialog>
}

function AuthContent({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('signIn')

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
    </DialogContent>
  )
}

function CredentialsForm({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const schema = mode === 'signIn' ? signInSchema.extend({ name: z.string() }) : signUpSchema
  const submit = useMutation({
    mutationFn: (credentials: SignUpCredentials) => mode === 'signIn' ? signInWithPassword(credentials) : signUpWithPassword(credentials),
    onSuccess: onDone,
  })
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      await submit.mutateAsync(value)
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
      {mode === 'signUp' ? (
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-name" className={labelClass}>
                Nome
              </label>
              <input
                id="auth-name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                aria-describedby={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'auth-name-error' : undefined}
                autoFocus
              />
              {field.state.meta.isTouched ? <span id="auth-name-error"><FieldError errors={field.state.meta.errors} /></span> : null}
            </div>
          )}
        </form.Field>
      ) : null}
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
              autoFocus={mode === 'signIn'}
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
