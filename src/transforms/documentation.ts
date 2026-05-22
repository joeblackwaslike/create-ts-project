import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const DOCS_SCRIPTS = ['docs:dev', 'docs:build', 'docs:preview'] as const;

export async function transformDocumentation(
  destDir: string,
  config: ProjectConfig,
): Promise<void> {
  if (config.includeDocs) return;

  await fse.remove(path.join(destDir, 'docs'));

  const packagePath = path.join(destDir, 'package.json');
  if (!(await fse.pathExists(packagePath))) return;

  const packageJson = (await fse.readJson(packagePath)) as PackageJson;

  if (packageJson.scripts) {
    for (const scriptName of DOCS_SCRIPTS) {
      Reflect.deleteProperty(packageJson.scripts, scriptName);
    }
  }

  if (packageJson.devDependencies) {
    Reflect.deleteProperty(packageJson.devDependencies, 'vitepress');
  }

  await fse.writeJson(packagePath, packageJson, { spaces: 2 });
}
