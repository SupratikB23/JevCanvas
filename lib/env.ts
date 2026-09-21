// Server-only env validation. Never import this file from client components.
// (No runtime import guard to avoid an extra dependency; enforced by convention
// and by the self-check that greps client files for server-secret imports.)

export interface ServerEnv {
  aiGatewayApiKey: string;
  replicateApiToken: string;
  blobReadWriteToken?: string;
  databaseUrl?: string;
  redisUrl?: string;
}

export function getServerEnv(): ServerEnv {
  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY ?? "";
  // Replicate token is optional: absent means the free image provider is used.
  const replicateApiToken = process.env.REPLICATE_API_TOKEN ?? "";
  if (!aiGatewayApiKey) throw new Error("Missing AI_GATEWAY_API_KEY.");
  return {
    aiGatewayApiKey,
    replicateApiToken,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
  };
}

// Non-throwing probes for routes that can degrade gracefully.
// Split gates: Jev runs on the gateway key alone; paid diffusion needs the
// Replicate token, otherwise routes fall back to the free image provider.
export function hasJevSecrets(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

export function hasDiffusionSecrets(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export function replicateApiToken(): string {
  return process.env.REPLICATE_API_TOKEN ?? "";
}

export function hasServerSecrets(): boolean {
  return hasJevSecrets() && hasDiffusionSecrets();
}
