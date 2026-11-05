import type { ComponentProps, ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
}

/** Diálogo no padrão do mockup: cabeçalho com título e fechar, corpo e rodapé opcional. */
export function DialogContent({ className, title, description, footer, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(6,9,12,0.85)]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-4rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-2xl border border-line-strong bg-surface text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)] outline-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogPrimitive.Title className="m-0 font-display text-[28px] leading-none font-bold">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="m-0 text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted hover:bg-control hover:text-ink"
          >
            <XIcon size={18} aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line px-6 py-4">{footer}</div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
