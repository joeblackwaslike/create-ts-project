# Framework Reference

Quick reference for every framework bundled in `spinup-ts` scaffolded projects.

---

## Biome

**Role:** Formatter + import organizer + safety linter (replaces Prettier + some ESLint rules)
**Config:** `biome.json` in project root
**Docs:** https://biomejs.dev
**Version:** check `package.json` → `devDependencies`

### Key Commands

```bash
pnpm biome check .            # lint + format check (no writes)
pnpm biome check --write .    # fix safe issues
pnpm biome format --write .   # format only
```

### What Biome Covers

- Formatting (indentation, trailing commas, semicolons, quotes)
- Import sorting + organization
- Safety lint rules (no unused variables, no-explicit-any, etc.)
- Does NOT cover: complexity rules, naming conventions, unicorn rules, security rules (ESLint handles those)

### biome.json Shape

```json
{
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all" } },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "organizeImports": { "enabled": true }
}
```

---

## ESLint (Strict Mode)

**Role:** Complex rules that Biome cannot express — structural complexity, unicorn idioms, security, import graph
**Config:** `eslint.config.mjs` in project root
**Docs:** https://eslint.org
**Key plugins:** `@typescript-eslint/strict-type-checked`, `eslint-plugin-unicorn`, `eslint-plugin-sonarjs`, `eslint-plugin-import-x`, `eslint-plugin-no-secrets`

### Key Commands

```bash
pnpm eslint .                              # check
pnpm eslint --fix --max-warnings=0 .      # fix + fail on any warning
```

### What ESLint Covers (gaps Biome cannot fill)

- `@typescript-eslint/strictTypeChecked` — advanced type narrowing, explicit return types
- `unicorn` — prefer modern JS idioms (`Array.from`, `Object.entries`, `?.`, `??`)
- `sonarjs` — cognitive complexity, code duplication
- `import-x` — circular imports, parent-import rules
- `no-secrets` — detect hardcoded secrets
- `max-lines-per-function`, `max-statements`, `max-params`, `max-depth` — structural limits

### Key Limits (that pre-commit will enforce)

| Rule | Default Limit |
|---|---|
| `max-lines-per-function` | 80 lines |
| `max-statements` | 20 statements |
| `max-params` | 4 parameters |
| `max-depth` | 3 nesting levels |

Violations are **errors** at `--max-warnings=0`. Extract helper functions when limits are hit.

---

## TypeScript (tsc)

**Role:** Static type checking with strictest settings
**Config:** `tsconfig.json`
**Docs:** https://www.typescriptlang.org

### Non-negotiable compiler flags

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

`noUncheckedIndexedAccess` — array/object index access returns `T | undefined`. Always check before use.
`exactOptionalPropertyTypes` — `{ foo?: string }` means `foo` is `string | undefined`, not `string | undefined | absent`.

---

## Vitest

**Role:** Unit + integration test runner (Vite-native, ESM-first)
**Config:** `vitest.config.ts`
**Docs:** https://vitest.dev
**Coverage:** `@vitest/coverage-v8`

### Key Commands

```bash
pnpm test                # run all tests
pnpm test:watch          # watch mode
pnpm test:coverage       # with V8 coverage report
```

### Test File Convention

```
tests/
  unit/
  integration/
```

Test files: `*.test.ts` or `*.spec.ts`.

---

## Husky + lint-staged

**Role:** Run linters on staged files before every commit
**Hook file:** `.husky/pre-commit`
**Config:** `"lint-staged"` key in `package.json`

### How it works

On `git commit`, `lint-staged` runs:
1. `biome check --write` on `*.{ts,js,json,md}` files
2. `eslint --fix --max-warnings=0` on `*.ts` files

If either fails, the commit is blocked and changes are reverted. Fix the issues and re-stage.

### Skipping (emergency only)

```bash
git commit --no-verify -m "message"   # bypasses hooks — use sparingly
```

---

## GitHub Actions

**Workflows included:**

| File | Purpose |
|---|---|
| `ci.yml` | Test matrix (Node 20, 22), lint, typecheck, coverage, dependency review |
| `release-please.yml` | Automated versioning and changelog from conventional commits |
| `codeql.yml` | Static security analysis |
| `labeler.yml` | Auto-label PRs by file path |
| `stale.yml` | Auto-close stale issues and PRs |
| `dependabot.yml` | Automated dependency updates |

### CI Matrix

Tests run on Node 20 and Node 22 × latest Ubuntu.

### Conventional Commits (for release-please)

| Prefix | Version bump |
|---|---|
| `feat:` | minor |
| `fix:` | patch |
| `feat!:` / `BREAKING CHANGE:` | major |
| `chore:`, `docs:`, `test:` | no bump |

---

## Docusaurus 3

**Role:** Documentation site — guides, API reference, concepts, architecture
**Config:** `docusaurus.config.ts`, `sidebars.ts`
**Docs:** https://docusaurus.io
**Skill:** `agent-skills:docusaurus-docs-builder` (invoke for any Docusaurus work)

### Key Commands

```bash
pnpm --filter docs start      # dev server at localhost:3000
pnpm --filter docs build      # production build → docs/build/
pnpm --filter docs serve      # serve built site locally
```

### Included Plugins

- `@docusaurus/plugin-content-docs` — docs pages
- `@docusaurus/plugin-content-blog` — changelog blog
- `docusaurus-plugin-typedoc` — generates API reference from TypeScript source
- `docusaurus-plugin-llms` — generates `llms.txt` and `llms-full.txt` for LLM consumption

### llms.txt

Generated at `/llms.txt` and `/llms-full.txt` by `docusaurus-plugin-llms`. These files make the docs consumable by AI systems following the [llms.txt spec](https://llmstxt.org).

---

## devcontainer

**Role:** Reproducible development environment (VS Code Dev Containers, GitHub Codespaces)
**Config:** `.devcontainer/devcontainer.json`, `.devcontainer/Dockerfile`, `.devcontainer/.zshrc`
**Docs:** https://containers.dev

### What's Configured

- Zsh + Oh My Zsh with `eza`, `fzf`, `zoxide`
- Node (via nvm), pnpm, bun pre-installed
- VS Code extensions: Biome, ESLint, GitLens, GitHub Copilot, Thunder Client
- Ports forwarded for dev server

---

## Dockerfile

**Role:** Production container image for server/API projects
**Files:** `Dockerfile`, `docker-compose.yml`

Multi-stage build:
1. `deps` — install production dependencies
2. `build` — compile TypeScript
3. `runner` — minimal image with compiled output only

---

## justfile

**Role:** Task runner (`just` command) — development shortcuts
**Docs:** https://just.systems

```bash
just          # list available recipes
just build    # pnpm build
just test     # pnpm test
just check    # lint + typecheck
just release  # trigger release-please
```

---

## release-please

**Role:** Automated semver versioning, CHANGELOG.md, and GitHub Release creation from conventional commits
**Config:** `release-please-config.json`, `.release-please-manifest.json`
**Docs:** https://github.com/googleapis/release-please

Workflow: push conventional commits → release-please opens a Release PR → merge it → tag + GitHub Release + CHANGELOG entry created automatically.

---

## TypeDoc

**Role:** API reference documentation generated from TypeScript source
**Config:** options in `docusaurus.config.ts` → `docusaurus-plugin-typedoc`
**Docs:** https://typedoc.org

Generates Markdown from JSDoc/TSDoc comments in `src/` and writes them into `docs/api/`.
