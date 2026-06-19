import {
  copyLanguageServerAssets,
  copyPendingJobAssets,
  watchDesktop,
  watchWebviews,
} from './utils/desktop_jobs.mjs';
import { commonJobs, generateAssets, writePackageJson } from './utils/common_jobs.mjs';
import { createDesktopPackageJson } from './utils/packages.mjs';
import { ENVIRONMENTS } from './constants.mjs';

async function main() {
  const packageJson = createDesktopPackageJson();
  await commonJobs(ENVIRONMENTS.DESKTOP);

  await Promise.all([
    writePackageJson(packageJson, ENVIRONMENTS.DESKTOP),
    generateAssets(packageJson, ENVIRONMENTS.DESKTOP),
    copyPendingJobAssets(),
    copyLanguageServerAssets(),
  ]);

  const abortController = new AbortController();
  process.on('exit', () => abortController.abort());
  ['SIGINT', 'SIGQUIT', 'SIGHUP'].forEach(signal => {
    process.on(signal, () => abortController.abort());
  });

  watchDesktop(abortController.signal);
  watchWebviews(abortController.signal);
}

main();
