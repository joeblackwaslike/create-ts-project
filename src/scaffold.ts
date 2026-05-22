import { exec } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import degit from 'degit';
import fse from 'fs-extra';
import { globby } from 'globby';
import pc from 'picocolors';
// eslint-disable-next-line import-x/no-unresolved
import { applyTransforms } from './transforms/index.js';
// eslint-disable-next-line import-x/no-unresolved
import { type ProjectConfig, type TokenMap, toTokenMap } from './types.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEGIT_SOURCE = 'joeblackwaslike/degit-typescript/template';
const INSTALL_COMMANDS: Record<ProjectConfig['packageManager'], string> = {
  pnpm: 'pnpm install',
  bun: 'bun install',
  npm: 'npm install',
};

const logStep = (message: string): void => {
  // biome-ignore lint/suspicious/noConsole: intentional CLI output
  console.log(`  ${pc.green('✓')} ${message}`);
};

const isDevelopmentMode = (): boolean =>
  process.env.NODE_ENV === 'development' || process.env.__DEV_TEMPLATE_PATH__ !== undefined;

export async function checkDestinationDir(destDir: string): Promise<void> {
  try {
    const entries = await readdir(destDir);
    if (entries.length > 0) {
      throw new Error(`Directory ${destDir} already exists and is not empty.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

async function cloneTemplate(destDir: string): Promise<void> {
  if (isDevelopmentMode()) {
    const override = process.env.__DEV_TEMPLATE_PATH__;
    const localPath = override ?? path.resolve(__dirname, '..', 'template');
    await fse.copy(localPath, destDir);
    return;
  }
  const emitter = degit(DEGIT_SOURCE, { cache: false, force: true, verbose: false });
  await emitter.clone(destDir);
}

const BINARY_SAMPLE_SIZE = 8000;

function isBinaryBuffer(buffer: Buffer): boolean {
  const sampleSize = Math.min(buffer.length, BINARY_SAMPLE_SIZE);
  for (let index = 0; index < sampleSize; index++) {
    if (buffer[index] === 0) return true;
  }
  return false;
}

function replaceTokens(content: string, tokens: TokenMap): string {
  let result = content;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replaceAll(token, value);
  }
  return result;
}

async function replaceTokensInTree(destDir: string, tokens: TokenMap): Promise<void> {
  const files = await globby('**/*', {
    cwd: destDir,
    dot: true,
    gitignore: false,
    onlyFiles: true,
    ignore: ['node_modules/**', '.git/**'],
  });
  await Promise.all(
    files.map(async (relativePath) => {
      const filePath = path.join(destDir, relativePath);
      const buffer = await readFile(filePath);
      if (isBinaryBuffer(buffer)) return;
      const original = buffer.toString('utf8');
      const replaced = replaceTokens(original, tokens);
      if (replaced !== original) await writeFile(filePath, replaced, 'utf8');
    }),
  );
}

async function initGit(destDir: string): Promise<void> {
  await execAsync('git init', { cwd: destDir });
  await execAsync('git add -A', { cwd: destDir });
  await execAsync('git commit -m "chore: initial scaffold from create-ts-project"', {
    cwd: destDir,
  });
}

async function installDependencies(
  destDir: string,
  packageManager: ProjectConfig['packageManager'],
): Promise<void> {
  await execAsync(INSTALL_COMMANDS[packageManager], { cwd: destDir });
}

export async function scaffold(destDir: string, config: ProjectConfig): Promise<void> {
  await cloneTemplate(destDir);
  logStep('Cloning template...');
  await replaceTokensInTree(destDir, toTokenMap(config));
  logStep('Replacing tokens...');
  await applyTransforms(destDir, config);
  logStep('Applying transforms...');
  await initGit(destDir);
  logStep('Initializing git...');
  await installDependencies(destDir, config.packageManager);
  logStep('Installing dependencies...');
}
