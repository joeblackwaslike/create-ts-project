import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

export async function transformDevcontainer(destDir: string, config: ProjectConfig): Promise<void> {
  if (config.includeDevcontainer) return;

  await fse.remove(path.join(destDir, '.devcontainer'));
}
