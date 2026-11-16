/** Limite de titulares por time no futebol de campo, incluindo um único goleiro. */
export const MAX_STARTERS = 11
export const GOALKEEPER_POSITION = 'GOL'

export interface StarterRosterPlayer {
  id: string
  name: string
  position: string
  is_starter: boolean
}

export interface StarterCandidate {
  /** null = jogador novo. */
  id: string | null
  position: string
  is_starter: boolean
}

/** Mensagem explicando por que o jogador não pode ser titular, ou null se pode. */
export function starterProblem(roster: readonly StarterRosterPlayer[], candidate: StarterCandidate): string | null {
  if (!candidate.is_starter) return null
  // Ao editar, exclui o próprio jogador da contagem para não ocupar duas vagas.
  const others = roster.filter((player) => player.is_starter && player.id !== candidate.id)
  if (candidate.position === GOALKEEPER_POSITION) {
    const goalkeeper = others.find((player) => player.position === GOALKEEPER_POSITION)
    if (goalkeeper) return `${goalkeeper.name} já é o goleiro titular. Tire-o dos titulares antes de escolher outro.`
  }
  if (others.length >= MAX_STARTERS) {
    return `O time já tem ${MAX_STARTERS} titulares. Tire um dos titulares antes de adicionar outro.`
  }
  return null
}
