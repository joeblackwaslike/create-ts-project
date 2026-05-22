#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import * as clack from '@clack/prompts';
// eslint-disable-next-line import-x/no-unresolved
import { runPrompts } from './prompts.js';
// eslint-disable-next-line import-x/no-unresolved
import { checkDestinationDir, scaffold } from './scaffold.js';
// eslint-disable-next-line import-x/no-unresolved
import { updateProject } from './update.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const HELP_TEXT = `Usage:
  create-ts-project [project-name]   Scaffold a new TypeScript project
  create-ts-project --update [dir]   Update an existing repo with template tooling

Examples:
  create-ts-project my-lib
  create-ts-project --update .
  create-ts-project --update /path/to/repo
`;

async function runCreate(projectName?: string): Promise<void> {
  const destDir = path.resolve(projectName ?? '.');
  await checkDestinationDir(destDir);
  const config = await runPrompts(projectName);
  await scaffold(destDir, config);
  clack.outro(`Project created at ${destDir}`);
}

async function runUpdate(targetDir: string): Promise<void> {
  const resolvedDir = path.resolve(targetDir);
  await updateProject(resolvedDir);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update') || args.includes('-u');
  const isHelp = args.includes('--help') || args.includes('-h');
  const isVersion = args.includes('--version') || args.includes('-v');
  const positionalArgs = args.filter((a) => !a.startsWith('-'));
  const firstPositional = positionalArgs.find(Boolean);

  if (isHelp) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (isVersion) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }

  if (isUpdate) {
    await runUpdate(firstPositional ?? '.');
    return;
  }

  await runCreate(firstPositional);
}

await main().catch((error: unknown) => {
  if (error instanceof Error) {
    clack.log.error(error.message);
  } else {
    clack.log.error(String(error));
  }
  process.exit(1);
});
