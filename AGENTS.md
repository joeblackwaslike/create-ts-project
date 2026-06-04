# create-ts-project

TypeScript project scaffolding CLI — the `cookiecutter-uv` equivalent for the TypeScript ecosystem.

## Commands

|Command|Purpose|
|---|---|
|`pnpm build`|Compile TypeScript → `dist/`|
|`pnpm dev`|Watch mode|
|`pnpm test`|Vitest|
|`pnpm test:coverage`|Coverage report|
|`pnpm lint`|Biome + ESLint|
|`pnpm typecheck`|`tsc --noEmit`|
|`pnpm check`|lint + typecheck together|

## Key Files

- `src/prompts.ts` — interactive CLI prompts; reads `~/.create-ts-projectrc.json` for defaults
- `src/scaffold.ts` — degit + post-scaffold setup; template source is `joeblackwaslike/create-ts-project/template`
- `src/update.ts` — `--update` mode for retrofitting existing repos
- `src/types.ts` — Zod schemas: `ProjectConfig`, `UserDefaults`
- `template/` — the scaffolded project template

## Local Dev

Run `npm link` after any folder move to keep the global `create-ts-project` symlink current.

## User Defaults

Persist prompt defaults to `~/.create-ts-projectrc.json`. Schema: `UserDefaults` in `src/types.ts`.
