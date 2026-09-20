// Secret-safe structured logging. Never log keys, headers, cookies, or PII.
export interface LogFields {
  requestId: string;
  stage: string;
  model?: string;
  latencyMs?: number;
  status: "ok" | "error" | "fallback";
  assetId?: string;
  componentCount?: number;
  questionCount?: number;
  cacheHit?: boolean;
  note?: string;
}

export function logEvent(fields: LogFields): void {
  const { requestId, stage, model, latencyMs, status, assetId, ...rest } =
    fields;
  const line = JSON.stringify({
    requestId,
    stage,
    model,
    latencyMs:
      latencyMs === undefined ? undefined : Math.round(latencyMs * 10) / 10,
    status,
    assetId,
    ...rest,
  });
  if (status === "error") console.error(line);
  else console.log(line);
}
