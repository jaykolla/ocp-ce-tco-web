import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  // ─── GitHub Pages: static HTML export ──────────────────────────────────────
  // All pages are pre-rendered to static HTML+JS at build time.
  // No Node.js server needed at runtime — pure client-side React app.
  output: 'export',

  // Repo name becomes the URL base: https://jaykolla.github.io/ocp-ce-tco-web/
  basePath: isProd ? '/ocp-ce-tco-web' : '',
  assetPrefix: isProd ? '/ocp-ce-tco-web/' : '',

  // GitHub Pages serves static files — image optimization requires a server
  images: { unoptimized: true },

  // Workspace packages compiled from TypeScript source by Next.js bundler
  transpilePackages: [
    '@ocp-tco/model-engine',
    '@ocp-tco/model-schema',
    '@ocp-tco/seed-data',
  ],
}

export default nextConfig
