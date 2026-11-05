import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-accent font-bold text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-control text-ink hover:bg-surface-2',
  danger: 'border border-[#4a2a2a] bg-[#241a1c] text-danger hover:bg-[#2e1f22]',
  ghost: 'border border-transparent bg-transparent text-muted hover:bg-control hover:text-ink',
} as const

const sizes = {
  md: 'h-[38px] px-3.5 text-sm',
  sm: 'h-8 px-2.5 text-[13px]',
  icon: 'size-[38px] p-0',
  'icon-sm': 'size-[30px] p-0',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md'): string {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap no-underline transition-colors',
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
  )
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp type={asChild ? undefined : type} className={cn(buttonClasses(variant, size), className)} {...props} />
}
