# Guia passo a passo: da pasta do projeto à Google Play (Windows)

Escrito para quem está a aprender. Faz os passos por ordem. Onde aparece `{{...}}` substitui pelos teus dados.

---

## 1. Instalar as ferramentas (só uma vez)

Instala **sempre dos sites oficiais** (secção 11.1):

| Ferramenta | Onde | Notas |
|---|---|---|
| Node.js **22 LTS** | https://nodejs.org | Escolhe "LTS". Durante a instalação aceita "Add to PATH". |
| Git | https://git-scm.com/download/win | Opções por defeito. |
| Android Studio (versão estável mais recente) | https://developer.android.com/studio | Já traz o JDK 21 e o Android SDK. No primeiro arranque escolhe "Standard". |
| gitleaks (verificação de segredos) | Abre o PowerShell e escreve `winget install gitleaks` | Opcional mas recomendado. Sem ele, o projeto usa uma verificação embutida. |

Confirma no PowerShell:
```powershell
node -v    # deve mostrar v22.x
git --version
```

## 2. Obter o projeto e testá-lo no browser

```powershell
cd $HOME\Documents
git clone https://github.com/darkside12345456/Colmeia-game-.git
cd Colmeia-game-
git checkout ccr-74e7b9f8-j8jsjg      # ramo onde está o trabalho (até fazeres merge para main)
npm ci                                 # instala as dependências com as versões fixas
copy .env.example .env                 # cria o teu ficheiro de configuração local
npm run dev
```
Abre o endereço que aparecer (ex.: `http://localhost:5173`). No Chrome, carrega F12 → ícone do telemóvel →
escolhe um telemóvel (ou 390×844) para veres como no Android.

Verificações (correm também antes de cada commit):
```powershell
npm run check        # segredos + lint + tipos + testes (inclui os 300 níveis)
npm run build        # build de lançamento (minificado, sem source maps, sem console.log)
npx playwright install chromium   # só na primeira vez
npm run test:e2e     # abre o jogo, joga o nível 1 e confirma que não há erros na consola
```

## 3. Abrir a app Android no Android Studio

```powershell
npm run cap:sync     # faz o build e copia o jogo para a pasta android/
npm run cap:open     # abre o Android Studio
```
- Espera que o Android Studio termine o "Gradle Sync" (barra em baixo). Na primeira vez demora.
- Se pedir para instalar SDK Platform 36 ou "build tools", aceita.

### Testar num telemóvel real
1. No telemóvel: Definições → Acerca do telefone → toca 7 vezes em "Número de compilação" (ativa as Opções de programador).
2. Opções de programador → ativa **Depuração USB**.
3. Liga o cabo USB, aceita a autorização no telemóvel.
4. No Android Studio escolhe o telemóvel na lista e carrega ▶ (Run).

Nesta fase os anúncios e as compras estão em **modo de testes** (janelas simuladas). Está tudo certo.

## 4. Gerar a chave de assinatura (chave de UPLOAD)

A Google Play usa a **Play App Signing**: a Google guarda a chave final da app e tu só tens uma
**chave de upload**. Se perderes a chave de upload, a Google consegue substituí-la (ver ponto 10).

No PowerShell, **fora da pasta do projeto**:
```powershell
mkdir $HOME\chaves
cd $HOME\chaves
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore colmeia-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
- Escolhe uma password forte e **guarda-a num gestor de passwords** (ex.: Bitwarden, 1Password).
- Faz **cópia de segurança** do ficheiro `colmeia-upload.jks` em **dois sítios** (ex.: pen USB guardada em casa + cloud encriptada).
- **Nunca** coloques o `.jks` dentro do projeto nem no Git (o `.gitignore` já o bloqueia).

Depois, na pasta `android\` do projeto, copia `keystore.properties.example` para `keystore.properties` e preenche:
```
storeFile=C:/Users/{{TEU_UTILIZADOR}}/chaves/colmeia-upload.jks
storePassword={{password}}
keyAlias=upload
keyPassword={{password}}
```
(este ficheiro também está no `.gitignore`).

## 5. Gerar o AAB assinado

Antes de cada versão nova, sobe o número em `android/app/build.gradle`:
`versionCode 2` (sempre +1) e `versionName "0.2.0"`.

```powershell
npm run cap:sync
cd android
.\gradlew.bat bundleRelease
```
O ficheiro fica em `android\app\build\outputs\bundle\release\app-release.aab`.
(Alternativa no Android Studio: Build → Generate Signed App Bundle / APK → Android App Bundle.)

O build de lançamento já tem: R8 (minificação/ofuscação), remoção de recursos não usados,
`debuggable false`, só HTTPS, sem source maps nem `console.log`.

## 6. Configurar a AdMob (anúncios)

1. Cria conta em https://admob.google.com com a tua conta Google.
2. **Apps → Adicionar app → Android** → "Ainda não está publicada" → nome "Colmeia Doce".
3. Copia o **ID da app** (`ca-app-pub-XXXX~YYYY`). Só o vais pôr no build FINAL, em
   `android/app/src/main/res/values/strings.xml` (`admob_app_id`). Até lá fica o ID de teste da Google.
4. Cria 4 **blocos de anúncios**:
   | Bloco | Tipo AdMob | Usado para |
   |---|---|---|
   | Vídeo longo | Recompensado (Rewarded) | x2 moedas, +1 ranhura, vida, reforços, tesouro, prémio diário x2, Acelerar 2x (1 longo) |
   | Vídeo curto | Intersticial recompensado (Rewarded interstitial) | Acelerar 2x (2 curtos) |
   | Intersticial | Intersticial | entre níveis (regras da secção 4.2) |
   | Banner | Banner (adaptável) | por baixo do jogo |
   Copia os IDs para o teu `.env` (`VITE_ADMOB_*_ID`).
5. **Privacidade e mensagens → RGPD**: cria a mensagem de consentimento (é o formulário UMP que o jogo
   mostra no primeiro arranque). Publica-a para a app.
6. **Definições da app → Controlos de bloqueio**: classificação máxima de conteúdo **G** (ou PG) e bloqueia
   categorias sensíveis (jogos de azar, encontros, álcool, etc.).
7. **Dispositivos de teste**: em Definições → Dispositivos de teste, adiciona o teu telemóvel.
   **Nunca toques nos teus próprios anúncios reais** (dá bloqueio da conta).

> Nota sobre "anúncios curtos" e "longos": a AdMob não deixa escolher a duração exata de um anúncio.
> O jogo usa o formato **intersticial recompensado** como "curto" (normalmente mais curto e pode ser
> saltado ao fim de alguns segundos) e o **vídeo recompensado** como "longo". O prémio só é dado quando
> a AdMob envia o evento "recompensa ganha".

## 7. Configurar as compras (Google Play + RevenueCat)

1. Na **Play Console** (passo 8), dentro da app: **Monetizar → Produtos → Produtos na app**. Cria estes
   produtos (ids exatamente iguais):
   | ID | Tipo | Preço sugerido |
   |---|---|---|
   | `no_ads` | Produto único (não consumível) | 3,99 € |
   | `starter_pack` | Consumível | 1,99 € |
   | `coins_s` / `coins_m` / `coins_l` / `coins_xl` | Consumível | 0,99 / 4,99 / 9,99 / 19,99 € |
   | `pass_season` | Consumível (1 por temporada de 28 dias) | 4,99 € |
   | `treasure_1` / `treasure_2` / `treasure_3` | Consumível | 1,99 / 2,99 / 4,99 € |
   (É preciso ter carregado pelo menos um AAB com a permissão de faturação; a RevenueCat já a acrescenta.)
2. Cria conta em https://www.revenuecat.com → novo projeto → **app Android** com o pacote `pt.colmeiadoce.app`.
3. Liga a RevenueCat à Google Play com uma **conta de serviço** (a RevenueCat tem um guia passo a passo).
   O ficheiro JSON da conta de serviço é **SECRETO**: carrega-o só no site da RevenueCat, **nunca** no projeto.
4. Na RevenueCat: cria os produtos com os mesmos ids e um **entitlement** chamado `no_ads` ligado ao produto `no_ads`.
5. Copia a **chave pública do SDK** para Android (começa por `goog_`) para o `.env` em `VITE_REVENUECAT_PUBLIC_KEY`.
   Nunca uses a chave secreta (`sk_...`) na app — o verificador de segredos bloqueia-a.
6. Para testar compras sem pagar: Play Console → Definições → **Teste de licenças** → adiciona o teu email.

## 8. Ligar o modo real e preparar o build de testes

No `.env`:
```
VITE_ADS_MODE=real
VITE_IAP_MODE=real
VITE_ADMOB_TESTING=true        # continua com anúncios de TESTE
VITE_REVENUECAT_PUBLIC_KEY=goog_...
VITE_SUPPORT_EMAIL={{teu email de suporte}}
VITE_PRIVACY_URL={{URL público da política de privacidade}}
```
`npm run cap:sync` e volta a gerar o AAB. Só no **último** build antes da produção:
`VITE_ADMOB_TESTING=false`, IDs reais no `.env` e o ID real da app no `strings.xml`.

## 9. Play Console e teste fechado (12 testadores, 14 dias)

1. Cria a conta de programador em https://play.google.com/console (taxa única de 25 USD) e faz a
   **verificação de identidade** (documento + morada). Conta **pessoal**.
2. **Criar app**: nome "Colmeia Doce", idioma português (Portugal), Jogo, Gratuito.
3. Preenche **Conteúdo da app** (menu à esquerda):
   - Política de privacidade: o URL público (ver `docs/privacidade.html`).
   - Anúncios: **Sim, contém anúncios**.
   - Acesso à app: tudo acessível sem login.
   - Classificação de conteúdo: questionário **IARC** (deve dar PEGI 3).
   - Público-alvo: **13 anos ou mais** (13-15, 16-17, 18+). Não escolhas idades abaixo de 13.
     Se a Google disser que a app "pode atrair crianças", responde com honestidade e segue as regras
     da política Famílias (ver `docs/SEGURANCA-CHECKLIST.md`).
   - Segurança dos dados: copia a tabela de `docs/SEGURANCA-DADOS.md`.
   - ID de publicidade: **Sim** (a AdMob usa-o).
4. **Ficha da loja**: textos de `docs/FICHA-LOJA.md`, ícone `store/icon-512.png`,
   imagem de destaque `store/feature-1024x500.png`, capturas `store/screenshots/`.
5. **Testes → Teste fechado → Criar faixa**: carrega o `app-release.aab`, cria uma lista de emails com
   **pelo menos 12 testadores** e envia-lhes o link de adesão. Eles têm de **ficar inscritos 14 dias
   seguidos** (pede-lhes para abrirem o jogo de vez em quando e deixarem comentários).
6. Ao fim dos 14 dias aparece o botão para pedir **acesso à produção**; responde ao questionário e espera a aprovação.
7. Antes de publicar: confirma que o nome "Colmeia Doce" não está registado como marca
   (EUIPO: https://euipo.europa.eu/eSearch , INPI: https://servicosonline.inpi.pt) nem usado por outro jogo na Play Store.

## 10. Se perderes a chave de upload

Com a Play App Signing **não perdes a app**:
1. Gera uma chave nova (passo 4) e exporta o certificado:
   `keytool -export -rfc -keystore colmeia-upload-nova.jks -alias upload -file upload_certificate.pem`
2. Play Console → a tua app → **Teste e lançamento → Integridade da app → Assinatura de apps** →
   **Pedir reposição da chave de upload**, e envia o `.pem`.
3. A Google responde normalmente em poucos dias; depois disso assinas com a chave nova.

## 11. Problemas comuns

| Problema | Solução |
|---|---|
| `npm ci` falha | Confirma `node -v` = 22. Apaga `node_modules` e repete. |
| Gradle Sync falha | Android Studio → File → Settings → Build Tools → Gradle → Gradle JDK = **jbr-21**. |
| Ecrã branco no telemóvel | Fizeste `npm run cap:sync` depois de mudar o código? |
| Anúncios não aparecem | Normal nas primeiras horas de uma conta AdMob nova; confirma o formulário UMP e os IDs de teste. |
| Compras "indisponível" | A app tem de ter sido carregada na Play Console e o teu email estar no Teste de licenças. |
