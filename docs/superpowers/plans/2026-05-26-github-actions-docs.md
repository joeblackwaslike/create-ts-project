# GitHub Actions Suite + Docusaurus Docs + Rich README — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `create-ts-project` template with a full GitHub Actions suite (release-please, CodeQL, labeler, stale, dependabot), replace VitePress with Docusaurus 3 + TypeDoc, build out a comprehensive docs structure, and overhaul the README with rich badges.

**Architecture:** All changes live in `template/` (the scaffold source) and `src/transforms/` (TypeScript that conditionally strips files at scaffold time). The smoke test validates the full output chain end-to-end.

**Tech Stack:** Docusaurus 3.8, docusaurus-plugin-typedoc, TypeDoc 0.27, googleapis/release-please-action@v4, actions/labeler@v5, actions/stale@v9, github/codeql-action@v3

---

## File Map

**`template/.github/workflows/`**
- `ci.yml` — modify: add `dependency-review` job
- `release.yml` — **delete**
- `release-please.yml` — **create**: release-please + gated publish + gated deploy-docs
- `codeql.yml` — **create**: CodeQL analysis
- `labeler.yml` — **create**: PR auto-labeler
- `stale.yml` — **create**: stale issue/PR bot

**`template/.github/`**
- `dependabot.yml` — **create**
- `labeler.yml` — **create**: label rules config
- `release-please-config.json` — **create**
- `.release-please-manifest.json` — **create**

**`template/` root**
- `docusaurus.config.ts` — **create**
- `sidebars.ts` — **create**
- `static/img/logo.svg` — **create**
- `package.json` — modify: swap vitepress→docusaurus deps, update scripts, add depcheck ignores
- `justfile` — modify: update docs targets
- `README.md` — **overhaul**
- `.gitignore` — modify: add `docs/api/`, `docs/backlog.md`, `docs/handoff.md`

**`template/docs/`**
- `.vitepress/` — **delete** (entire directory)
- `index.md` — **delete** (replaced by `intro.md`)
- `intro.md` — **create**: Docusaurus hero landing page
- `installation.md` — **create**
- `getting-started.md` — modify: expand existing file
- `examples.md` — **create**
- `contributing.md` — **create**
- `changelog.md` — **create**
- `user-guide/{index,how-it-works,configuration,features}.md` — **create**
- `developer-guide/{index,data-model,testing,contributing,architecture}.md` — **create**
- `architecture/{index,constitution,data-model,project,quality-checks,testing-plan}.md` — **create**
- `reference/{cli,configuration,hooks}.md` — **create**
- `research/{real-world-demand,competitor-analysis}.md` — **create**
- `post-mortems/.gitkeep` — **create**
- `backlog.md`, `handoff.md` — **create** (gitignored)

**`src/transforms/`**
- `documentation.ts` — modify: target Docusaurus files, update script/dep lists
- `github-actions.ts` — modify: handle `release-please.yml` instead of `release.yml`

---

## Phase 1 — GitHub Actions Suite

### Task 1: Enhance `ci.yml` with dependency-review job

**Files:**
- Modify: `template/.github/workflows/ci.yml`

- [ ] **Step 1: Add the dependency-review job** at the end of `template/.github/workflows/ci.yml`, after the `docs:` job block:

```yaml
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate
```

- [ ] **Step 2: Verify file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('template/.github/workflows/ci.yml'))" && echo "valid"
```

Expected: `valid`

---

### Task 2: Create `release-please.yml`

**Files:**
- Create: `template/.github/workflows/release-please.yml`

- [ ] **Step 1: Write the file**

```yaml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    name: Release Please
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          config-file: .github/release-please-config.json
          manifest-file: .github/.release-please-manifest.json

  publish:
    name: Publish to npm
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - run: pnpm publish --access public --provenance --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy-docs:
    name: Deploy docs
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-env

      - name: Build docs
        run: pnpm docs:build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

- [ ] **Step 2: Verify valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('template/.github/workflows/release-please.yml'))" && echo "valid"
```

Expected: `valid`

---

### Task 3: Create `codeql.yml` and `labeler.yml`

**Files:**
- Create: `template/.github/workflows/codeql.yml`
- Create: `template/.github/workflows/labeler.yml`
- Create: `template/.github/labeler.yml`

- [ ] **Step 1: Write `codeql.yml`**

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 1 * * 1'

permissions:
  security-events: write
  actions: read
  contents: read

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - uses: github/codeql-action/autobuild@v3

      - uses: github/codeql-action/analyze@v3
        with:
          category: /language:javascript-typescript
```

- [ ] **Step 2: Write `labeler.yml` (workflow)**

```yaml
name: Labeler

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    name: Label PR
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 3: Write `.github/labeler.yml` (rules config)**

```yaml
docs:
  - docs/**
  - '**/*.md'

ci:
  - .github/**

tests:
  - src/**/*.test.ts
  - src/**/*.spec.ts

dependencies:
  - package.json
  - pnpm-lock.yaml

source:
  - src/**
```

---

### Task 4: Create `stale.yml` and `dependabot.yml`

**Files:**
- Create: `template/.github/workflows/stale.yml`
- Create: `template/.github/dependabot.yml`

- [ ] **Step 1: Write `stale.yml`**

```yaml
name: Stale

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

permissions:
  issues: write
  pull-requests: write

jobs:
  stale:
    name: Mark stale
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-issue-stale: 60
          days-before-issue-close: 7
          days-before-pr-stale: 30
          days-before-pr-close: -1
          stale-issue-message: >
            This issue has been automatically marked as stale due to 60 days of
            inactivity. It will be closed in 7 days unless there is new activity.
          close-issue-message: >
            Closing due to inactivity. Please reopen if this is still relevant.
          stale-pr-message: >
            This PR has been automatically marked as stale due to 30 days of
            inactivity. It will not be auto-closed — please ping when ready to resume.
          exempt-issue-labels: 'pinned,security,in-progress'
          exempt-pr-labels: 'pinned,security,in-progress'
```

- [ ] **Step 2: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    labels:
      - dependencies
    open-pull-requests-limit: 10

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    labels:
      - ci
      - dependencies
```

---

### Task 5: Create release-please config files

**Files:**
- Create: `template/.github/release-please-config.json`
- Create: `template/.github/.release-please-manifest.json`

- [ ] **Step 1: Write `release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "packages": {
    ".": {}
  }
}
```

- [ ] **Step 2: Write `.release-please-manifest.json`**

```json
{
  ".": "0.1.0"
}
```

---

### Task 6: Update `github-actions.ts` transform + delete `release.yml`

The transform currently removes `release.yml` when `publishToNpm: false`. With `release-please.yml`, we never delete the whole file — we just strip the `publish` job. The `releasePath` variable is renamed to `releasePleaseYml`.

**Files:**
- Modify: `src/transforms/github-actions.ts`
- Delete: `template/.github/workflows/release.yml`

- [ ] **Step 1: Replace `src/transforms/github-actions.ts` entirely**

```typescript
import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

const JOB_REGEX_CACHE = new Map<string, RegExp>();

function jobBlockRegex(jobName: string): RegExp {
  const cached = JOB_REGEX_CACHE.get(jobName);
  if (cached) return cached;
  const pattern = new RegExp(`\\n\\s{2}${jobName}:\\n(?:\\s{4,}.*\\n|\\s*\\n)*`, 'g');
  JOB_REGEX_CACHE.set(jobName, pattern);
  return pattern;
}

function removeJobBlock(yaml: string, jobName: string): string {
  return yaml.replaceAll(jobBlockRegex(jobName), '\n');
}

function removeCodecovStep(yaml: string): string {
  // eslint-disable-next-line sonarjs/slow-regex
  const codecovStepRegex = /\n\s{6}- name: Upload coverage\n(?:\s{8,}.*\n)*/g;
  return yaml.replaceAll(codecovStepRegex, '\n');
}

async function editYamlFile(filePath: string, transform: (yaml: string) => string): Promise<void> {
  if (!(await fse.pathExists(filePath))) return;
  const original = await fse.readFile(filePath, 'utf8');
  const updated = transform(original);
  if (updated !== original) {
    await fse.writeFile(filePath, updated, 'utf8');
  }
}

export async function transformGithubActions(
  destDir: string,
  config: ProjectConfig,
): Promise<void> {
  const githubDir = path.join(destDir, '.github');
  if (!config.includeGithubActions) {
    await fse.remove(githubDir);
    return;
  }

  const ciPath = path.join(githubDir, 'workflows', 'ci.yml');
  const releasePleaseYml = path.join(githubDir, 'workflows', 'release-please.yml');

  if (!config.publishToNpm) {
    await editYamlFile(releasePleaseYml, (yaml) => removeJobBlock(yaml, 'publish'));
  }

  if (!config.includeDocs) {
    await editYamlFile(ciPath, (yaml) => removeJobBlock(yaml, 'docs'));
    await editYamlFile(releasePleaseYml, (yaml) => removeJobBlock(yaml, 'deploy-docs'));
  }

  if (!config.includeCodecov) {
    await editYamlFile(ciPath, removeCodecovStep);
  }
}
```

- [ ] **Step 2: Delete `release.yml`**

```bash
rm template/.github/workflows/release.yml
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
pnpm build 2>&1
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit Phase 1**

```bash
git add template/.github/ src/transforms/github-actions.ts
git commit -m "feat(template): add GitHub Actions suite — release-please, CodeQL, labeler, stale, dependabot"
```

---

## Phase 2 — Docusaurus Setup

### Task 7: Update `package.json` and `justfile`

**Files:**
- Modify: `template/package.json`
- Modify: `template/justfile`

- [ ] **Step 1: Update `template/package.json`**

In `scripts`, replace:
```json
"docs:dev": "vitepress dev docs",
"docs:build": "vitepress build docs",
"docs:preview": "vitepress preview docs",
```
with:
```json
"docs:start": "docusaurus start",
"docs:build": "docusaurus build",
"docs:serve": "docusaurus serve",
"docs:clear": "docusaurus clear",
```

In `devDependencies`, remove `"vitepress": "^1.6.3"` and add:
```json
"@docusaurus/core": "^3.8.0",
"@docusaurus/preset-classic": "^3.8.0",
"@docusaurus/types": "^3.8.0",
"docusaurus-plugin-typedoc": "^1.2.0",
"react": "^18.0.0",
"react-dom": "^18.0.0",
"typedoc": "^0.27.0"
```

Add a top-level `"depcheck"` key (after `"pnpm"`) to suppress false positives from Docusaurus's React peer deps:
```json
"depcheck": {
  "ignores": ["react", "react-dom", "@docusaurus/types"]
}
```

- [ ] **Step 2: Update `template/justfile`**

Replace:
```
# Start docs dev server
docs:
  pnpm docs:dev

# Build docs
docs-build:
  pnpm docs:build
```

with:
```
# Start docs dev server
docs:
  pnpm docs:start

# Build docs
docs-build:
  pnpm docs:build

# Serve built docs locally
docs-serve:
  pnpm docs:serve

# Clear Docusaurus cache
docs-clear:
  pnpm docs:clear
```

---

### Task 8: Create `docusaurus.config.ts`

**Files:**
- Create: `template/docusaurus.config.ts`

- [ ] **Step 1: Write the file**

```typescript
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '__PROJECT_NAME__',
  tagline: '__DESCRIPTION__',
  favicon: 'img/logo.svg',

  url: 'https://__GITHUB_HANDLE__.github.io',
  baseUrl: '/__PROJECT_NAME__/',
  organizationName: '__GITHUB_HANDLE__',
  projectName: '__PROJECT_NAME__',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['./src/index.ts'],
        tsconfig: './tsconfig.json',
        out: 'api',
        sidebar: {
          categoryLabel: 'API Reference',
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/edit/main/',
          routeBasePath: '/',
        },
        blog: false,
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: '__PROJECT_NAME__',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © __YEAR__ __AUTHOR__. Built with <a href="https://docusaurus.io">Docusaurus</a>.`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    // Algolia DocSearch — apply at https://docsearch.algolia.com/apply/
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: '__PROJECT_SLUG__',
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

---

### Task 9: Create `sidebars.ts`

**Files:**
- Create: `template/sidebars.ts`

- [ ] **Step 1: Write the file**

No type import needed — plain object export works and avoids phantom dep on `@docusaurus/plugin-content-docs`.

```typescript
const sidebars = {
  mainSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['intro', 'installation', 'getting-started', 'examples'],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/index',
        'user-guide/how-it-works',
        'user-guide/configuration',
        'user-guide/features',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'developer-guide/index',
        'developer-guide/data-model',
        'developer-guide/testing',
        'developer-guide/contributing',
        'developer-guide/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/index',
        'architecture/constitution',
        'architecture/data-model',
        'architecture/project',
        'architecture/quality-checks',
        'architecture/testing-plan',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/cli', 'reference/configuration', 'reference/hooks'],
    },
    {
      type: 'autogenerated',
      dirName: 'api',
    },
    {
      type: 'category',
      label: 'Research',
      items: ['research/real-world-demand', 'research/competitor-analysis'],
    },
    {
      type: 'category',
      label: 'Post-mortems',
      link: {
        type: 'generated-index',
        title: 'Post-mortems',
        description: 'Retrospectives and incident analyses.',
      },
      items: [{ type: 'autogenerated', dirName: 'post-mortems' }],
    },
    'changelog',
  ],
};

export default sidebars;
```

---

### Task 10: Create static assets + delete VitePress files

**Files:**
- Create: `template/static/img/logo.svg`
- Delete: `template/docs/.vitepress/` (entire dir)
- Delete: `template/docs/index.md`

- [ ] **Step 1: Create the static assets directory and placeholder logo**

```bash
mkdir -p template/static/img
```

Write `template/static/img/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="24" fill="#3578e5"/>
  <text x="100" y="138" font-family="monospace,sans-serif" font-size="96" font-weight="bold" fill="white" text-anchor="middle">TS</text>
</svg>
```

- [ ] **Step 2: Delete VitePress files**

```bash
rm -rf template/docs/.vitepress
rm template/docs/index.md
```

---

### Task 11: Update `documentation.ts` transform

**Files:**
- Modify: `src/transforms/documentation.ts`

- [ ] **Step 1: Replace the file entirely**

The updated transform removes Docusaurus root files (`docusaurus.config.ts`, `sidebars.ts`, `static/`) in addition to `docs/`. The script list and dev dependency list are updated for Docusaurus.

```typescript
import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const DOCS_SCRIPTS = ['docs:start', 'docs:build', 'docs:serve', 'docs:clear'] as const;

const DOCS_DEV_DEPS = [
  '@docusaurus/core',
  '@docusaurus/preset-classic',
  '@docusaurus/types',
  'docusaurus-plugin-typedoc',
  'react',
  'react-dom',
  'typedoc',
] as const;

export async function transformDocumentation(
  destDir: string,
  config: ProjectConfig,
): Promise<void> {
  if (config.includeDocs) return;

  await fse.remove(path.join(destDir, 'docs'));
  await fse.remove(path.join(destDir, 'docusaurus.config.ts'));
  await fse.remove(path.join(destDir, 'sidebars.ts'));
  await fse.remove(path.join(destDir, 'static'));

  const packagePath = path.join(destDir, 'package.json');
  if (!(await fse.pathExists(packagePath))) return;

  const packageJson = (await fse.readJson(packagePath)) as PackageJson;

  if (packageJson.scripts) {
    for (const scriptName of DOCS_SCRIPTS) {
      Reflect.deleteProperty(packageJson.scripts, scriptName);
    }
  }

  if (packageJson.devDependencies) {
    for (const dep of DOCS_DEV_DEPS) {
      Reflect.deleteProperty(packageJson.devDependencies, dep);
    }
  }

  await fse.writeJson(packagePath, packageJson, { spaces: 2 });
}
```

- [ ] **Step 2: Build and verify no errors**

```bash
pnpm build 2>&1
```

Expected: exits 0.

- [ ] **Step 3: Commit Phase 2**

```bash
git add template/ src/transforms/documentation.ts
git commit -m "feat(template): replace VitePress with Docusaurus 3 + TypeDoc integration"
```

---

## Phase 3 — Docs Content

### Task 12: Create `intro.md` — the landing page

**Files:**
- Create: `template/docs/intro.md`

This is the Docusaurus home page (slug `/`). It should be an exciting pitch for the project with a clear CTA. The developer replaces placeholder text with their project-specific copy.

- [ ] **Step 1: Write `template/docs/intro.md`**

```markdown
---
id: intro
slug: /
title: __PROJECT_NAME__
description: __DESCRIPTION__
---

# __PROJECT_NAME__

> **__DESCRIPTION__**

[![npm](https://img.shields.io/npm/v/__PROJECT_NAME__?color=blue)](https://npmjs.com/package/__PROJECT_NAME__)
[![CI](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/actions/workflows/ci.yml/badge.svg)](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/actions/workflows/ci.yml)
[![License: __LICENSE__](https://img.shields.io/badge/License-__LICENSE__-yellow.svg)](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/blob/main/LICENSE)

---

## Why __PROJECT_NAME__?

:::tip The short version
Replace this with your one-sentence value proposition. What does __PROJECT_NAME__ do that nothing else does?
:::

**The problem:** Describe the specific pain point your library solves. Be concrete — what does a developer have to do today without your library?

**The solution:** __PROJECT_NAME__ solves this with a clean, TypeScript-first API. One import, zero configuration, full type safety.

---

## Features

| | Feature | Description |
|---|---------|-------------|
| ⚡ | **Fast** | Replace with a real performance claim or benchmark |
| 🔒 | **Type-safe** | Full TypeScript with strict types and IntelliSense |
| 🧪 | **Well tested** | Comprehensive test suite with >90% coverage |
| 📦 | **Lightweight** | Zero unnecessary dependencies |
| 🔌 | **Extensible** | Replace with your extensibility story |

---

## Install Now

```bash
pnpm add __PROJECT_NAME__
```

```typescript
import { yourExport } from '__PROJECT_NAME__';

// Replace with the simplest possible usage example
const result = yourExport({ input: 'value' });
console.log(result);
```

**[Get Started →](./getting-started)** · **[API Reference →](./api)** · **[GitHub →](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__)**

---

*Built with TypeScript. __LICENSE__ License. Made by [__AUTHOR__](https://github.com/__GITHUB_HANDLE__).*
```

---

### Task 13: Create top-level docs pages

**Files:**
- Create: `template/docs/installation.md`
- Create: `template/docs/getting-started.md` (replaces existing minimal file)
- Create: `template/docs/examples.md`
- Create: `template/docs/contributing.md`
- Create: `template/docs/changelog.md`

- [ ] **Step 1: Write `installation.md`**

```markdown
---
title: Installation
---

# Installation

## Requirements

- Node.js `>= __NODE_VERSION__`
- A package manager: pnpm (recommended), npm, or bun

## Install

**pnpm (recommended)**

```bash
pnpm add __PROJECT_NAME__
```

**npm**

```bash
npm install __PROJECT_NAME__
```

**bun**

```bash
bun add __PROJECT_NAME__
```

## Verify

```typescript
import { yourExport } from '__PROJECT_NAME__';
// Replace with a real smoke-test import
```

## Peer Dependencies

List any peer dependencies here. If none, remove this section.

## Next Steps

→ [Getting Started](./getting-started)
```

- [ ] **Step 2: Overwrite `getting-started.md`**

```markdown
---
title: Getting Started
---

# Getting Started

## 1. Install

```bash
pnpm add __PROJECT_NAME__
```

## 2. Basic Usage

```typescript
import { yourMainExport } from '__PROJECT_NAME__';

// Replace with the simplest real usage example
const result = yourMainExport({
  // required options
});
```

## 3. Configuration

```typescript
import { yourMainExport } from '__PROJECT_NAME__';

const result = yourMainExport({
  // common configuration options
  option1: 'value',
  option2: true,
});
```

See the [Configuration reference](./reference/configuration) for all options.

## Next Steps

- [User Guide](./user-guide/) — in-depth feature documentation
- [API Reference](./api) — auto-generated from TypeScript types
- [Examples](./examples) — real-world usage patterns
```

- [ ] **Step 3: Write `examples.md`**

```markdown
---
title: Examples
---

# Examples

## Basic Example

```typescript
import { yourExport } from '__PROJECT_NAME__';

// Replace with a complete, copy-pasteable example
const result = yourExport({ input: 'hello' });
console.log(result);
```

## Advanced Example

```typescript
import { yourExport, AnotherExport } from '__PROJECT_NAME__';

// Replace with a more complex but realistic usage example
```

## Real-World Patterns

### Pattern 1: Replace with a common pattern name

```typescript
// Replace with real code
```

### Pattern 2: Another common use case

```typescript
// Replace with real code
```
```

- [ ] **Step 4: Write `contributing.md`**

```markdown
---
title: Contributing
---

# Contributing

Thank you for your interest in contributing to __PROJECT_NAME__!

## Development Setup

```bash
git clone https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__.git
cd __PROJECT_NAME__
pnpm install
```

## Running Tests

```bash
pnpm test          # run tests
pnpm test:coverage # run with coverage
```

## Code Quality

```bash
pnpm check         # typecheck + lint
pnpm lint:fix      # auto-fix linting issues
```

## Submitting a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Ensure all checks pass: `pnpm check && pnpm test`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add new feature`
   - `fix: correct a bug`
   - `docs: update documentation`
6. Open a pull request

## Release Process

Releases are automated via [release-please](https://github.com/googleapis/release-please).
Merging a release PR automatically publishes to npm and deploys the docs.
```

- [ ] **Step 5: Write `changelog.md`**

```markdown
---
title: Changelog
---

# Changelog

All notable changes are tracked in [CHANGELOG.md](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/blob/main/CHANGELOG.md) on GitHub.

Releases are automated via [release-please](https://github.com/googleapis/release-please).
```

---

### Task 14: Create `user-guide/` section

**Files:**
- Create: `template/docs/user-guide/index.md`
- Create: `template/docs/user-guide/how-it-works.md`
- Create: `template/docs/user-guide/configuration.md`
- Create: `template/docs/user-guide/features.md`

- [ ] **Step 1: Create the directory and write all four files**

`template/docs/user-guide/index.md`:
```markdown
---
title: User Guide
---

# User Guide

Welcome to the __PROJECT_NAME__ User Guide. This section covers everything you need to use __PROJECT_NAME__ effectively.

- [How It Works](./how-it-works) — core concepts and mental model
- [Configuration](./configuration) — all configuration options
- [Features](./features) — feature-by-feature documentation
```

`template/docs/user-guide/how-it-works.md`:
```markdown
---
title: How It Works
---

# How It Works

Replace this section with your project's core concepts and mental model.

## Core Concepts

### Concept 1

Explain the first key concept. Use analogies where helpful.

### Concept 2

Explain the second key concept.

## Data Flow

Describe how data flows through your library from input to output.

```
Input → [Step 1] → [Step 2] → Output
```

## Key Design Decisions

Explain any non-obvious design choices that affect how users interact with the library.
```

`template/docs/user-guide/configuration.md`:
```markdown
---
title: Configuration
---

# Configuration

## Configuration Object

```typescript
import type { Config } from '__PROJECT_NAME__';

const config: Config = {
  // Replace with your actual configuration options
  option1: 'default-value',
  option2: true,
};
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option1` | `string` | `'default'` | Replace with real option description |
| `option2` | `boolean` | `true` | Replace with real option description |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `__PROJECT_SLUG___OPTION` | Replace with real env var if applicable |

Replace or remove this section if your library doesn't use environment variables.
```

`template/docs/user-guide/features.md`:
```markdown
---
title: Features
---

# Features

## Feature 1: Replace with your feature name

Describe what this feature does and why it's useful.

```typescript
// Show a code example of using this feature
```

## Feature 2: Another feature

Describe the second major feature.

## Feature 3: Third feature

Add as many feature sections as you have features.
```

---

### Task 15: Create `developer-guide/` section

**Files:**
- Create: `template/docs/developer-guide/index.md`
- Create: `template/docs/developer-guide/data-model.md`
- Create: `template/docs/developer-guide/testing.md`
- Create: `template/docs/developer-guide/contributing.md`
- Create: `template/docs/developer-guide/architecture.md`

- [ ] **Step 1: Write all five files**

`template/docs/developer-guide/index.md`:
```markdown
---
title: Developer Guide
---

# Developer Guide

This section is for developers working on __PROJECT_NAME__ itself.

- [Architecture](./architecture) — high-level design
- [Data Model](./data-model) — types and schema
- [Testing](./testing) — test strategy and patterns
- [Contributing](./contributing) — how to contribute
```

`template/docs/developer-guide/data-model.md`:
```markdown
---
title: Data Model
---

# Data Model

## Core Types

Replace with your project's core TypeScript types and their relationships.

```typescript
// Example: your primary type
export interface YourType {
  id: string;
  // ...
}
```

## Relationships

Describe how types relate to each other. Use a diagram if helpful.

## Validation

Describe how input validation works (Zod, custom validators, etc.).
```

`template/docs/developer-guide/testing.md`:
```markdown
---
title: Testing
---

# Testing

## Test Structure

```
src/
└── __tests__/
    ├── unit/
    └── integration/
```

## Running Tests

```bash
pnpm test               # all tests
pnpm test:coverage      # with coverage report
pnpm test -- --watch    # watch mode
```

## Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../src/index.js';

describe('yourFunction', () => {
  it('should do X when given Y', () => {
    const result = yourFunction(input);
    expect(result).toEqual(expected);
  });
});
```

## Testing Philosophy

Replace with your project's specific testing approach and conventions.
```

`template/docs/developer-guide/contributing.md`:
```markdown
---
title: Contributing (Dev)
---

# Contributing — Developer Notes

This covers technical details for contributors. See the [user-facing contributing guide](../contributing) for the PR workflow.

## Project Setup

```bash
git clone https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__.git
cd __PROJECT_NAME__
pnpm install
pnpm build
pnpm test
```

## Code Conventions

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Biome for formatting — `pnpm lint:fix` before committing
- Conventional commits — required for release-please automation

## Release Process

Releases are fully automated:
1. Commit with conventional commit messages
2. release-please opens a versioned PR automatically
3. Merge the PR → release created → npm published → docs deployed
```

`template/docs/developer-guide/architecture.md`:
```markdown
---
title: Architecture Overview
---

# Architecture Overview

See the [Architecture section](../architecture/) for detailed documentation.

## Quick Summary

Describe your architecture in 2-3 sentences for developers scanning this guide.

## Key Files

| File | Responsibility |
|------|----------------|
| `src/index.ts` | Public API exports |
| `src/core.ts` | Replace with your core module |

## Extension Points

Describe how the library can be extended or customized.
```

---

### Task 16: Create `architecture/` section

**Files:**
- Create: `template/docs/architecture/index.md`
- Create: `template/docs/architecture/constitution.md`
- Create: `template/docs/architecture/data-model.md`
- Create: `template/docs/architecture/project.md`
- Create: `template/docs/architecture/quality-checks.md`
- Create: `template/docs/architecture/testing-plan.md`

- [ ] **Step 1: Write all six files**

`template/docs/architecture/index.md`:
```markdown
---
title: Architecture
---

# Architecture

This section documents the architectural decisions, constraints, and structure of __PROJECT_NAME__.

- [Constitution](./constitution) — principles and non-negotiable constraints
- [Data Model](./data-model) — schema and type hierarchy
- [Project Structure](./project) — file and module layout
- [Quality Checks](./quality-checks) — linting, typing, testing gates
- [Testing Plan](./testing-plan) — test strategy and coverage goals
```

`template/docs/architecture/constitution.md`:
```markdown
---
title: Constitution
---

# Constitution

The non-negotiable architectural principles for __PROJECT_NAME__.

## Core Principles

1. **TypeScript-first** — every public API is fully typed; no `any` in source code
2. **Zero runtime dependencies** — replace or remove if your project has deps
3. **Immutability** — replace with your principle
4. **Replace with your principle** — describe it

## Constraints

- Node.js `>= __NODE_VERSION__` — minimum runtime requirement
- ESM-only — no CommonJS output
- Add other constraints relevant to your project

## What This Is Not

Describe what __PROJECT_NAME__ explicitly does NOT do. Scope boundaries matter.
```

`template/docs/architecture/data-model.md`:
```markdown
---
title: Data Model
---

# Data Model

## Type Hierarchy

Replace with your project's type hierarchy diagram or description.

```
RootType
├── SubTypeA
│   └── LeafType
└── SubTypeB
```

## Source of Truth

The canonical types are defined in `src/types.ts`. Replace with your actual types file.

## Versioning

Describe how breaking changes to types are handled.
```

`template/docs/architecture/project.md`:
```markdown
---
title: Project Structure
---

# Project Structure

```
__PROJECT_NAME__/
├── src/
│   ├── index.ts          # public API exports
│   └── ...               # replace with your structure
├── docs/                 # documentation source
├── dist/                 # build output (gitignored)
└── package.json
```

## Module Boundaries

Describe the internal module structure and how modules relate.

## Public API

Everything exported from `src/index.ts` is part of the public API and subject to semver.
Everything else is internal and may change without notice.
```

`template/docs/architecture/quality-checks.md`:
```markdown
---
title: Quality Checks
---

# Quality Checks

## On Every Commit (pre-commit hook)

- Biome format + lint
- ESLint strict mode

## On Every Push / PR (CI)

- `pnpm typecheck` — TypeScript strict mode, zero errors allowed
- `pnpm lint` — Biome CI + ESLint with `--max-warnings=0`
- `pnpm test:coverage` — Vitest with v8 coverage
- `pnpm depcheck` — no unused dependencies
- `pnpm docs:build` — Docusaurus + TypeDoc build (docs branch only)
- Dependency Review — blocks PRs with known-vulnerable dependencies (CVE severity: moderate+)

## Gates

| Gate | Threshold |
|------|-----------|
| Test coverage | Replace with your target (e.g., 80%) |
| TypeScript errors | 0 |
| ESLint warnings | 0 |
| Dependency vulnerabilities | 0 moderate+ |
```

`template/docs/architecture/testing-plan.md`:
```markdown
---
title: Testing Plan
---

# Testing Plan

## Test Strategy

Replace with your project's testing strategy. For a library:
- **Unit tests** — every exported function, edge cases, error paths
- **Integration tests** — key workflows end-to-end
- No mocking of internal implementation details

## Coverage Goals

| Metric | Target |
|--------|--------|
| Line coverage | > 80% (replace with your target) |
| Branch coverage | > 75% |
| Function coverage | > 90% |

## Test File Conventions

```
src/
├── myModule.ts
└── __tests__/
    └── myModule.test.ts   # co-located with source
```

## What We Do Not Test

- Third-party library internals
- Build tooling (TypeScript, Biome)
- Generated files
```

---

### Task 17: Create `reference/` and `research/` sections, plus utility files

**Files:**
- Create: `template/docs/reference/cli.md`
- Create: `template/docs/reference/configuration.md`
- Create: `template/docs/reference/hooks.md`
- Create: `template/docs/research/real-world-demand.md`
- Create: `template/docs/research/competitor-analysis.md`
- Create: `template/docs/post-mortems/.gitkeep`
- Create: `template/docs/backlog.md`
- Create: `template/docs/handoff.md`

- [ ] **Step 1: Write `reference/cli.md`**

```markdown
---
title: CLI Reference
---

# CLI Reference

Remove this page if __PROJECT_NAME__ is not a CLI tool.

## Commands

### `__PROJECT_SLUG__ <command>`

Replace with your actual CLI command structure.

| Command | Description |
|---------|-------------|
| `init` | Replace with real command |
| `run` | Replace with real command |

## Global Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error |
```

- [ ] **Step 2: Write `reference/configuration.md`**

```markdown
---
title: Configuration Reference
---

# Configuration Reference

## Full Config Schema

```typescript
interface Config {
  // Replace with your actual Config interface
  required: string;
  optional?: boolean;
}
```

## Options

### `required`

**Type:** `string` · **Required:** yes

Description of this option.

### `optional`

**Type:** `boolean` · **Default:** `false`

Description of this option.

## Configuration Sources

List where configuration can come from (constructor args, env vars, config file, etc.).
```

- [ ] **Step 3: Write `reference/hooks.md`**

```markdown
---
title: Hooks Reference
---

# Hooks Reference

Remove this page if __PROJECT_NAME__ does not have a hooks/plugin system.

## Available Hooks

| Hook | When it fires | Arguments |
|------|--------------|-----------|
| `onInit` | Replace with real hook | `(config: Config) => void` |

## Example

```typescript
import { createInstance } from '__PROJECT_NAME__';

const instance = createInstance({
  hooks: {
    onInit: (config) => {
      console.log('Initialized', config);
    },
  },
});
```
```

- [ ] **Step 4: Write `research/real-world-demand.md`**

```markdown
---
title: Real-World Demand
---

# Real-World Demand

## Problem Evidence

Replace with evidence that the problem your library solves is real and common.
Links to Stack Overflow questions, GitHub issues, forum posts, etc.

## Existing Solutions

| Solution | Approach | Gap |
|----------|----------|-----|
| Competitor A | How they solve it | What's missing |
| Competitor B | How they solve it | What's missing |

## Our Position

Why __PROJECT_NAME__ fills the gap better than existing solutions.
```

- [ ] **Step 5: Write `research/competitor-analysis.md`**

```markdown
---
title: Competitor Analysis
---

# Competitor Analysis

## Comparison Table

| Feature | __PROJECT_NAME__ | Alt A | Alt B |
|---------|-----------------|-------|-------|
| TypeScript-first | ✅ | ❌ | ⚠️ |
| Bundle size | TBD | TBD | TBD |
| Replace with real feature | | | |

## Key Differentiators

List what makes __PROJECT_NAME__ genuinely different, not just feature-matched.

## Migration from Competitors

If relevant, describe how to migrate from the most common competing library.
```

- [ ] **Step 6: Create remaining utility files**

```bash
touch template/docs/post-mortems/.gitkeep
```

`template/docs/backlog.md`:
```markdown
# Backlog

Ideas and future work that haven't been scoped yet.
This file is gitignored — it's personal scratchpad space.

## Ideas

- 

## Low Priority

- 

## Won't Do (and why)

- 
```

`template/docs/handoff.md`:
```markdown
# Session Handoff

Use this file to capture context between work sessions.
This file is gitignored.

## Current State

## What I Was Working On

## Next Steps

## Open Questions

## Relevant File Paths

```

---

### Task 18: Update `.gitignore` and commit docs content

**Files:**
- Modify: `template/.gitignore`

- [ ] **Step 1: Add gitignore entries for generated and personal files**

Add to the end of `template/.gitignore`:

```
# Docusaurus generated files
docs/api/
.docusaurus/
build/

# Personal scratchpad (not for version control)
docs/backlog.md
docs/handoff.md
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
pnpm build 2>&1
```

Expected: exits 0.

- [ ] **Step 3: Commit Phase 3**

```bash
git add template/
git commit -m "feat(template): add comprehensive Docusaurus docs structure with all sections"
```

---

## Phase 4 — README Overhaul

### Task 19: Overhaul `template/README.md`

**Files:**
- Modify: `template/README.md`

The new README has rich shields.io badges and a structured pitch. Note: token is `__PROJECT_NAME__` (kebab-case, the npm package name), not `__PROJECT_SLUG__` (snake_case).

- [ ] **Step 1: Replace `template/README.md` entirely**

```markdown
# __PROJECT_NAME__

> __DESCRIPTION__

[![npm version](https://img.shields.io/npm/v/__PROJECT_NAME__?color=blue)](https://npmjs.com/package/__PROJECT_NAME__)
[![CI](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/actions/workflows/ci.yml/badge.svg)](https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/__GITHUB_HANDLE__/__PROJECT_NAME__/graph/badge.svg)](https://codecov.io/gh/__GITHUB_HANDLE__/__PROJECT_NAME__)
[![Docs](https://img.shields.io/badge/docs-online-informational)](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__)
[![License: __LICENSE__](https://img.shields.io/badge/License-__LICENSE__-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/__PROJECT_NAME__)](https://nodejs.org)

## What is __PROJECT_NAME__?

Replace this paragraph with a 2–3 sentence description. What does it do? Who is it for?
Why should someone choose it over alternatives?

## Features

| | Feature | Description |
|---|---------|-------------|
| ⚡ | **Fast** | Replace with a real performance claim |
| 🔒 | **Type-safe** | Full TypeScript with strict types |
| 🧪 | **Well tested** | Comprehensive test suite with coverage |
| 📦 | **Lightweight** | Minimal dependencies |

## Installation

```bash
# pnpm
pnpm add __PROJECT_NAME__

# npm
npm install __PROJECT_NAME__

# bun
bun add __PROJECT_NAME__
```

## Quick Start

```typescript
import { yourExport } from '__PROJECT_NAME__';

// Replace with the simplest possible working example
const result = yourExport({ input: 'value' });
```

## Documentation

Full documentation at **[__GITHUB_HANDLE__.github.io/__PROJECT_NAME__](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__)**

- [Getting Started](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__/getting-started)
- [User Guide](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__/user-guide/)
- [API Reference](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__/api)

## Contributing

See [CONTRIBUTING](https://__GITHUB_HANDLE__.github.io/__PROJECT_NAME__/contributing) for development setup and PR guidelines.

## License

[__LICENSE__](LICENSE) © __YEAR__ [__AUTHOR__](https://github.com/__GITHUB_HANDLE__)
```

- [ ] **Step 2: Commit Phase 4**

```bash
git add template/README.md
git commit -m "feat(template): overhaul README with rich badges and structured sections"
```

---

## Phase 5 — Verification

### Task 20: Smoke test and docs build verification

- [ ] **Step 1: Build the CLI**

```bash
pnpm build 2>&1
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 2: Run the smoke test**

```bash
NODE_ENV=development node smoke-test.mjs 2>&1
```

Expected: `Smoke test PASSED — output at: /path/to/create-ts-project-smoke`

- [ ] **Step 3: Verify key generated files exist in smoke output**

```bash
SMOKE=../create-ts-project-smoke
ls $SMOKE/.github/workflows/ | sort
```

Expected output includes:
```
ci.yml
codeql.yml
labeler.yml
release-please.yml
stale.yml
```

`release.yml` should NOT appear.

```bash
ls $SMOKE/.github/
```

Expected includes: `dependabot.yml`, `labeler.yml`, `release-please-config.json`, `.release-please-manifest.json`

```bash
ls $SMOKE/
```

Expected includes: `docusaurus.config.ts`, `sidebars.ts`, `static/`

```bash
grep -c '__PROJECT_NAME__' $SMOKE/docusaurus.config.ts
```

Expected: `0` (all tokens replaced)

```bash
grep 'smoke-test-lib' $SMOKE/docusaurus.config.ts | head -3
```

Expected: lines showing `title: 'smoke-test-lib'`, `projectName: 'smoke-test-lib'`, etc.

- [ ] **Step 4: Install deps and run Docusaurus build in smoke output**

```bash
cd ../create-ts-project-smoke && pnpm install 2>&1 | tail -5
```

Expected: exits 0, dependencies installed.

```bash
pnpm docs:build 2>&1 | tail -20
```

Expected: `[SUCCESS] Generated static files in build/` (or similar success message). No errors.

- [ ] **Step 5: Verify `includeDocs: false` transform strips Docusaurus files**

Temporarily edit `smoke-test.mjs` to set `includeDocs: false`, run the test, then revert:

```bash
node -e "
import('./dist/scaffold.js').then(async ({ scaffold }) => {
  const { rm } = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const out = '/tmp/smoke-no-docs';
  await rm(out, { recursive: true, force: true });
  await scaffold(out, {
    projectName: 'no-docs-test', projectSlug: 'no_docs_test',
    description: 'test', author: 'Test', email: 'test@test.com',
    githubHandle: 'testuser', nodeVersion: '22', packageManager: 'pnpm',
    projectType: 'library', includeGithubActions: true, publishToNpm: false,
    includeDocs: false, includeCodecov: false, includeDockerfile: false,
    includeDevcontainer: false, license: 'MIT',
  });
  const { existsSync } = await import('node:fs');
  console.log('docs/ exists:', existsSync(out + '/docs'));
  console.log('docusaurus.config.ts exists:', existsSync(out + '/docusaurus.config.ts'));
  console.log('sidebars.ts exists:', existsSync(out + '/sidebars.ts'));
});
" 2>&1
```

Expected:
```
docs/ exists: false
docusaurus.config.ts exists: false
sidebars.ts exists: false
```

- [ ] **Step 6: Verify `publishToNpm: false` strips publish job from release-please.yml**

```bash
node -e "
import('./dist/scaffold.js').then(async ({ scaffold }) => {
  const { rm } = await import('node:fs/promises');
  const out = '/tmp/smoke-no-publish';
  await rm(out, { recursive: true, force: true });
  await scaffold(out, {
    projectName: 'no-publish-test', projectSlug: 'no_publish_test',
    description: 'test', author: 'Test', email: 'test@test.com',
    githubHandle: 'testuser', nodeVersion: '22', packageManager: 'pnpm',
    projectType: 'library', includeGithubActions: true, publishToNpm: false,
    includeDocs: true, includeCodecov: false, includeDockerfile: false,
    includeDevcontainer: false, license: 'MIT',
  });
  const { readFileSync } = await import('node:fs');
  const workflow = readFileSync(out + '/.github/workflows/release-please.yml', 'utf8');
  console.log('publish job present:', workflow.includes('  publish:'));
  console.log('deploy-docs job present:', workflow.includes('  deploy-docs:'));
  console.log('release-please job present:', workflow.includes('  release-please:'));
});
" 2>&1
```

Expected:
```
publish job present: false
deploy-docs job present: true
release-please job present: true
```

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git status
```

If there are uncommitted changes from debugging:
```bash
git add -p
git commit -m "fix(template): address smoke test findings"
```

If clean:
```bash
echo "All verification steps passed. Implementation complete."
```
