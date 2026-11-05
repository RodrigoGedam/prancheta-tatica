import type { ReactNode } from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { buttonClasses } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
  error?: string | null
}

/** Confirmação de ação destrutiva. Fica aberta enquanto `pending`; quem chama fecha no sucesso. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending = false,
  error,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(6,9,12,0.85)]" />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-line-strong bg-surface p-6 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)] outline-none">
          <AlertDialogPrimitive.Title className="m-0 font-display text-2xl font-bold">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="m-0 text-sm leading-relaxed text-ink-soft">
            {description}
          </AlertDialogPrimitive.Description>
          {error ? (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2.5">
            <AlertDialogPrimitive.Cancel className={buttonClasses('secondary')} disabled={pending}>
              Cancelar
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              className={buttonClasses('danger')}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? 'Excluindo…' : confirmLabel}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
