import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LogInIcon, LogOutIcon, Trash2Icon, UserRoundIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteAccount, displayName, signOut, useAuthStore } from '@/stores/authStore'
import { AuthDialog } from './AuthDialog'

const menuItem =
  'flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-sm outline-none hover:bg-control focus-visible:ring-2 focus-visible:ring-accent/60'

/** Botão que abre o diálogo de entrar, usado no cabeçalho e nos convites para quem não tem conta. */
export function SignInButton({ variant = 'secondary', label = 'Entrar' }: { variant?: 'primary' | 'secondary'; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <LogInIcon size={15} aria-hidden="true" />
        {label}
      </Button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/** Cabeçalho: entrar ou, com sessão, sair e excluir a conta. */
export function AuthMenu() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({ mutationFn: deleteAccount, onSuccess: () => setConfirming(false) })

  if (!user) return <SignInButton />

  const name = displayName(user)
  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button size="icon" aria-label={`Conta de ${name}`} title={name}>
            <UserRoundIcon size={17} aria-hidden="true" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={8}
            align="end"
            className="z-50 flex w-64 flex-col gap-1 rounded-xl border border-line-strong bg-surface p-3 text-ink shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
          >
            <span className="truncate px-2 font-semibold">{name}</span>
            {user.email && user.email !== name ? <span className="truncate px-2 pb-1 text-xs text-muted">{user.email}</span> : null}
            <button
              type="button"
              className={`${menuItem} text-ink`}
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
            >
              <LogOutIcon size={15} aria-hidden="true" />
              Sair
            </button>
            <button
              type="button"
              className={`${menuItem} text-danger`}
              onClick={() => {
                setOpen(false)
                remove.reset()
                setConfirming(true)
              }}
            >
              <Trash2Icon size={15} aria-hidden="true" />
              Excluir conta
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir conta?"
        description="Sua conta, seus times e suas formações serão apagados. Não dá para desfazer."
        confirmLabel="Excluir conta"
        pending={remove.isPending}
        error={remove.error?.message}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}
