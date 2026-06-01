import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import * as clack from '@clack/prompts';

/* eslint-disable import-x/no-unresolved */
import {
  type ProjectConfig,
  type UserDefaults,
  deriveSlug,
  projectConfigSchema,
  userDefaultsSchema,
} from './types.js';
/* eslint-enable import-x/no-unresolved */

const RC_PATH = path.join(homedir(), '.create-ts-projectrc.json');

async function loadUserDefaults(): Promise<UserDefaults> {
  try {
    const raw = await readFile(RC_PATH, 'utf8');
    const result = userDefaultsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/** kebab-case identifier: starts with a letter, then letters/digits/hyphens. */
const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;
/** Lightweight RFC 5322-ish email check; full validation happens in Zod. */
// eslint-disable-next-line sonarjs/slow-regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Narrow a clack prompt result, exiting cleanly if the user cancelled.
 * Returns the value typed as `T` on success.
 */
function unwrap<T>(value: T | symbol): T {
  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}

/** Validator for the project name text prompt. */
function validateProjectName(value: string): string | undefined {
  if (!value) return 'Project name is required';
  if (!KEBAB_CASE.test(value)) {
    return 'Use kebab-case: lowercase letters, numbers, hyphens; start with a letter';
  }
  return undefined;
}

/** Validator for the author email text prompt. */
function validateEmail(value: string): string | undefined {
  if (!value) return 'Email is required';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
  return undefined;
}

/** Prompt for the project name, or return the provided CLI arg if valid. */
async function promptProjectName(provided?: string): Promise<string> {
  if (provided !== undefined) {
    const err = validateProjectName(provided);
    if (err) {
      clack.cancel(`Invalid project name "${provided}": ${err}`);
      process.exit(1);
    }
    return provided;
  }
  const value = await clack.text({
    message: 'Project name?',
    placeholder: 'my-awesome-lib',
    validate: validateProjectName,
  });
  return unwrap(value);
}

/** Build the human-readable feature summary line. */
function summarizeFeatures(config: ProjectConfig): string {
  const features: string[] = [];
  if (config.includeGithubActions) features.push('GitHub Actions');
  if (config.publishToNpm) features.push('npm publish');
  if (config.includeDocs) features.push('Docusaurus docs');
  if (config.includeCodecov) features.push('Codecov');
  if (config.includeDockerfile) features.push('Dockerfile');
  if (config.includeDevcontainer) features.push('devcontainer');
  features.push(`${config.license} license`);
  return features.join(', ');
}

/**
 * Run the full interactive prompt flow and return a validated {@link ProjectConfig}.
 *
 * @param projectName - Optional name from CLI args; when provided, the name prompt is skipped.
 */
// eslint-disable-next-line max-lines-per-function, max-statements
export async function runPrompts(projectName?: string): Promise<ProjectConfig> {
  clack.intro('create-ts-project');

  const d = await loadUserDefaults();

  const name = await promptProjectName(projectName);

  const description = unwrap(
    await clack.text({
      message: 'Short description?',
      placeholder: 'A delightful TypeScript project',
    }),
  );

  const author = unwrap(
    await clack.text({
      message: 'Author name?',
      ...(d.author !== undefined && { initialValue: d.author }),
      validate: (v) => (v ? undefined : 'Author name is required'),
    }),
  );

  const email = unwrap(
    await clack.text({
      message: 'Author email?',
      ...(d.email !== undefined && { initialValue: d.email }),
      validate: validateEmail,
    }),
  );

  const githubHandle = unwrap(
    await clack.text({
      message: 'GitHub handle?',
      placeholder: 'octocat',
      ...(d.githubHandle !== undefined && { initialValue: d.githubHandle }),
      validate: (v) => (v ? undefined : 'GitHub handle is required'),
    }),
  );

  const nodeVersion = unwrap(
    await clack.select<'20' | '22' | '23'>({
      message: 'Node version?',
      initialValue: d.nodeVersion ?? '22',
      options: [
        { value: '20', label: '20' },
        { value: '22', label: '22', hint: 'LTS ✓' },
        { value: '23', label: '23' },
      ],
    }),
  );

  const packageManager = unwrap(
    await clack.select<'pnpm' | 'bun' | 'npm'>({
      message: 'Package manager?',
      initialValue: d.packageManager ?? 'pnpm',
      options: [
        { value: 'pnpm', label: 'pnpm', hint: 'recommended' },
        { value: 'bun', label: 'bun' },
        { value: 'npm', label: 'npm' },
      ],
    }),
  );

  const projectType = unwrap(
    await clack.select<'library' | 'cli' | 'server' | 'mcp-server'>({
      message: 'Project type?',
      initialValue: d.projectType ?? 'library',
      options: [
        { value: 'library', label: 'library' },
        { value: 'cli', label: 'cli' },
        { value: 'server', label: 'server' },
        { value: 'mcp-server', label: 'mcp-server' },
      ],
    }),
  );

  const includeGithubActions = unwrap(
    await clack.confirm({
      message: 'Include GitHub Actions?',
      initialValue: d.includeGithubActions ?? true,
    }),
  );

  const publishToNpm = unwrap(
    await clack.confirm({
      message: 'Publish to npm?',
      initialValue: d.publishToNpm ?? false,
    }),
  );

  const includeDocumentation = unwrap(
    await clack.confirm({
      message: 'Include Docusaurus docs?',
      initialValue: d.includeDocs ?? false,
    }),
  );

  const includeCodecov = unwrap(
    await clack.confirm({
      message: 'Include Codecov?',
      initialValue: d.includeCodecov ?? false,
    }),
  );

  const includeDockerfile = unwrap(
    await clack.confirm({
      message: 'Include Dockerfile?',
      initialValue: d.includeDockerfile ?? false,
    }),
  );

  const includeDevcontainer = unwrap(
    await clack.confirm({
      message: 'Include devcontainer?',
      initialValue: d.includeDevcontainer ?? true,
    }),
  );

  const license = unwrap(
    await clack.select<'MIT' | 'Apache-2.0' | 'BSD-3-Clause' | 'ISC' | 'GPL-3.0' | 'UNLICENSED'>({
      message: 'License?',
      initialValue: d.license ?? 'MIT',
      options: [
        { value: 'MIT', label: 'MIT' },
        { value: 'Apache-2.0', label: 'Apache-2.0' },
        { value: 'BSD-3-Clause', label: 'BSD-3-Clause' },
        { value: 'ISC', label: 'ISC' },
        { value: 'GPL-3.0', label: 'GPL-3.0' },
        { value: 'UNLICENSED', label: 'Unlicensed' },
      ],
    }),
  );

  const config: ProjectConfig = projectConfigSchema.parse({
    projectName: name,
    projectSlug: deriveSlug(name),
    description,
    author,
    email,
    githubHandle,
    nodeVersion,
    packageManager,
    projectType,
    includeGithubActions,
    publishToNpm,
    includeDocs: includeDocumentation,
    includeCodecov,
    includeDockerfile,
    includeDevcontainer,
    license,
  });

  clack.note(
    [
      `Project: ${config.projectName}`,
      `Type: ${config.projectType}  ·  Node: ${config.nodeVersion}  ·  PM: ${config.packageManager}`,
      `Features: ${summarizeFeatures(config)}`,
    ].join('\n'),
    'Summary',
  );

  const proceed = unwrap(
    await clack.confirm({
      message: 'Create project with these settings?',
      initialValue: true,
    }),
  );

  if (!proceed) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }

  return config;
}
