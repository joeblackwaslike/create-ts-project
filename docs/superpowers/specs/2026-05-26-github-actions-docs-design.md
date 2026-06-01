# Design: GitHub Actions Suite + Docusaurus Docs + Rich README

**Date:** 2026-05-26
**Project:** `create-ts-project`
**Status:** Approved

---

## Context

The current template ships with minimal CI (ci.yml + release.yml) and a basic VitePress docs site. This design upgrades the template to a production-grade GitHub Actions suite with automated releases, security scanning, and PR automation; replaces VitePress with a full Docusaurus 3 docs system including TypeDoc-generated API reference; and enriches the README with comprehensive badges and structure.

---

## 1. GitHub Actions Workflows

### Workflow inventory (post-change)

| File | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | push/PR to `main` | Quality + test matrix + build + dependency review |
| `release-please.yml` | push to `main` | Opens release PRs; gates npm publish + docs deploy |
| `codeql.yml` | push/PR/weekly | Security analysis (JS/TS) |
| `labeler.yml` | PR opened/sync | Auto-labels PRs from file paths |
| `stale.yml` | daily schedule | Marks/closes stale issues and PRs |
| `dependabot.yml` | weekly | Dependency update PRs for npm + actions |

`release.yml` is removed and replaced by `release-please.yml`.

---

### `ci.yml` changes

Add a `dependency-review` job (PR-only):

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

All other jobs (quality, test-matrix, build, docs-build) remain. The docs job uses `pnpm docs:build` which now triggers Docusaurus + TypeDoc.

---

### `release-please.yml` (replaces `release.yml`)

Three jobs chained via `release_created` output:

```text
push to main
  └─ release-please-action@v4
       └─ [if release_created]
            ├─ publish (npm, OIDC provenance)    ← gated by publishToNpm
            └─ deploy-docs (GitHub Pages)        ← gated by includeDocs
```

Config files required:

- `.github/release-please-config.json` — `{ "release-type": "node", "packages": { ".": {} } }`
- `.github/.release-please-manifest.json` — `{ ".": "0.1.0" }` (hardcoded initial version)

The `publish` job uses `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` with `--provenance --access public`. The `deploy-docs` job builds Docusaurus and deploys via `peaceiris/actions-gh-pages@v4` from `./build`.

Both jobs are wrapped in the same transform conditionals as today (`npm-publish.ts`, `documentation.ts`).

---

### `codeql.yml`

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 1 * * 1'   # weekly Monday

jobs:
  analyze:
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

---

### `labeler.yml` + `.github/labeler.yml`

Uses `actions/labeler@v5`. Label rules in `.github/labeler.yml`:

```yaml
docs:
  - docs/**
  - '**/*.md'
ci:
  - .github/**
tests:
  - 'src/**/*.test.ts'
  - 'src/**/*.spec.ts'
dependencies:
  - package.json
  - pnpm-lock.yaml
source:
  - src/**
```

---

### `stale.yml`

- Issues: stale at 60 days, close at 67 days
- PRs: stale at 30 days, **never auto-close** (PR authors can resume)
- Exempt labels: `pinned`, `security`, `in-progress`

---

### `.github/dependabot.yml`

```yaml
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    labels: [dependencies]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    labels: [ci, dependencies]
```

---

## 2. Docusaurus 3 Docs System

### Replaces VitePress

Remove: `template/docs/.vitepress/`

Add at template root:

- `docusaurus.config.ts`
- `sidebars.ts`
- `static/img/logo.svg` (placeholder SVG)

### Template tokens in Docusaurus config

`docusaurus.config.ts` uses tokens for:

- `title`: `__PROJECT_NAME__`
- `tagline`: `__DESCRIPTION__`
- `url`: `https://__GITHUB_HANDLE__.github.io`
- `baseUrl`: `/__PROJECT_SLUG__/`
- GitHub org/repo in `editUrl` and social links

### Plugins

- `@docusaurus/preset-classic` (docs + blog disabled, navbar)
- `docusaurus-plugin-typedoc` → points at `src/index.ts`, outputs to `docs/api/`
- `@docusaurus/plugin-sitemap`
- Algolia DocSearch: **commented out** in `docusaurus.config.ts` with a TODO note (`Apply at docsearch.algolia.com`)

### Full docs directory structure

```text
template/docs/
├── intro.md                        # hero landing page (CTA, viral pitch)
├── installation.md
├── getting-started.md
├── examples.md
├── contributing.md
├── changelog.md                    # placeholder; release-please populates CHANGELOG.md
│
├── user-guide/
│   ├── index.md
│   ├── how-it-works.md
│   ├── configuration.md
│   └── features.md                 # placeholder feature docs
│
├── developer-guide/
│   ├── index.md
│   ├── data-model.md
│   ├── testing.md
│   ├── contributing.md
│   └── architecture.md             # link into architecture/
│
├── architecture/
│   ├── index.md                    # architecture README
│   ├── constitution.md             # principles / decisions
│   ├── data-model.md
│   ├── project.md                  # project structure
│   ├── quality-checks.md
│   └── testing-plan.md
│
├── reference/
│   ├── cli.md
│   ├── configuration.md
│   └── hooks.md
│
├── research/
│   ├── real-world-demand.md
│   └── competitor-analysis.md
│
├── post-mortems/
│   └── .gitkeep
│
├── api/                            # docusaurus-plugin-typedoc writes here at build time
│   └── (generated — gitignored)
│
├── backlog.md                      # gitignored — personal idea parking lot
└── handoff.md                      # gitignored — session handoff scratchpad
```

### Gitignore additions

`docs/backlog.md`, `docs/handoff.md`, and `docs/api/` (generated) are added to `template/.gitignore`.

### `intro.md` — landing page

This is the squeeze page. Content should:

- Open with a bold one-liner hook
- Hit pain point → solution → proof (3 paragraphs max)
- Feature grid (3-column with icons)
- Single CTA: `npm create ts-project@latest` in a copyable code block
- Secondary CTA: link to Getting Started

Placeholder content ships in the template with `__PROJECT_NAME__` and `__DESCRIPTION__` tokens. Developers replace it with project-specific copy.

### `sidebars.ts`

Explicit sidebar structure covering all sections in order:

1. Getting Started (intro, installation, getting-started, examples)
2. User Guide
3. Developer Guide
4. Architecture
5. Reference
6. API (TypeDoc — `autogenerated` type pointing at `docs/api/`)
7. Research
8. Post-mortems
9. Changelog

### `package.json` script changes

Remove: `docs:dev`, `docs:build` (VitePress), `docs:preview`

Add:

```json
"docs:start":  "docusaurus start",
"docs:build":  "docusaurus build",
"docs:serve":  "docusaurus serve",
"docs:clear":  "docusaurus clear"
```

### `devDependencies` changes

Remove: `vitepress`

Add:

```json
"@docusaurus/core": "^3.8",
"@docusaurus/preset-classic": "^3.8",
"docusaurus-plugin-typedoc": "^1.x",
"typedoc": "^0.27"
```

(`typedoc-plugin-markdown` is a transitive dep of `docusaurus-plugin-typedoc`, not a direct dep.)

### `documentation.ts` transform

Update: when `includeDocs: false`, remove Docusaurus config files instead of VitePress files. Logic otherwise identical.

---

## 3. README

### Badges (full set)

```markdown
[![npm version](https://img.shields.io/npm/v/__PROJECT_SLUG__?color=blue)](https://npmjs.com/package/__PROJECT_SLUG__)
[![CI](https://github.com/__GITHUB_HANDLE__/__PROJECT_SLUG__/actions/workflows/ci.yml/badge.svg)](https://github.com/__GITHUB_HANDLE__/__PROJECT_SLUG__/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/__GITHUB_HANDLE__/__PROJECT_SLUG__/graph/badge.svg)](https://codecov.io/gh/__GITHUB_HANDLE__/__PROJECT_SLUG__)
[![Docs](https://img.shields.io/badge/docs-online-informational)](https://__GITHUB_HANDLE__.github.io/__PROJECT_SLUG__)
[![License: __LICENSE__](https://img.shields.io/badge/License-__LICENSE__-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/__PROJECT_SLUG__)](https://nodejs.org)
```

### Section structure

```text
# __PROJECT_NAME__

> __DESCRIPTION__

[badges]

## What is __PROJECT_NAME__?
(2–3 sentence pitch — token placeholder)

## Features
(placeholder feature table with 3 rows)

## Installation
npm / pnpm / bun install commands

## Quick Start
(minimal working example)

## Documentation
Link to docs site + brief section descriptions

## Contributing
Link to CONTRIBUTING.md / developer guide

## License
__LICENSE__ © __YEAR__ __AUTHOR__
```

---

## 4. `src/transforms/github-actions.ts` changes

The transform currently handles conditional inclusion of GitHub Actions workflows. Decision: **ship all new workflows unconditionally**. They are universally useful and have zero running cost until triggered. Avoids prompt bloat. The `npm-publish` and `includeDocs` conditionals remain as-is for the publish and deploy-docs jobs in `release-please.yml`.

---

## 5. Files Modified / Created

### In `template/`

**Modified:**

- `.github/workflows/ci.yml` — add dependency-review job
- `package.json` — swap vitepress for docusaurus deps, update scripts
- `justfile` — update docs targets (start/build/serve/clear)
- `README.md` — full overhaul
- `.gitignore` — add `docs/api/`, `docs/backlog.md`, `docs/handoff.md`

**Deleted:**

- `.github/workflows/release.yml`
- `docs/.vitepress/` (entire directory)
- `docs/index.md` (replaced by `docs/intro.md`)

**Created:**

- `.github/workflows/release-please.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/labeler.yml`
- `.github/workflows/stale.yml`
- `.github/dependabot.yml`
- `.github/labeler.yml`
- `.github/release-please-config.json`
- `.github/.release-please-manifest.json`
- `docusaurus.config.ts`
- `sidebars.ts`
- `static/img/logo.svg`
- All `docs/` content files (see structure above)

### In `src/`

**Modified:**

- `src/transforms/documentation.ts` — target Docusaurus files instead of VitePress
- `src/transforms/github-actions.ts` — remove release.yml entry, no new conditionals needed

---

## 6. Verification

1. **Scaffold a test project:** `NODE_ENV=development node smoke-test.mjs` — confirm Docusaurus config, new workflows, README badges all have tokens replaced correctly
2. **Docs build:** `cd smoke-output && pnpm docs:build` — Docusaurus + TypeDoc build completes without errors
3. **Docs serve:** `pnpm docs:serve` — landing page loads, API reference renders, all nav sections present
4. **Workflow validity:** `gh workflow list` or `act` dry-run on each workflow file
5. **Transform off:** Re-run scaffold with `includeDocs: false` — confirm Docusaurus config files are removed
6. **Transform off:** Re-run scaffold with `publishToNpm: false` — confirm `release-please.yml` publish job is stripped
