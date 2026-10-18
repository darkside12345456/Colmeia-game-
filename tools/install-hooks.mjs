// Ativa os hooks do git em .githooks (verificação de segredos antes de cada commit).
import { execSync } from 'node:child_process';
try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks');
  console.log('[hooks] git hooks ativos (.githooks)');
} catch {
  // Fora de um repositório git (ex.: CI a instalar dependências): nada a fazer.
}
