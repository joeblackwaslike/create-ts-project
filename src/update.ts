import { constants, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as clack from '@clack/prompts';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

const PKG_FILENAME = 'package.json';
const BIOME_FILENAME = 'biome.json';
const ESLINT_FILENAME = 'eslint.config.mjs';

interface UpdateOption {
  value: string;
  label: string;
  hint?: string;
  apply: (dir: string) => Promise<void>;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function applyBiome(dir: string): Promise<void> {
  await fs.copy(path.join(TEMPLATE_DIR, BIOME_FILENAME), path.join(dir, BIOME_FILENAME), {
    overwrite: false,
    errorOnExist: false,
  });
}

async function applyTsconfig(dir: string): Promise<void> {
  const tsconfigPath = path.join(dir, 'tsconfig.json');
  const tsconfig = (await fs.readJson(tsconfigPath)) as {
    compilerOptions?: Record<string, unknown>;
  };
  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
  };
  await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
}

async function applyEslint(dir: string): Promise<void> {
  await fs.copy(path.join(TEMPLATE_DIR, ESLINT_FILENAME), path.join(dir, ESLINT_FILENAME), {
    overwrite: false,
    errorOnExist: false,
  });
}

async function applyHusky(dir: string): Promise<void> {
  const huskyDir = path.join(dir, '.husky');
  await fs.ensureDir(huskyDir);
  await fs.writeFile(path.join(huskyDir, 'pre-commit'), 'pnpm lint-staged\n', 'utf8');

  const packagePath = path.join(dir, PKG_FILENAME);
  const packageJson = (await fs.readJson(packagePath)) as {
    scripts?: Partial<Record<string, string>>;
    'lint-staged'?: Record<string, string | string[]>;
  };
  packageJson.scripts = { ...packageJson.scripts };
  packageJson.scripts.prepare ??= 'husky';
  packageJson['lint-staged'] ??= {
    '*.{ts,js,json,md}': [
      'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
    ],
    '*.ts': ['eslint --fix --max-warnings=0 --no-warn-ignored'],
  };
  await fs.writeJson(packagePath, packageJson, { spaces: 2 });
}

async function applyCi(dir: string): Promise<void> {
  const target = path.join(dir, '.github', 'workflows', 'ci.yml');
  await fs.ensureDir(path.dirname(target));
  await fs.copy(path.join(TEMPLATE_DIR, '.github', 'workflows', 'ci.yml'), target, {
    overwrite: false,
    errorOnExist: false,
  });
}

async function applyVscode(dir: string): Promise<void> {
  const vscodeDir = path.join(dir, '.vscode');
  await fs.ensureDir(vscodeDir);
  const settingsPath = path.join(vscodeDir, 'settings.json');
  const biomeSettings = {
    'editor.defaultFormatter': 'biomejs.biome',
    'editor.formatOnSave': true,
    'editor.codeActionsOnSave': {
      'quickfix.biome': 'explicit',
      'source.organizeImports.biome': 'explicit',
    },
  };
  const existing = (await pathExists(settingsPath))
    ? ((await fs.readJson(settingsPath)) as Record<string, unknown>)
    : {};
  await fs.writeJson(settingsPath, { ...existing, ...biomeSettings }, { spaces: 2 });
}

async function detectAvailableUpdates(targetDir: string): Promise<UpdateOption[]> {
  const options: UpdateOption[] = [];

  if (!(await pathExists(path.join(targetDir, BIOME_FILENAME)))) {
    options.push({
      value: 'biome',
      label: 'Add Biome config',
      hint: 'copy template biome.json',
      apply: applyBiome,
    });
  }

  const tsconfigPath = path.join(targetDir, 'tsconfig.json');
  if (await pathExists(tsconfigPath)) {
    const tsconfig = (await fs.readJson(tsconfigPath)) as {
      compilerOptions?: Record<string, unknown>;
    };
    const co = tsconfig.compilerOptions ?? {};
    if (co.noUncheckedIndexedAccess !== true || co.exactOptionalPropertyTypes !== true) {
      options.push({
        value: 'tsconfig',
        label: 'Tighten tsconfig.json',
        hint: 'add noUncheckedIndexedAccess + exactOptionalPropertyTypes',
        apply: applyTsconfig,
      });
    }
  }

  if (!(await pathExists(path.join(targetDir, ESLINT_FILENAME)))) {
    options.push({
      value: 'eslint',
      label: 'Add ESLint strict config',
      hint: 'copy template eslint.config.mjs',
      apply: applyEslint,
    });
  }

  const packagePath = path.join(targetDir, PKG_FILENAME);
  const huskyPreCommit = path.join(targetDir, '.husky', 'pre-commit');
  const packageJson = (await fs.readJson(packagePath)) as {
    scripts?: Record<string, string>;
    'lint-staged'?: unknown;
  };
  if (
    !(await pathExists(huskyPreCommit)) ||
    !packageJson['lint-staged'] ||
    !packageJson.scripts?.prepare
  ) {
    options.push({
      value: 'husky',
      label: 'Add Husky + lint-staged',
      hint: 'pre-commit hook with biome + eslint',
      apply: applyHusky,
    });
  }

  if (!(await pathExists(path.join(targetDir, '.github', 'workflows', 'ci.yml')))) {
    options.push({
      value: 'ci',
      label: 'Add GitHub Actions CI',
      hint: 'copy template ci.yml',
      apply: applyCi,
    });
  }

  options.push({
    value: 'vscode',
    label: 'Configure VS Code Biome formatter',
    hint: 'merge .vscode/settings.json',
    apply: applyVscode,
  });

  return options;
}

export async function updateProject(targetDir: string): Promise<void> {
  if (!(await pathExists(targetDir))) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }
  if (!(await pathExists(path.join(targetDir, PKG_FILENAME)))) {
    throw new Error(`No package.json found in ${targetDir}`);
  }

  clack.intro('create-ts-project update');

  const available = await detectAvailableUpdates(targetDir);

  if (available.length === 0) {
    clack.outro('Nothing to update — your project is already up to date!');
    return;
  }

  const selected = await clack.multiselect<string>({
    message: 'Select updates to apply:',
    options: available.map(({ value, label, hint }) =>
      hint ? { value, label, hint } : { value, label },
    ),
    required: false,
  });

  if (clack.isCancel(selected) || selected.length === 0) {
    clack.cancel('No updates applied.');
    return;
  }

  const chosen = available.filter((o) => selected.includes(o.value));

  const spinner = clack.spinner();
  spinner.start('Applying updates...');
  for (const update of chosen) {
    await update.apply(targetDir);
  }
  spinner.stop('Done!');

  clack.outro(`Applied ${chosen.length} update(s). Review changes with \`git diff\`.`);
}
