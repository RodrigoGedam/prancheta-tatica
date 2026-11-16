import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FIXED_FORMATIONS, getFixedFormation, type FormationDef } from '@/lib/formations'
import { createFormation, deleteFormation, fetchFormations, renameFormation } from '@/lib/supabase/queries'
import type { FormationSlot } from '@/lib/supabase/schemas'
import { DEFAULT_FORMATION } from '@/stores/boardStore'

/** Chave do cache das formações customizadas (as fixas ficam no código, fora do Supabase). */
const formationKeys = { all: ['formations'] as const }

/** Formações customizadas do usuário. Para visitantes a RLS não devolve nenhuma linha. */
export function useCustomFormations() {
  return useQuery({ queryKey: formationKeys.all, queryFn: fetchFormations })
}

/**
 * Fixas + customizadas, e um resolvedor que cai na formação padrão se o id sumiu (ex.: custom excluída).
 * `isLoaded`: a lista chegou com sucesso. `isSettled`: a busca terminou, com sucesso ou erro.
 */
export function useFormationCatalog() {
  const custom = useCustomFormations()
  // useMemo mantém o mesmo objeto entre renders enquanto os dados não mudam: quem depende do catálogo
  // (useSideModel, useBoardSync) não recalcula à toa.
  return useMemo(() => {
    const customDefs: FormationDef[] = (custom.data ?? []).map((f) => ({ id: f.id, name: f.name, slots: f.slots }))
    const resolve = (id: string): FormationDef =>
      getFixedFormation(id) ??
      customDefs.find((f) => f.id === id) ??
      getFixedFormation(DEFAULT_FORMATION) ??
      (FIXED_FORMATIONS[0] as FormationDef)
    return { fixed: FIXED_FORMATIONS, custom: customDefs, resolve, isLoaded: custom.isSuccess, isSettled: !custom.isPending }
  }, [custom.data, custom.isSuccess, custom.isPending])
}

export function useCreateFormation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, slots }: { name: string; slots: FormationSlot[] }) => createFormation(name, slots),
    onSuccess: () => qc.invalidateQueries({ queryKey: formationKeys.all }),
  })
}

export function useRenameFormation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFormation(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: formationKeys.all }),
  })
}

export function useDeleteFormation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFormation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formationKeys.all }),
  })
}
