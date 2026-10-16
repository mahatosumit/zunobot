/**
 * Guards the copy against claims the project must not make without evidence, and the repo against unsafe logging.
 * Run with `npm run lint`. Exit code 1 on any finding.
 *
 * Rules:
 *  1. Banned marketing/safety claims in site copy (src/site) unless the sentence is clearly a negation or a definition of what we do NOT claim.
 *  2. No placeholder text (lorem ipsum, TODO, TBD, example.com contact details) in copy.
 *  3. No logging of request bodies, e-mail addresses, names or IPs in server code.
 *  4. No secrets committed (.env files, or long literal values assigned to names containing SECRET or KEY).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const findings: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === 'dist-server' || e === 'data' || e === 'screenshots') continue;
    const p = path.join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const rel = (p: string): string => path.relative(root, p);

/** Phrases that need evidence. Allowed only when the same sentence contains a negation cue. */
const BANNED: Array<[RegExp, string]> = [
  [/\bcertified\b/i, 'certified'],
  [/\bfail[- ]?proof\b/i, 'fail-proof'],
  [/\bfully[- ]autonomous\b/i, 'fully autonomous'],
  [/\b100% (safe|secure|reliable)\b/i, '100% safe/secure/reliable'],
  [/\bguarantee[sd]? (safety|privacy|security)\b/i, 'guaranteed safety/privacy/security'],
  [/\b(revolutionary|world[- ]first|industry[- ]leading|best[- ]in[- ]class|breakthrough)\b/i, 'unsupported superlative'],
  [/\bmilitary[- ]grade\b/i, 'military-grade'],
  [/\b(clinically|medically) (proven|tested)\b/i, 'clinical claim'],
];
const NEGATION = /\b(no|not|never|nothing|neither|without|does not|do not|is not|are not|cannot|can't|isn't|aren't|don't|until|only once|require|requires|before|banned|must not|unless)\b/i;

for (const file of walk(path.join(root, 'src/site'))) {
  const text = readFileSync(file, 'utf8');
  const sentences = text.split(/(?<=[.!?])\s+|\n/);
  sentences.forEach((s) => {
    for (const [re, label] of BANNED) {
      if (re.test(s) && !NEGATION.test(s)) findings.push(`${rel(file)}: unqualified claim "${label}" in: ${s.trim().slice(0, 120)}`);
    }
    if (/lorem ipsum|\bTODO\b|\bTBD\b|\bFIXME\b|@example\.(com|org)|\b555-01\d\d\b/i.test(s)) findings.push(`${rel(file)}: placeholder text in: ${s.trim().slice(0, 120)}`);
  });
}

// Logging hygiene in server code
for (const file of walk(path.join(root, 'server'))) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/console\.(log|info|warn|error|debug)\(/.test(line) && /(body|email|name|ip\b|remoteAddress|x-forwarded|headers|req\.url|payload|entry)/i.test(line)) {
      findings.push(`${rel(file)}:${i + 1}: log statement may include request data: ${line.trim().slice(0, 120)}`);
    }
  });
}

// Secrets
if (existsSync(path.join(root, '.env'))) {
  const gi = existsSync(path.join(root, '.gitignore')) ? readFileSync(path.join(root, '.gitignore'), 'utf8') : '';
  if (!/^\.env$/m.test(gi)) findings.push('.env exists but is not listed in .gitignore');
}
for (const file of walk(root)) {
  if (/\.(png|jpe?g|webp|woff2?|ico|sqlite|db)$/i.test(file) || file.includes('.git/')) continue;
  if (file.endsWith('claims-lint.ts')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/(SECRET|PRIVATE_KEY|API_KEY|PASSWORD)\w*\s*[:=]\s*['"][A-Za-z0-9+/_-]{24,}['"]/.test(line)) findings.push(`${rel(file)}:${i + 1}: possible committed secret`);
  });
}

if (findings.length) {
  console.error(`claims-lint: ${findings.length} finding(s)\n` + findings.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('claims-lint: no banned claims, placeholders, unsafe logging or committed secrets found.');
