import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(mobileDir, '..');
const out = path.join(mobileDir, 'www');

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.toLowerCase().startsWith(root.toLowerCase() + path.sep)) {
    throw new Error(`Refusing to write outside project: ${resolved}`);
  }
  return resolved;
}

function copyFileIfExists(relativeFromRoot, destinationName = relativeFromRoot) {
  const src = path.join(root, relativeFromRoot);
  if (!fs.existsSync(src)) return;
  const dest = path.join(out, destinationName);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(relativeFromRoot) {
  const src = path.join(root, relativeFromRoot);
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, path.join(out, relativeFromRoot), { recursive: true });
}

function buildMobileIndex() {
  const src = path.join(root, 'index.html');
  let html = fs.readFileSync(src, 'utf8');

  html = html.replace(
    '<html lang="ar" dir="rtl">',
    '<html lang="ar" dir="rtl" class="mobile-app">'
  );

  html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n<meta name="theme-color" content="#0F766E">'
  );

  html = html.replace(
    '<link rel="stylesheet" href="css/style.css">',
    '<link rel="stylesheet" href="css/style.css">\n<link rel="stylesheet" href="mobile.css">'
  );

  html = html.replace(
    '<script src="js/barcode.js"></script>',
    '<script src="js/barcode.js"></script>\n<script src="mobile-bridge.js"></script>'
  );

  fs.writeFileSync(path.join(out, 'index.html'), html);
}

assertInsideRoot(out);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

buildMobileIndex();

copyFileIfExists('logo.png');
copyFileIfExists('icon.ico');
fs.copyFileSync(path.join(mobileDir, 'mobile.css'), path.join(out, 'mobile.css'));
fs.copyFileSync(path.join(mobileDir, 'mobile-bridge.js'), path.join(out, 'mobile-bridge.js'));

for (const dir of ['assets', 'config', 'css', 'fonts', 'js', 'libs']) {
  copyDir(dir);
}

console.log(`Prepared Android web assets in ${out}`);
