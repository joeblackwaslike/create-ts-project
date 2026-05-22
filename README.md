# create-ts-project

Scaffold a production-ready TypeScript project with opinionated tooling — the TypeScript equivalent of [cookiecutter-uv](https://github.com/joeblackwaslike/cookiecutter-uv).

## Usage

```bash
# New project
pnpm create ts-project my-project

# Retrofit an existing repo
pnpm create ts-project --update .
```

## What's Included

| Python (cookiecutter-uv) | TypeScript equivalent |
|---|---|
| `uv` | `pnpm` |
| `ruff` | `Biome` |
| `wemake-python-styleguide` | ESLint strict (unicorn + sonarjs + import-x) |
| `mypy --strict` | `tsc --noEmit` + `@typescript-eslint/strictTypeChecked` |
| `pytest` + `coverage` | `Vitest` + `@vitest/coverage-v8` |
| `mkdocs-material` | `VitePress` |
| `deptry` | `depcheck` |
| `pre-commit` | `Husky` + `lint-staged` |
| `Makefile` | `justfile` |
| `tox` (multi-version) | CI matrix over Node 20/22 |

## Prompt Options

- **Project name** — kebab-case slug
- **Description** — one-liner
- **Author / Email / GitHub handle**
- **Node version** — 20, 22, 23
- **Package manager** — pnpm (default), bun, npm
- **Project type** — library, cli, server, mcp-server
- **GitHub Actions** — CI + release workflows
- **Publish to npm** — with provenance
- **VitePress docs** — deployed to GitHub Pages on release
- **Codecov** — coverage reporting
- **Dockerfile** — multi-stage Node build
- **Devcontainer** — full Claude Code-optimized environment
- **License** — MIT, Apache 2.0, BSD, ISC, GPL-3, None

## Development

```bash
pnpm install
pnpm build
pnpm test
```
