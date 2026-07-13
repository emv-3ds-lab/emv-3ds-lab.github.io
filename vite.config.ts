// https://vite.dev/config/
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

function normalizeBasePath(basePath?: string) {
  if (!basePath) {
    return '/'
  }

  const trimmed = basePath.trim()

  if (!trimmed || trimmed === '/') {
    return '/'
  }

  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, '')

  return withoutEdges ? `/${withoutEdges}/` : '/'
}

function getGitHubPagesBase() {
  // Allow local dry-runs with the same subpath GitHub Pages will use.
  const explicitBase = process.env.VITE_BASE_PATH || process.env.BASE_PATH

  if (explicitBase) {
    return normalizeBasePath(explicitBase)
  }

  const [owner, repository] = process.env.GITHUB_REPOSITORY?.split('/') ?? []

  if (!repository) {
    return '/'
  }

  // GitHub user/org site repositories publish from the root path.
  if (owner && repository.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/'
  }

  return normalizeBasePath(repository)
}

export default defineConfig({
  // vitest pulls in its own Vite (currently 5.x) which has a
  // structurally-incompatible `Plugin` type with our project Vite 8.
  // Casting keeps the build clean without changing runtime behaviour.
  plugins: [react()] as never,
  base: getGitHubPagesBase(),
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
})
