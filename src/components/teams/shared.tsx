import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Cores oferecidas para os times (as do mockup). */
export const TEAM_COLORS = [
  { label: 'Azul', hex: '#2563EB' },
  { label: 'Laranja', hex: '#C2410C' },
  { label: 'Verde', hex: '#15803D' },
  { label: 'Vermelho', hex: '#B91C1C' },
  { label: 'Roxo', hex: '#7C3AED' },
  { label: 'Preto', hex: '#1F2937' },
  { label: 'Branco', hex: '#F3F4F6' },
] as const

/** Primeira cor da paleta que nenhum time usa ainda (ou a primeira, se todas estiverem em uso). */
export function firstFreeColor(used: readonly string[]): string {
  const taken = new Set(used.map((c) => c.toUpperCase()))
  return (TEAM_COLORS.find((c) => !taken.has(c.hex)) ?? TEAM_COLORS[0]).hex
}

export const inputClass =
  'h-10 rounded-lg border border-line-strong bg-control px-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-focus aria-invalid:border-danger'

export const labelClass = 'text-xs font-semibold tracking-[0.06em] text-muted uppercase'

export function TeamDot({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="box-border shrink-0 rounded-full border-2 border-white/85"
      style={{ width: size, height: size, background: color }}
    />
  )
}

export function FieldError({ errors }: { errors: readonly unknown[] }) {
  const message = errors
    .map((e) => (typeof e === 'string' ? e : e && typeof e === 'object' && 'message' in e ? String(e.message) : ''))
    .find(Boolean)
  return message ? <span className="text-[13px] text-danger">{message}</span> : null
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 rounded-lg border border-[#57291b] bg-[#2b1510] px-3.5 py-2.5 text-sm text-danger">
      {children}
    </p>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className={cn(labelClass, 'mb-1.5 p-0')}>Cor</legend>
      <div role="radiogroup" aria-label="Cor do time" className="flex h-10 items-center gap-2">
        {TEAM_COLORS.map((c) => {
          const selected = c.hex.toUpperCase() === value.toUpperCase()
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Cor ${c.label.toLowerCase()}`}
              title={c.label}
              onClick={() => onChange(c.hex)}
              className={cn(
                'size-7 cursor-pointer rounded-full border-[3px] p-0 outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                selected ? 'border-accent' : 'border-surface',
              )}
              style={{ background: c.hex, boxShadow: selected ? undefined : '0 0 0 1px var(--color-edge)' }}
            />
          )
        })}
      </div>
    </fieldset>
  )
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}
