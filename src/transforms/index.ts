import type { ProjectConfig } from '../types.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformDevcontainer } from './devcontainer.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformDocker } from './docker.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformDocumentation } from './documentation.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformGithubActions } from './github-actions.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformLicense } from './license.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformNpmPublish } from './npm-publish.js';
// eslint-disable-next-line import-x/no-unresolved
import { transformPackageManager } from './package-manager.js';

export async function applyTransforms(destDir: string, config: ProjectConfig): Promise<void> {
  await transformLicense(destDir, config);
  await transformGithubActions(destDir, config);
  await transformDocker(destDir, config);
  await transformDevcontainer(destDir, config);
  await transformDocumentation(destDir, config);
  await transformNpmPublish(destDir, config);
  await transformPackageManager(destDir, config);
}
