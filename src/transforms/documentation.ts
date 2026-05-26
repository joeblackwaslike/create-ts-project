import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const DOCS_SCRIPTS = ['docs:start', 'docs:build', 'docs:serve', 'docs:clear'] as const;

const DOCS_DEV_DEPS = [
  '@docusaurus/core',
  '@docusaurus/preset-classic',
  '@docusaurus/types',
  'docusaurus-plugin-llms',
  'docusaurus-plugin-typedoc',
  'react',
  'react-dom',
  'typedoc',
] as const;

export async function transformDocumentation(
  destDir: string,
  config: ProjectConfig,
): Promise<void> {
  if (config.includeDocs) return;

  await fse.remove(path.join(destDir, 'docs'));
  await fse.remove(path.join(destDir, 'docusaurus.config.ts'));
  await fse.remove(path.join(destDir, 'sidebars.ts'));
  await fse.remove(path.join(destDir, 'static'));

  const packagePath = path.join(destDir, 'package.json');
  if (!(await fse.pathExists(packagePath))) return;

  const packageJson = (await fse.readJson(packagePath)) as PackageJson;

  if (packageJson.scripts) {
    for (const scriptName of DOCS_SCRIPTS) {
      Reflect.deleteProperty(packageJson.scripts, scriptName);
    }
  }

  if (packageJson.devDependencies) {
    for (const dep of DOCS_DEV_DEPS) {
      Reflect.deleteProperty(packageJson.devDependencies, dep);
    }
  }

  await fse.writeJson(packagePath, packageJson, { spaces: 2 });
}
