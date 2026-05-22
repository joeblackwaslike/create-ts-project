import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

export async function transformDocker(destDir: string, config: ProjectConfig): Promise<void> {
  if (config.includeDockerfile) return;

  await Promise.all([
    fse.remove(path.join(destDir, 'Dockerfile')),
    fse.remove(path.join(destDir, 'docker-compose.yml')),
  ]);
}
