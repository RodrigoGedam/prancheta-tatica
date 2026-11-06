interface Owned {
  user_id: string | null
}

export function isDefaultTeam(team: Owned): boolean {
  return team.user_id === null
}

export function groupTeams<T extends Owned>(teams: readonly T[]): { mine: T[]; defaults: T[] } {
  const mine: T[] = []
  const defaults: T[] = []
  for (const team of teams) {
    if (isDefaultTeam(team)) defaults.push(team)
    else mine.push(team)
  }
  return { mine, defaults }
}
