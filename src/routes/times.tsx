import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/times')({ component: TimesPage })

function TimesPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-8 py-7">
      <h1 className="m-0 font-display text-3xl font-bold">Times</h1>
      <p className="mt-2 text-sm text-muted">Cadastro de times e importação de CSV chegam na etapa 2.</p>
    </main>
  )
}
