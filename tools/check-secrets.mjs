// Verificação de segredos (secção 11.1).
// 1) Se o gitleaks estiver instalado, usa-o (recomendado).
// 2) Corre sempre uma verificação simples embutida, para nunca ficar sem proteção
//    (ex.: num PC Windows sem gitleaks instalado).
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const PATTERNS = [
  { name: 'Chave secreta RevenueCat (sk_)', re: /\bsk_[A-Za-z0-9]{20,}\b/ },
  { name: 'Chave privada (PEM)', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Conta de serviço Google', re: /"type"\s*:\s*"service_account"/ },
  { name: 'Chave API Google (AIza)', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Token GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Chave AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  // valor real na mesma linha (ignora linhas vazias e marcadores {{...}} da documentação)
  { name: 'Password de keystore', re: /(storePassword|keyPassword)[ \t]*[=:][ \t]*['"]?(?!\{\{)[^\s'"$]{4,}/ },
];
const FORBIDDEN_FILES = [/\.jks$/, /\.keystore$/, /(^|\/)key\.properties$/, /(^|\/)\.env$/, /\.p12$/, /google-services\.json$/];
const SKIP = [/^package-lock\.json$/, /\.png$/, /\.woff2?$/, /\.ico$/, /^tools\/check-secrets\.mjs$/, /^\.gitleaks\.toml$/];

let failed = false;

const gl = spawnSync('gitleaks', ['version'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (gl.status === 0) {
  const r = spawnSync('gitleaks', ['detect', '--no-banner', '--redact', '-c', '.gitleaks.toml', '--source', '.'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) failed = true;
} else {
  console.warn('[segredos] gitleaks não encontrado - a usar só a verificação embutida. Instala com: winget install gitleaks');
}

let files = [];
try {
  files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  console.warn('[segredos] não é um repositório git - a ignorar verificação embutida');
}

for (const f of files) {
  if (FORBIDDEN_FILES.some((re) => re.test(f))) {
    console.error(`[segredos] ficheiro proibido no repositório: ${f}`);
    failed = true;
    continue;
  }
  if (SKIP.some((re) => re.test(f))) continue;
  let text;
  try {
    if (statSync(f).size > 2_000_000) continue;
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      console.error(`[segredos] possível segredo (${p.name}) em ${f}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('[segredos] FALHOU - remove o segredo antes de fazer commit.');
  process.exit(1);
}
console.log(`[segredos] OK (${files.length} ficheiros verificados)`);
