import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, '.env.example');
const targets = [
  path.join(root, '.env'),
  path.join(root, 'apps/passenger/.env'),
  path.join(root, 'apps/rider/.env'),
  path.join(root, 'apps/admin/.env.local'),
];

for (const target of targets) {
  const label = path.relative(root, target);
  if (existsSync(target)) {
    console.log(`Keeping existing ${label}`);
    continue;
  }
  copyFileSync(source, target);
  console.log(`Created ${label}`);
}
