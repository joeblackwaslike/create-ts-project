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
  const releasePath = path.join(githubDir, 'workflows', 'release.yml');

  if (!config.publishToNpm) {
    await fse.remove(releasePath);
  }

  if (!config.includeDocs) {
    await editYamlFile(ciPath, (yaml) => removeJobBlock(yaml, 'docs'));
    await editYamlFile(releasePath, (yaml) => removeJobBlock(yaml, 'deploy-docs'));
  }

  if (!config.includeCodecov) {
    await editYamlFile(ciPath, removeCodecovStep);
  }
}
