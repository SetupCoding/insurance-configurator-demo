import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a standalone server bundle so the Docker image can ship just the
  // server and its minimal dependencies.
  output: 'standalone',
  // Don't scaffold AGENTS.md/CLAUDE.md on every `next dev`.
  agentRules: false,
};

export default nextConfig;
