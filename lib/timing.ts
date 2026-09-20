// performance.now timers. Server + client safe.
export function now(): number {
  return performance.now();
}

export async function time<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; elapsedMs: number }> {
  const start = now();
  const value = await fn();
  return { value, elapsedMs: now() - start };
}

export function elapsed(start: number): number {
  return now() - start;
}
