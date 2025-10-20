import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Silence workspace root inference warning when multiple lockfiles exist
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
