# Colmeia Doce — regras para o Claude Code

A especificação completa está em `docs/SPEC.md`. Este ficheiro resume as regras que se aplicam
a **todo** o trabalho neste repositório.

## O projeto
- Jogo de puzzle casual para **Android** (vertical), feito com **Phaser 3 + TypeScript + Vite**
  e empacotado com **Capacitor**. Corre também no browser (`npm run dev`) para testar.
- Idioma: **português de Portugal** (tom fofo, curto, caloroso). Todo o texto vem de
  `src/i18n/*.json` (nunca escrever texto da interface diretamente no código). Sem emojis.
- Tema original (abelhas). Nada de copiar nomes, personagens, textos, imagens ou sons de outros jogos.

## Estrutura
```
src/core/      lógica pura (motor, solver, gerador, quantizador) — SEM Phaser, com testes
src/scenes/    cenas Phaser (Boot, Home, Game) e janelas
src/ui/        componentes reutilizáveis (botões, janelas, contadores)
src/art/       desenho procedural (abelhas, blocos, ícones) — trocável via assets/manifest.json
src/services/  Save, Time, Ads, IAP, Audio, Haptics, Analytics, RemoteConfig
src/meta/      economia, vidas, reforços, eventos, passe, ofertas
src/i18n/      pt-PT.json, en.json
levels/        níveis gerados (JSON, com seed e solução validada)
tools/         gerador de arte/níveis, verificação de segredos, smoke test
tests/         vitest
```

## Regras de trabalho
- Explicar decisões em linguagem simples e curta (a Jp está a aprender).
- Commits pequenos com mensagens claras.
- A lógica do jogo fica separada dos gráficos e tem testes (`npm test`).
- Antes de dizer que algo está feito: `npm run check` (segredos + lint + tipos + testes),
  `npm run build` e `npm run test:e2e` (abre o jogo e confirma que não há erros na consola).
- Se algo estiver confuso ou impossível, perguntar antes de inventar.
- O motor (`src/core/engine.ts`) é usado pelo jogo E pelo solver. Se mudares tempos das abelhas
  ou regras, corre `npm run levels` para regenerar e revalidar os níveis.

## Segurança, privacidade e regras legais (secção 11 — obrigatório)
- **Nenhuma chave secreta na app** (tudo no APK pode ser extraído). Só identificadores públicos:
  ID da app AdMob, IDs de blocos de anúncios, chave **pública** RevenueCat. Segredos ficam num
  servidor/gestor de segredos, nunca no código nem no Git.
- `.env` local + `.env.example` sem valores. `.gitignore` cobre `.env*`, `*.keystore`, `*.jks`,
  `key.properties`, `google-services.json` e pastas de build.
- Antes de cada commit: `tools/check-secrets.mjs` (gitleaks se instalado) + `npm audit`
  (hook em `.githooks/pre-commit`). Dependabot ativo. Repositório **privado**.
- Dependências oficiais e com versões fixas (`package-lock.json`).
- Build de lançamento minificado, sem source maps, sem `console.*`, sem menus de teste.
- **Compras:** só dar prémios depois de validadas pelo serviço (RevenueCat); usar os
  *entitlements* devolvidos, não variáveis locais. "Restaurar compras" tem de funcionar.
- **Vídeos recompensados:** prémio só depois do evento "recompensa ganha" do SDK.
- Save local com versão + checksum (dissuasor). Proteção do relógio (hora a andar para trás
  não dá tempo extra).
- Consentimento **UMP** antes de anúncios; opção nas Definições para mudar.
- Recolher o mínimo de dados; nada de dados pessoais em logs.
- Público 13+; anúncios com classificação máxima G/PG; sem caixas aleatórias pagas; preços
  sempre claros em euros; botão de fechar sempre visível; sem contagens falsas.
- Rivais da Corrida das Flores são controlados pelo jogo e isso é dito nas regras.
- Tudo original ou com licença comercial; licenças em "Créditos e licenças" e `assets/CREDITS.md`.
- Testar sempre com **IDs de teste da AdMob**.
- Se uma tarefa entrar em conflito com estas regras: parar e avisar.
