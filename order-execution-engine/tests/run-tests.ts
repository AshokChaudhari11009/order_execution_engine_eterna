// Lightweight test runner so we don't add more deps
// Discovers files ending with .test.ts in this folder and runs exported tests

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export type TestFn = () => void | Promise<void>;

let passed = 0;
let failed = 0;
const scheduled: Promise<void>[] = [];

function log(ok: boolean, name: string, err?: any) {
  if (ok) {
    console.log(`✔ ${name}`);
  } else {
    console.error(`✘ ${name}`);
    if (err) console.error(err);
  }
}

// Catch any async rejections that were not wired through the test() helper
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in tests:', reason);
  failed += 1;
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  process.exit(1);
});

export function test(name: string, fn: TestFn) {
  const p = Promise.resolve()
    .then(fn)
    .then(
      () => {
        passed += 1;
        log(true, name);
      },
      (err) => {
        failed += 1;
        log(false, name, err);
      }
    );
  scheduled.push(p);
}

async function finish() {
  await Promise.allSettled(scheduled);
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts'));
  for (const f of files) {
    const fileUrl = pathToFileURL(join(dir, f)).href;
    await import(fileUrl);
  }
  await finish();
}

main();
