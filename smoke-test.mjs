/**
 * Non-interactive smoke test — exercises scaffold() with a hardcoded config.
 * Run with: NODE_ENV=development node smoke-test.mjs
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'spinup-ts-smoke');

// Clean previous run
try { await rm(outDir, { recursive: true }); } catch {}

const { scaffold } = await import('./dist/scaffold.js');

const config = {
  projectName: 'smoke-test-lib',
  projectSlug: 'smoke_test_lib',
  description: 'A smoke-test TypeScript library',
  author: 'Joe Black',
  email: 'me@joeblack.nyc',
  githubHandle: 'joeblackwaslike',
  nodeVersion: '22',
  packageManager: 'pnpm',
  projectType: 'library',
  includeGithubActions: true,
  publishToNpm: true,
  includeDocs: true,
  includeCodecov: true,
  includeDockerfile: false,
  includeDevcontainer: false,
  license: 'MIT',
};

console.log('Scaffolding to:', outDir);
await scaffold(outDir, config);
console.log('\nSmoke test PASSED — output at:', outDir);
