// nanoid-free ids. Counter + random suffix avoids collisions across requests.
let counter = 0;

export function newRequestId(): string {
  counter += 1;
  return `req-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function newVersionId(): string {
  counter += 1;
  return `v${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function newAssetId(kind: string): string {
  counter += 1;
  const clean = kind.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${clean}-${counter.toString(36)}`;
}
