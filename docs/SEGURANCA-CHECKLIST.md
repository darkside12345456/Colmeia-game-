# Revisão da secção 11 (segurança, privacidade e regras legais)

Legenda: **FEITO** = implementado e verificado neste repositório · **N/A** = não se aplica à versão 1 (offline, sem contas) ·
**PENDENTE (Jp)** = só tu podes fazer (contas, sites, decisões, testes no telemóvel).

## 11.1 Chaves, segredos e código

| Ponto | Estado | Onde / como |
|---|---|---|
| Nenhuma chave secreta na app; só IDs públicos (AdMob, chave pública RevenueCat) | FEITO | `src/services/platform.ts` lê só `VITE_*` públicos; a chave `sk_` é bloqueada pelo verificador |
| `.env` local + `.env.example` sem valores | FEITO | `.env.example` |
| `.gitignore` com `.env*`, `*.keystore`, `*.jks`, `key.properties`, `google-services.json`, builds | FEITO | `.gitignore`, `android/.gitignore` (+ `keystore.properties`) |
| Verificação de segredos antes de cada commit | FEITO | `.githooks/pre-commit` → `tools/check-secrets.mjs` (usa gitleaks se instalado + verificação embutida) e `npm audit` |
| gitleaks e `npm audit` no CI | FEITO | `.github/workflows/ci.yml` |
| Dependabot | FEITO | `.github/dependabot.yml` |
| **Repositório privado** | **PENDENTE (Jp) - URGENTE** | O repositório está **público** neste momento. GitHub → Settings → General → Danger Zone → Change visibility → Private. |
| Dependências oficiais com versões fixas (`package-lock.json`) | FEITO | `package.json` usa versões exatas |
| Ferramentas dos sites oficiais | PENDENTE (Jp) | Ver `docs/GUIA-ANDROID-WINDOWS.md` |
| Minificação/ofuscação (R8 + Vite), sem `console.log`, sem source maps, sem menus de teste | FEITO | `vite.config.ts` (dropConsole, sem sourcemap), `android/app/build.gradle` (minifyEnabled, shrinkResources); ganchos de teste (`window.__game`) só existem em modo DEV |
| Play App Signing + chave de upload fora do projeto, 2 cópias, password em gestor | PENDENTE (Jp) | Guia, passos 4 e 10 |

`npm audit` (dependências da app): 0 vulnerabilidades. Há 3 avisos "moderate" só na ferramenta de
desenvolvimento `@capacitor/cli` (biblioteca `uuid` usada para projetos iOS); não entra na app.

## 11.2 Compras, moedas e batota

| Ponto | Estado | Onde / como |
|---|---|---|
| Prémio só depois de a compra ser validada pelo serviço | FEITO | `app.buy()` só entrega após `purchaseStoreProduct` resolver (RevenueCat valida o recibo) |
| "Sem anúncios" vem dos entitlements do serviço | FEITO | `app.noAds()` usa `iap.hasEntitlement('no_ads')`; o valor guardado só serve offline |
| Restaurar compras | FEITO | Loja e Definições; testado no smoke test (save apagado → restaurar devolve o Sem anúncios) |
| Acknowledge das compras no prazo | FEITO (pela RevenueCat) | A RevenueCat confirma/consome automaticamente |
| Vídeos: prémio só no evento "recompensa ganha" | FEITO | `AdMobAdService.showRewarded` escuta `Rewarded`; testado (fechar antes do fim = sem prémio) |
| SSV da AdMob para valores importantes | N/A na v1 | Os prémios por vídeo são pequenos e locais; precisa de servidor. Ver nota abaixo. |
| Save com versão + checksum | FEITO | `src/services/save.ts` + testes em `tests/save.test.ts` |
| A mesma transação não é entregue duas vezes | FEITO | `processedTx` em `deliverPurchase` (testado) |
| Proteção do relógio | FEITO | `TimeService` nunca anda para trás; vidas não regeneram com relógio atrasado (testado); hora da rede quando há `VITE_REMOTE_CONFIG_URL` |
| Play Integrity | N/A | Só com funções online (11.3) |

## 11.3 Funções online

**N/A na versão 1**: não há servidor, contas, chat, rankings nem nuvem. Rankings e Equipa mostram "Em breve".
Mesmo assim: só HTTPS (`cleartextTrafficPermitted=false`, `usesCleartextTraffic=false`, CSP no `index.html`).
Antes de lançar qualquer função online, aplicar esta secção inteira.

## 11.4 Privacidade (RGPD)

| Ponto | Estado | Onde |
|---|---|---|
| Recolher o mínimo; sem nome/email/localização; sem dados pessoais em logs | FEITO | O jogo não pede nada; logs removidos no build |
| Consentimento UMP antes de anúncios + opção nas Definições | FEITO | `AdMobAdService.init` (requestConsentInfo/showConsentForm) e Definições → Privacidade e anúncios |
| Recusa → só anúncios não personalizados | FEITO (pelo UMP/AdMob) | O SDK aplica a escolha automaticamente |
| Política de privacidade PT/EN | FEITO (texto) / PENDENTE (Jp) publicar | `docs/privacidade.html`, `docs/privacy.html` - preencher `{{NOME}}`, `{{EMAIL}}`, data, e alojar num URL público |
| Segurança dos dados | FEITO (tabela) / PENDENTE (Jp) preencher na consola | `docs/SEGURANCA-DADOS.md` |
| Só permissões necessárias | FEITO | `INTERNET` (+ `AD_ID`/`ACCESS_NETWORK_STATE` da AdMob e `BILLING` da RevenueCat). Nada de câmara, contactos, localização, ficheiros |
| Analytics/erros declarados | N/A na v1 | `src/services/analytics.ts` não envia nada |

Nota sobre o alojamento da política: o GitHub Pages num repositório **privado** só funciona com plano pago.
Alternativas grátis: um segundo repositório público só com os 2 ficheiros HTML, ou Google Sites.

## 11.5 Público, menores e práticas justas

| Ponto | Estado | Onde |
|---|---|---|
| Público 13+ | PENDENTE (Jp) na Play Console | Guia passo 9 |
| AdMob: classificação máxima G e `tagForUnderAgeOfConsent` | FEITO no código (`maxAdContentRating: General`) / PENDENTE (Jp) bloquear categorias na AdMob | `src/services/ads.ts` |
| Preço em euros sempre visível; custo real claro | FEITO | Botões mostram o preço da loja; nota "Preços com IVA incluído" |
| Sem contagens falsas, botão de fechar sempre visível | FEITO | Temporizadores são reais (ciclos fixos); todas as janelas de oferta têm X |
| Sem caixas aleatórias pagas | FEITO | Todos os prémios são fixos e mostrados antes |
| Rivais controlados pelo jogo e dito nas regras | FEITO | Regras da Corrida (botão "i") |
| Regras claras dos eventos (botão "i") | FEITO | Todas as janelas de eventos |
| Email de suporte nas Definições e na loja | FEITO (Definições) / PENDENTE (Jp) definir `VITE_SUPPORT_EMAIL` e pôr na ficha | |
| IARC (PEGI 3) | PENDENTE (Jp) | |

## 11.6 Propriedade intelectual

| Ponto | Estado |
|---|---|
| Tudo original ou com licença comercial | FEITO - arte, sons e níveis gerados por código (`assets/CREDITS.md`) |
| Licenças das fontes (OFL) e bibliotecas guardadas + ecrã "Créditos e licenças" | FEITO - `licenses/`, Definições → Créditos e licenças |
| Nenhum nome/personagem/texto de outros jogos | FEITO - nomes, personagens e textos originais |
| Confirmar marca "Colmeia Doce" (EUIPO/INPI/Play Store) | PENDENTE (Jp) |

## 11.7 Google Play

| Ponto | Estado |
|---|---|
| Target API exigido | FEITO - `targetSdkVersion 36` (`android/variables.gradle`) |
| Formato AAB | FEITO - `gradlew bundleRelease` |
| Ícone 512, destaque 1024×500, capturas | FEITO - `store/` |
| Descrição sem palavras enganadoras | FEITO - `docs/FICHA-LOJA.md` |
| Sem anúncios inesperados (não ao abrir, não a meio do nível) | FEITO - intersticial só ao sair do ecrã de vitória, nível ≥ 15, 1 em cada 3, 90 s (testado) |
| IDs de teste da AdMob | FEITO - por defeito em `strings.xml` e `VITE_ADMOB_TESTING=true` |
| Conta pessoal: verificação + teste fechado 12 testadores/14 dias | PENDENTE (Jp) |

## 11.8 Testes de segurança (para a Jp fazer)

### OWASP MASVS (nível L1) aplicado a este jogo

| Área | O que verificar | Estado |
|---|---|---|
| STORAGE | Sem dados sensíveis no armazenamento local; nada sensível em logs | OK - só progresso do jogo; logs removidos |
| CRYPTO | Não há criptografia própria para segredos | OK - o checksum é só dissuasor |
| AUTH | Sem contas | N/A |
| NETWORK | Só TLS; sem tráfego em claro | OK - network security config + CSP |
| PLATFORM | Permissões mínimas; componentes exportados só os necessários (MainActivity); WebView sem debug | OK - `webContentsDebuggingEnabled: false` |
| CODE | Dependências atualizadas; build release sem debug | OK - Dependabot, `npm audit`, `debuggable false` |
| RESILIENCE | (L2, não obrigatório) | N/A |
| PRIVACY | Consentimento, minimização, transparência | OK - UMP, política, Data safety |

### Analisar o APK final com MobSF (no Windows)
1. Instala o **Docker Desktop** (https://www.docker.com/products/docker-desktop).
2. PowerShell: `docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest`
3. Abre http://localhost:8000 (login por defeito indicado no ecrã).
4. O AAB não se instala diretamente: gera um APK universal com o **bundletool**
   (https://github.com/google/bundletool/releases):
   `java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks --mode=universal --ks=C:\Users\...\colmeia-upload.jks --ks-key-alias=upload`
   Muda `app.apks` para `app.zip`, extrai e usa `universal.apk`.
5. Carrega o `universal.apk` no MobSF e confirma:
   - **Permissões**: só INTERNET, ACCESS_NETWORK_STATE, AD_ID, BILLING (e WAKE_LOCK/RECEIVE_BOOT de SDKs Google, se aparecerem).
   - **Segredos/hardcoded**: não pode aparecer nenhuma chave `sk_`, password ou conta de serviço.
   - `android:debuggable=false`, `usesCleartextTraffic=false`, `networkSecurityConfig` presente.
   - Componentes exportados: só a MainActivity (e os dos SDKs Google).
6. Extra: `apktool d universal.apk` e abrir no **jadx-gui** (https://github.com/skylot/jadx). Procura por
   `http://`, `sk_`, `test`, `localhost`, `console.log` dentro de `assets/public/`.

### Testes manuais no telemóvel
| Teste | Resultado esperado |
|---|---|
| Modo de avião e jogar vários níveis | Tudo funciona; vídeos dizem "não há vídeos disponíveis"; loja diz "indisponível" |
| Atrasar a hora do telemóvel 5 h | Vidas e eventos não dão nada extra |
| Adiantar a hora 1 dia e voltar atrás | Ao voltar atrás o jogo não recua (fica parado até a hora real alcançar) |
| Apagar os dados da app (Definições Android → Apps → Colmeia Doce → Armazenamento) | Recomeça no nível 1; "Restaurar compras" devolve o Sem anúncios |
| Comprar com conta de teste e reinstalar | Restaurar compras funciona |
| Fechar um vídeo antes do fim | Não dá prémio |
| Ecrã pequeno (ex.: 5") e grande | Nada cortado (testado no browser em 360×640 e 390×844) |

Save corrompido e editado à mão: testado automaticamente (`tests/save.test.ts`) — o jogo usa a cópia
de segurança ou recomeça, sem bloquear.

### Nota sobre SSV (verificação do lado do servidor da AdMob)
Exige um servidor que receba o callback da Google. Na v1 os prémios por vídeo são pequenos e locais
(o pior caso de batota é alguém ganhar moedas no próprio telemóvel, sem acesso a nada pago).
Recomenda-se quando houver funções online.
