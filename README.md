# Colmeia Doce

Jogo de puzzle casual para Android: as abelhas desmontam quadros de pixel art bloco a bloco;
escolhes as peças de pólen, mas só tens 5 ranhuras.

Phaser 3 + TypeScript + Vite, empacotado com Capacitor. Corre no browser para testar.

## Comandos

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências (versões fixas) |
| `npm run dev` | Abre o jogo no browser (modo telemóvel no F12) |
| `npm run check` | Segredos + lint + tipos + testes (inclui os 300 níveis) |
| `npm run build` | Build de lançamento em `dist/` |
| `npm run test:e2e` | Abre o jogo num Chromium, joga o nível 1 e verifica que não há erros |
| `npm run art` | Gera os PNG de pixel art em `assets/levels/art/` |
| `npm run levels` | Gera e valida os 300 níveis em `levels/` |
| `npm run levels:report` | Relatório da curva de dificuldade (`docs/levels-report.md`) |
| `npm run cap:sync` / `cap:open` | Atualiza / abre o projeto Android |
| `node tools/make-icons.mjs` | Ícone, splash e imagens da loja |
| `node tools/store-screenshots.mjs` | Capturas para a Google Play |

## Documentos

- `docs/SPEC.md` - especificação original
- `CLAUDE.md` - regras do projeto (inclui a secção 11)
- `docs/GUIA-ANDROID-WINDOWS.md` - passo a passo até à Google Play
- `docs/SEGURANCA-CHECKLIST.md` - revisão da secção 11, MASVS e MobSF
- `docs/SEGURANCA-DADOS.md` - tabela para a Segurança dos dados
- `docs/privacidade.html` / `docs/privacy.html` - política de privacidade
- `docs/FICHA-LOJA.md` - textos da loja PT/EN
- `docs/levels-report.md` - curva de dificuldade
- `docs/DECISOES.md` - decisões tomadas e perguntas em aberto
