import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // seed-data has no dist/ — it must be compiled from source by Turbopack.
  // model-engine and model-schema already have pre-built dist/ directories and
  // their package.json main fields point to dist/index.js so Turbopack uses
  // the compiled JS directly (no transpilation needed for those two).
  transpilePackages: ['@ocp-tco/seed-data'],
}

export default nextConfig
