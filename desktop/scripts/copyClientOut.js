const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = path.resolve(__dirname, '..');
const from = path.join(projectRoot, '..', 'client', 'out');
const to = path.join(projectRoot, 'client', 'out');

try {
  // remove existing target if present
  if (fs.existsSync(to)) {
    fs.rmSync(to, { recursive: true, force: true });
  }
  copyRecursive(from, to);
  console.log(`Copied ${from} -> ${to}`);
} catch (err) {
  console.error('Error copying client/out:', err);
  process.exit(1);
}
