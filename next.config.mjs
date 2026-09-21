/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint runs via `npm run lint` (eslint.config.mjs). Builds skip lint;
  // type safety is enforced by `npm run typecheck`.
  eslint: { ignoreDuringBuilds: true },
  // Never expose server secrets to the client. Env is read server-side only
  // via lib/env.ts. No NEXT_PUBLIC_* keys are used for provider credentials.
  experimental: {
    serverActions: { bodySizeLimit: "512kb" },
  },
};

export default nextConfig;
