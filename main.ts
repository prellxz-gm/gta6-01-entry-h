// Ember Coast — build entrypoint (Node stdlib only + vendor buildDossier).
// Copies game/ + screenshots/ into the output dir, then writes dossier.json.
// buildDossier returns dossier bytes (Uint8Array) — this file writes them out.
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function pinMtimes(dir: string): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) pinMtimes(p);
    else utimesSync(p, new Date(0), new Date(0));
  }
  utimesSync(dir, new Date(0), new Date(0));
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const gameSrc = join(root, 'game');
const shotsSrc = join(root, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('game/ missing in ' + root);
cpSync(gameSrc, join(out, 'game'), { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });
else mkdirSync(join(out, 'screenshots'), { recursive: true });

pinMtimes(join(out, 'game'));
pinMtimes(join(out, 'screenshots'));

const bytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), bytes);

function summarize(dir: string): { files: number; bytes: number } {
  let files = 0, total = 0;
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { files++; total += statSync(p).size; }
    }
  };
  walk(dir);
  return { files, bytes: total };
}
const g = summarize(join(out, 'game'));
const s = summarize(join(out, 'screenshots'));
console.log('Ember Coast build OK -> ' + out + ' (dossier ' + bytes.length + ' bytes)');
console.log(`game: ${g.files} files, ${g.bytes} bytes | screenshots: ${s.files} files, ${s.bytes} bytes`);
