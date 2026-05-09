import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, '..');
const out = path.join(root, 'tauri-dist');

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.toLowerCase().startsWith(root.toLowerCase() + path.sep)) {
    throw new Error(`Refusing to write outside project: ${resolved}`);
  }
  return resolved;
}

function copyFileIfExists(relativeFromRoot) {
  const src = path.join(root, relativeFromRoot);
  if (!fs.existsSync(src)) return;
  const dest = path.join(out, relativeFromRoot);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirIfExists(relativeFromRoot) {
  const src = path.join(root, relativeFromRoot);
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, path.join(out, relativeFromRoot), { recursive: true });
}

assertInsideRoot(out);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of ['index.html', 'logo.png', 'icon.ico']) {
  copyFileIfExists(file);
}

for (const dir of ['assets', 'config', 'css', 'fonts', 'js', 'libs']) {
  copyDirIfExists(dir);
}

console.log(`Prepared Tauri web assets in ${out}`);
