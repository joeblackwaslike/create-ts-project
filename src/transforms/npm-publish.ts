import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

interface PackageJson {
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

export async function transformNpmPublish(destDir: string, config: ProjectConfig): Promise<void> {
  if (config.publishToNpm) return;

  const packagePath = path.join(destDir, 'package.json');
  if (!(await fse.pathExists(packagePath))) return;

  const packageJson = (await fse.readJson(packagePath)) as PackageJson;

  if (packageJson.scripts) {
    Reflect.deleteProperty(packageJson.scripts, 'prepublishOnly');
  }

  await fse.writeJson(packagePath, packageJson, { spaces: 2 });
}
