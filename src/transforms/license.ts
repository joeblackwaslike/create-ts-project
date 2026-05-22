import { readdir } from 'node:fs/promises';
import path from 'node:path';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

const LICENSE_PREFIX = 'LICENSE.';

async function listLicenseFiles(destDir: string): Promise<string[]> {
  const entries = await readdir(destDir);
  return entries.filter((entry) => entry.startsWith(LICENSE_PREFIX));
}

export async function transformLicense(destDir: string, config: ProjectConfig): Promise<void> {
  const licenseFiles = await listLicenseFiles(destDir);

  if (config.license !== 'UNLICENSED') {
    const source = path.join(destDir, `${LICENSE_PREFIX}${config.license}`);
    if (await fse.pathExists(source)) {
      await fse.copyFile(source, path.join(destDir, 'LICENSE'));
    }
  }

  await Promise.all(licenseFiles.map((file) => fse.remove(path.join(destDir, file))));
}
