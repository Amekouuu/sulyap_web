/**
 * The seam the real Express client drops into later.
 *
 * Every api/* function returns a promise and goes through `respond`, so
 * swapping the mock store for `fetch` touches this file and nothing else.
 * Components already handle loading and error states because the shape
 * never changes.
 */
const LATENCY_MS = 180

export function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(value)), LATENCY_MS),
  )
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function reject(message: string, status = 400): Promise<never> {
  return new Promise((_, r) =>
    setTimeout(() => r(new ApiError(message, status)), LATENCY_MS),
  )
}
