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
  const replicateApiToken = process.env.REPLICATE_API_TOKEN ?? "";
  if (!aiGatewayApiKey) throw new Error("Missing AI_GATEWAY_API_KEY.");
  if (!replicateApiToken) throw new Error("Missing REPLICATE_API_TOKEN.");
  return {
    aiGatewayApiKey,
    replicateApiToken,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
  };
}

// Non-throwing probe for routes that can degrade to placeholders.
export function hasServerSecrets(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY && process.env.REPLICATE_API_TOKEN,
  );
}
