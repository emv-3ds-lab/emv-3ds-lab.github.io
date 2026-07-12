import { defineConfig } from 'vite'
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: getGitHubPagesBase(),
})
