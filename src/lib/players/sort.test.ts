import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_SORT, comparePositions, sortByPosition, sortPlayers, togglePlayerSort, type SortablePlayer } from './sort'

const player = (name: string, number: number | null, position: string, is_starter: boolean): SortablePlayer => ({
  name,
  number,
  position,
  is_starter,
})
const names = (players: SortablePlayer[]) => players.map((p) => p.name)

const squad = [
  player('Zé', 9, 'ATA', true),
  player('Ana', 20, 'GOL', false),
  player('Éder', 1, 'GOL', true),
  player('Bruno', 2, 'LD', true),
  player('Caio', 30, 'ATA', false),
  player('Davi', null, 'MC', false),
  player('Ênio', 12, 'LD', false),
]

describe('sortPlayers', () => {
  it('padrão: titulares primeiro, na ordem das posições', () => {
    expect(names(sortPlayers(squad, DEFAULT_PLAYER_SORT))).toEqual(['Éder', 'Bruno', 'Zé', 'Ana', 'Ênio', 'Davi', 'Caio'])
  })
  it('por número: titulares e depois reservas, cada grupo em ordem numérica', () => {
    expect(names(sortPlayers(squad, { column: 'number', desc: false }))).toEqual(['Éder', 'Bruno', 'Zé', 'Ênio', 'Ana', 'Caio', 'Davi'])
  })
  it('por número decrescente: mantém titulares primeiro e sem número por último', () => {
    expect(names(sortPlayers(squad, { column: 'number', desc: true }))).toEqual(['Zé', 'Bruno', 'Éder', 'Caio', 'Ana', 'Ênio', 'Davi'])
  })
  it('por nome: ordem alfabética com acentos em cada grupo', () => {
    expect(names(sortPlayers(squad, { column: 'name', desc: false }))).toEqual(['Bruno', 'Éder', 'Zé', 'Ana', 'Caio', 'Davi', 'Ênio'])
  })
  it('por nome decrescente: mantém titulares primeiro', () => {
    expect(names(sortPlayers(squad, { column: 'name', desc: true }))).toEqual(['Zé', 'Éder', 'Bruno', 'Ênio', 'Davi', 'Caio', 'Ana'])
  })
  it('por posição decrescente: mantém titulares primeiro', () => {
    expect(names(sortPlayers(squad, { column: 'position', desc: true }))).toEqual(['Zé', 'Bruno', 'Éder', 'Caio', 'Davi', 'Ênio', 'Ana'])
  })
  it('desempata a mesma posição pelo número', () => {
    const zagueiros = [player('B', 14, 'ZAG', true), player('A', 3, 'ZAG', true)]
    expect(names(sortPlayers(zagueiros, DEFAULT_PLAYER_SORT))).toEqual(['A', 'B'])
  })
  it('não altera a lista recebida', () => {
    const copy = [...squad]
    sortPlayers(squad, DEFAULT_PLAYER_SORT)
    expect(squad).toEqual(copy)
  })
})

describe('sortByPosition', () => {
  it('ordena só por posição e número, sem separar titulares', () => {
    expect(names(sortByPosition(squad))).toEqual(['Éder', 'Ana', 'Bruno', 'Ênio', 'Davi', 'Zé', 'Caio'])
  })
  it('deixa jogador sem número por último na posição e não altera a lista recebida', () => {
    const list = [player('A', null, 'ZAG', false), player('B', 3, 'ZAG', false)]
    expect(names(sortByPosition(list))).toEqual(['B', 'A'])
    expect(names(list)).toEqual(['A', 'B'])
  })
})

describe('comparePositions', () => {
  it('segue a ordem pedida', () => {
    const order = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'MD', 'ME', 'PD', 'PE', 'SA', 'ATA']
    expect([...order].reverse().sort(comparePositions)).toEqual(order)
  })
  it('deixa posições desconhecidas no fim, em ordem alfabética', () => {
    expect(['LAT', 'ATA', 'ALD'].sort(comparePositions)).toEqual(['ATA', 'ALD', 'LAT'])
  })
})

describe('togglePlayerSort', () => {
  it('inverte a mesma coluna e começa crescente em outra', () => {
    expect(togglePlayerSort({ column: 'name', desc: false }, 'name')).toEqual({ column: 'name', desc: true })
    expect(togglePlayerSort({ column: 'name', desc: true }, 'name')).toEqual({ column: 'name', desc: false })
    expect(togglePlayerSort({ column: 'name', desc: true }, 'number')).toEqual({ column: 'number', desc: false })
  })
})
