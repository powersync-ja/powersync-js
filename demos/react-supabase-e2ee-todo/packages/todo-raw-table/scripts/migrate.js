#!/usr/bin/env node
// Create a timestamped migration from infra/schema.sql and push via Supabase CLI

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function timestamp() {
  const d = new Date();
  const pad = (n, l=2) => String(n).padStart(l, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset') || args.includes('--clean');
  const root = path.resolve(__dirname, '..');
  const infraDir = path.resolve(root, 'infra');
  const cliDir = path.join(infraDir, 'supabase');
  const migrationsDir = path.join(cliDir, 'migrations');
  const sqlSource = path.resolve(infraDir, 'schema.sql');

  if (!fs.existsSync(sqlSource)) {
    console.error('Missing SQL file:', path.relative(process.cwd(), sqlSource));
    process.exit(1);
  }

  fs.mkdirSync(migrationsDir, { recursive: true });

  if (shouldReset) {
    // Danger: remove old local migration files to avoid broken history
    // Only affects local files; does not touch remote DB state.
    for (const entry of fs.readdirSync(migrationsDir)) {
      const p = path.join(migrationsDir, entry);
      if (fs.statSync(p).isFile()) {
        fs.rmSync(p);
      }
    }
    console.log('Cleared local migrations at', path.relative(process.cwd(), migrationsDir));
  }
  const ts = timestamp();
  const target = path.join(migrationsDir, `${ts}_init.sql`);
  fs.copyFileSync(sqlSource, target);
  console.log('Wrote migration:', path.relative(process.cwd(), target));


  const child2 = spawn('supabase', ['db', 'push'], { cwd: infraDir, stdio: 'inherit' });
  child2.on('exit', (code) => process.exit(code ?? 0));
}

main();
