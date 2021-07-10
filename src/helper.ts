import type { Paginator } from '@aws-sdk/types'
import 'colors'

export function intersectionOf<T>(a: T[], b: T[]): T[] {
  return [...a].filter(it => b.includes(it))
}

export async function combineAllPages<T, Q>(
  gen: Paginator<T>,
  fieldSelector: (obj: T) => (Q | undefined)[] | undefined
): Promise<Q[]> {
  const results: Q[] = []
  for await (const page of gen) {
    const desiredFields = fieldSelector(page) ?? []
    const nonBlankField = desiredFields.filter(it => it) as Q[]
    results.push(...nonBlankField)
  }
  return results
}

declare global {
  interface Array<T> {
    without(other: T[]): T[]
  }
}
Array.prototype.without = function <T>(this: T[], other: T[]): T[] {
  return [...this].filter(it => !other.includes(it))
}

export function makeName(a: string | undefined, b: string | undefined): string | undefined {
  if (a && b && a.length > 50) return b.grey
  else if (a && b) return a.green + ' / ' + b.grey
  else if (a) return a.green
  else if (b) return b.grey
  return undefined
}
