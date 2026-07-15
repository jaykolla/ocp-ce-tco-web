/**
 * Linear system solver: Gaussian elimination with partial pivoting.
 * Solves A * x = b.
 *
 * The workbook uses MMULT/MINVERSE for local and global energy conservation.
 * We implement a numerically stable equivalent without computing an explicit inverse.
 *
 * PRD §6.8: "Do not calculate an explicit inverse in production."
 * PRD §6.8: "Validate matrix dimensions, detect singular/ill-conditioned systems."
 */

export type DecimalMatrix = number[][]
export type DecimalVector = number[]

export interface LinearSystemResult {
  solution: DecimalVector
  conditionWarning?: string
}

export function solveLinearSystem(
  A: DecimalMatrix,
  b: DecimalVector
): LinearSystemResult {
  const n = b.length
  if (A.length !== n || A.some(row => row.length !== n)) {
    throw new Error(`Matrix dimension mismatch: A is ${A.length}x${A[0]?.length ?? 0}, b is length ${n}`)
  }

  // Deep copy augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]!])

  let conditionWarning: string | undefined

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find the row with the largest absolute value in this column
    let maxRow = col
    let maxVal = Math.abs(M[col]![col]!)
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(M[row]![col]!)
      if (v > maxVal) { maxVal = v; maxRow = row }
    }

    // Swap rows
    if (maxRow !== col) {
      ;[M[col], M[maxRow]] = [M[maxRow]!, M[col]!]
    }

    const pivot = M[col]![col]!
    if (Math.abs(pivot) < 1e-12) {
      throw new Error(`Singular or near-singular matrix at column ${col}. Check configuration for zero-load equipment.`)
    }

    // Condition estimate: if pivot is very small relative to column max, warn
    if (Math.abs(pivot) < 1e-6) {
      conditionWarning = `Near-singular system at column ${col} (pivot = ${pivot.toExponential(3)}). Results may be inaccurate.`
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row]![col]! / pivot
      for (let k = col; k <= n; k++) {
        M[row]![k]! -= factor * M[col]![k]!
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]![n]!
    for (let j = i + 1; j < n; j++) {
      sum -= M[i]![j]! * x[j]!
    }
    x[i] = sum / M[i]![i]!
  }

  return { solution: x, conditionWarning }
}
