import { describe, it, expect } from 'vitest'
import { solveLinearSystem } from './solver.js'

describe('solveLinearSystem', () => {
  it('solves a 2x2 system', () => {
    // 2x + y = 5
    // x + 3y = 10
    // Solution: x = 1, y = 3
    const { solution } = solveLinearSystem(
      [[2, 1], [1, 3]],
      [5, 10]
    )
    expect(solution[0]).toBeCloseTo(1, 10)
    expect(solution[1]).toBeCloseTo(3, 10)
  })

  it('solves a 3x3 system', () => {
    // x + y + z = 6
    // 2y + 5z = -4
    // 2x + 5y - z = 27
    // Solution: x = 5, y = 3, z = -2
    const { solution } = solveLinearSystem(
      [[1, 1, 1], [0, 2, 5], [2, 5, -1]],
      [6, -4, 27]
    )
    expect(solution[0]).toBeCloseTo(5, 8)
    expect(solution[1]).toBeCloseTo(3, 8)
    expect(solution[2]).toBeCloseTo(-2, 8)
  })

  it('throws on singular matrix', () => {
    expect(() =>
      solveLinearSystem([[1, 2], [2, 4]], [3, 6])
    ).toThrow()
  })

  it('throws on dimension mismatch', () => {
    expect(() =>
      solveLinearSystem([[1, 2], [3, 4]], [1, 2, 3])
    ).toThrow('dimension mismatch')
  })
})
