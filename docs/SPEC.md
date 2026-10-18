# Colmeia Doce — pedido para o Claude Code

> Cola este ficheiro inteiro no Claude Code (ou guarda-o na pasta do projeto como `SPEC.md` e diz: "Lê o SPEC.md e começa pela Fase 0").
> Trabalha **fase a fase**. No fim de cada fase, pára, mostra-me o que fizeste e espera o meu OK.

---

## 0. Contexto

Sou a Jp, programadora a solo, em Portugal. Quero publicar um jogo de puzzle casual na **Google Play Store** (Android) para gerar rendimento com anúncios recompensados e compras na app.

- O meu computador é **Windows**. O alvo é **Android** (telemóvel, vertical).
- Inspiração de género: jogos tipo "Colony Flow" (desmontar uma imagem de píxeis recolhendo cores, com bandeja limitada). **Não copies nomes, personagens, textos, imagens nem sons desse jogo.** O tema, personagens, nomes de eventos e arte são nossos (abelhas).
- Idioma do jogo: **português de Portugal** (tom fofo, curto, caloroso), com tudo preparado para tradução (inglês a seguir).
- Sem emojis na interface.

---

## 1. O jogo em uma frase

As abelhas desmontam um quadro de pixel art bloco a bloco: escolhes peças de pólen coloridas, cada uma manda um enxame recolher N blocos dessa cor, mas só tens **5 ranhuras** — escolhe mal e ficas preso.

---

## 2. Mecânica principal (o núcleo — tem de ficar perfeito)

### 2.1 Elementos do ecrã de jogo (de cima para baixo)
1. **Topo:** botão pausa (esq.), "Nível N" (centro), botão **Acelerar 2x** (dir.) com contador de tempo quando ativo.
2. **Quadro:** moldura com uma imagem em pixel art feita de blocos (cubinhos com relevo e brilho). Tamanhos de 16×16 (início) até 40×44 (avançado).
3. **Entrada da colmeia:** um buraco/porta por baixo do quadro, ao centro. As abelhas saem e entram por aqui.
4. **Bandeja:** 5 ranhuras (brancas quando vazias).
5. **Área das peças:** grelha de 4 colunas. Cada peça tem uma **cor** e um **número**. Só a **fila da frente** (a de cima, mais perto da bandeja) está ativa e brilhante; as filas de trás aparecem esbatidas.
6. **Barra de reforços** (4 botões) e, por baixo, espaço para banner de anúncio.

### 2.2 Regras
- **Tocar** numa peça da fila da frente → a peça salta para a primeira ranhura livre (animação em arco). A peça de trás nessa coluna avança e fica ativa.
- Cada peça numa ranhura gera um **enxame**: abelhas saem da colmeia, cada uma voa até um **bloco alcançável** dessa cor, pega nele e leva-o para a colmeia. Cada bloco entregue desce 1 no número da peça.
- **Bloco alcançável:** bloco que toca (4 vizinhos) numa célula vazia ligada ao exterior do quadro. No início, só a borda está acessível. As abelhas preferem o bloco alcançável mais perto da colmeia.
- Várias ranhuras trabalham **ao mesmo tempo**.
- Peça chega a 0 → desaparece com efeito (pop + partículas) e a ranhura fica livre.
- Se uma peça não tiver blocos alcançáveis da sua cor, **fica parada** na ranhura até outra cor abrir caminho.
- **Vitória:** o quadro fica vazio.
- **Bloqueio:** 5 ranhuras ocupadas e nenhuma consegue avançar → janela "Sem espaço" (ver 4.4).
- Invariante: a soma dos números das peças de cada cor = número de blocos dessa cor no quadro. Nunca sobram nem faltam.

### 2.3 Obstáculos (aparecem aos poucos, cada um com mini-tutorial na primeira vez)
| Nível | Obstáculo | Regra |
|---|---|---|
| 1–10 | nenhum | aprender o básico |
| 11+ | **Peças gémeas** | duas peças unidas por uma barra; entram juntas e precisam de 2 ranhuras livres |
| 21+ | **Peças-tubo** | um tubo liga a peça da frente a uma peça de trás; quando a da frente chega a 0, a de trás sobe pelo tubo e ocupa logo a mesma ranhura |
| 31+ | **Pedra de cera** | bloco escuro no quadro com um número; desce 1 por cada bloco recolhido no nível; a 0 parte-se e liberta os blocos por trás |
| 41+ | **Peças escondidas** | aparecem com "?" até chegarem à fila da frente |
| 61+ | **Flores fechadas** | blocos no quadro que só abrem quando a cor vizinha indicada for toda recolhida |
| 81+ | **Caixas** *(acrescentado a pedido da Jp)* | caixa de madeira por cima de 2x2 a 3x3 blocos, com um número; desce 1 por cada bloco recolhido mesmo ao lado; a 0 parte-se e liberta os blocos |
| 101+ | **Cores com cadeado** *(acrescentado a pedido da Jp)* | as peças de uma cor têm cadeado e não se podem tocar; recolher N blocos da cor da chave (contador no topo) dá a chave e abre o cadeado |

### 2.4 Dificuldade
- Cada nível tem etiqueta **Normal / Difícil / Muito difícil** (aparece no botão Jogar). Padrão de ritmo: mais ou menos 1 difícil a cada 5 níveis e 1 muito difícil a cada 10. Depois de um difícil vem um mais fácil (respiro).
- Os níveis 1–20 são feitos à mão (tutorial). A partir do 21 entra o gerador.

### 2.5 Gerador e validador de níveis (obrigatório)
- As imagens vêm de pequenos PNG de pixel art em `assets/levels/art/` (temas: flores, frutos, animais, a colmeia, estações do ano, doces). Faz um script que quantiza para a paleta do jogo (máx. 6–9 cores por nível).
- O gerador cria as peças (divide a contagem de cada cor em peças de 5 a 50) e a ordem nas colunas.
- **Simulador/solver:** um módulo puro (sem gráficos) que joga o nível com N ranhuras. Um nível só é aceite se:
  - for resolúvel com 5 ranhuras;
  - para "Difícil", NÃO for resolúvel com uma estratégia gulosa simples (escolher sempre a peça com mais blocos alcançáveis);
  - para "Muito difícil", tiver poucas sequências vencedoras (mede a percentagem de escolhas que levam a derrota).
- Os níveis gerados são guardados em JSON (`levels/level_0001.json` …) com seed, para serem sempre iguais para todos.
- Gera 300 níveis para o lançamento. Testes automáticos: todos os níveis resolúveis e a invariante de contagem certa.

### 2.6 Sensação (o mais importante para ser viciante)
- Toques com resposta instantânea (menos de 50 ms): a peça "afunda" e ressalta.
- As abelhas voam em curva (Bézier), com asas a bater, ligeiro balanço, e carregam o bloquinho.
- Os blocos do quadro saltam ligeiramente quando uma abelha os apanha; o contador da peça faz um "pulso" a cada entrega.
- Combo: se duas peças terminarem seguidas, mostra "Boa!", "Fantástico!" com som crescente.
- Vitória: o quadro faz brilho, confetes, abelhas a festejar, moedas a voar para o contador.
- Velocidade 2x: tudo acelera (as abelhas mais rápidas) sem perder suavidade.

---

## 3. Economia

| Recurso | Regra |
|---|---|
| **Moedas** | ganhas ao vencer (20 normal, 40 difícil, 60 muito difícil); x2 vendo um vídeo |
| **Vidas** | máx. 5; perder um nível tira 1; recupera 1 a cada 30 min; ecrã mostra "Cheias" ou contagem decrescente |
| **Vidas infinitas** | por tempo (15 min, 30 min, 1 h) vindas de recompensas |
| **Reforços** | 4 tipos (ver abaixo); comprados com moedas ou vistos em vídeo |

### Reforços (barra de baixo)
1. **+1 Ranhura** — 6.ª ranhura até ao fim do nível.
2. **Baralhar** — reorganiza as peças ativas.
3. **Pinça** — tira qualquer peça (mesmo de trás) para a bandeja.
4. **Flor-íman** — o enxame recolhe na hora todos os blocos alcançáveis de uma cor à escolha.

Regras de oferta:
- Cada reforço desbloqueia num nível (5, 9, 14, 20) com tutorial e **3 unidades grátis**.
- Depois: 150–300 moedas, ou 1 vídeo por reforço (máximo 3 vídeos por reforço por dia).
- Sem unidades → o botão mostra um "+" verde que abre a compra.

---

## 4. Monetização

Implementa tudo atrás de duas interfaces (`AdService`, `IapService`) com uma versão **falsa para testes** (vídeo simulado de 3 s, compras simuladas) e depois a versão real. O jogo nunca pode partir se não houver anúncio disponível ou não houver internet.

### 4.1 Vídeos recompensados (o principal)
- x2 moedas no ecrã de vitória.
- +1 ranhura grátis quando ficas sem espaço (1 vez por nível).
- 1 vida grátis quando estás sem vidas.
- Reforço grátis (3 por dia por tipo).
- Passos "Ver vídeo" na corrente de ofertas (4.3).
- Duplicar a recompensa diária.

### 4.2 Intersticiais e banner
- Intersticial só a partir do nível 15, no máximo 1 a cada 3 níveis e com 90 s de intervalo, nunca logo a seguir a uma derrota, nunca a meio de um nível.
- Banner pequeno por baixo do jogo (opcional, configurável).
- **"Sem anúncios"** (compra) remove intersticiais e banner; os vídeos recompensados continuam disponíveis, porque são opcionais e dão prémios.

### 4.3 Compras na app
| Produto | Preço sugerido |
|---|---|
| Sem anúncios | 3,99 € |
| Pack inicial (aparece 1 vez, nível 10): moedas + reforços + 1 h vidas infinitas | 1,99 € |
| Packs de moedas | 0,99 € / 4,99 € / 9,99 € / 19,99 € |
| Passe da Colmeia (premium, por temporada de 28 dias) | 4,99 € |
| Continuar ao ficar sem espaço | 900 moedas |

**Corrente de ofertas "Tesouro da Rainha"** (o padrão que quero): uma escada de cartões em zigue-zague. Para desbloquear o seguinte tens de reclamar o anterior. Ritmo: **2 ou 3 passos grátis** (grátis ou ver vídeo), depois **1 pago**, depois mais 2–3 grátis, e assim sucessivamente. Os prémios grátis são pequenos (100 moedas, 10 min x2, 15 min vidas infinitas, 1 reforço); os pagos são bons. Dura 2 dias e recomeça.

Regras éticas e da Play Store:
- Nada de caixas pagas com prémio aleatório. Se alguma vez existir, mostrar as probabilidades.
- Preços sempre visíveis e claros, sem botões enganadores.
- Público-alvo na Play Console: **13+**, para não cair nas regras de apps para crianças.

### 4.4 Janela "Sem espaço"
Mostra a bandeja cheia em miniatura, depois:
- **Ver vídeo: +1 ranhura** (se ainda não usado neste nível);
- **Continuar — 900 moedas**;
- banner do Passe ("Revive já com o Passe");
- fechar → "Nível falhado" (perde 1 vida) com botões **Início** e **Tentar outra vez**.

---

## 5. Atividades e eventos (meta-jogo)

Todos com temporizador visível (ex.: "1d 07h") e ponto vermelho "!" quando há algo para reclamar. Começa só com os 3 primeiros e acrescenta os outros por fases.

1. **Recompensas diárias** — ciclo de 7 dias (50, 100, 150 moedas, pacote de reforços, 200…). Grátis 1 por dia; ver vídeo duplica.
2. **Passe da Colmeia** — 28 dias. Ganhar níveis dá bilhetes; cada patamar dá prémio. Faixa grátis (esq.) e faixa premium bloqueada (dir.) até comprar.
3. **Tesouro da Rainha** — corrente de ofertas (4.3).
4. **Corrida das Flores** — corrida contra 4 rivais controlados pelo jogo: o primeiro a ganhar 5 níveis seguidos à primeira tentativa ganha o baú grande; falhar um nível volta ao início. Os rivais têm nomes e avatares inventados, e o jogo não diz que são jogadores reais.
5. **Subida ao Girassol** — escada com marcos (11, 17, 22, 28…). Cada nível ganho dá um passo; cada marco dá um presente.
6. **Construir a Colmeia** — missões por etapas (ex.: "ganha 2 corridas", "usa 3 reforços"). Cada tarefa dá um material (cera, pétala, galho, folha) e cada etapa completa decora a colmeia no ecrã inicial. É a progressão a longo prazo.
7. **Multiplicador de pólen** (fase posterior) — barra no topo com x1/x5/x10/x25/x100; quanto maior o multiplicador, mais pontos de evento por nível, mas mais custa perder.
8. **Álbum de cartas** (fase posterior) — cartas de abelhas e flores em pacotes ganhos a jogar (nunca vendidos com dinheiro real).

---

## 6. Ecrãs

1. **Início:** fundo de jardim animado (nuvens, folhas a mexer), a abelha protagonista grande ao centro a segurar um cubo com "NÍVEL 144", a pestanejar e a balançar. Em cima: avatar, moedas (+), vidas, definições. Ícones redondos de eventos dos dois lados com temporizadores. Botão **Jogar** grande e verde com a etiqueta de dificuldade. Barra de baixo: Loja, Rankings, **Início** (destacado), Equipa (mais tarde), Coleção.
2. **Jogo** (secção 2).
3. **Vitória**, **Nível falhado**, **Sem espaço**, **Sem vidas**.
4. **Loja** (moedas, packs, Sem anúncios, restaurar compras).
5. Janelas de cada evento (com botão "i" de regras ilustradas).
6. **Definições:** som, música, vibração, idioma, privacidade/consentimento, restaurar compras, versão, suporte.
7. **Tutorial** com mão a apontar e escurecimento do resto.

---

## 7. Estilo visual e animação

- **Estilo:** cartoon fofo "quase 3D": formas redondas, cores vivas, **brilho e gradientes**, contornos escuros grossos nos textos, botões com relevo (aresta inferior mais escura) que afundam ao tocar.
- **Letra:** Baloo 2 ou Fredoka (títulos e números com contorno escuro), Nunito para texto.
- **Paleta base** (do meu design system "Merge", com brilho permitido):
  - Mel `#D1992C`, Âmbar `#D1822C`, Sol `#F2AB27`, Mostarda `#D1AC2B`, Areia `#D1BC72`
  - Rosa `#F2059F`, Magenta `#ED19D3`, Ameixa `#8B2A8C`, Violeta `#8302D2`
  - Azul-vivo `#0293F2`, Oceano `#00506A`, Lagoa `#037285`, Turquesa `#0FBF9F`, Água `#52D3BC`
  - Verde `#54C143`, Lima `#C3D12C`, Menta `#ABF9A4`
  - Fundo creme `#FBF6EA` / `#F2EAD3`, texto `#2E2412`
  - Botões principais: verde `#54C143` (Jogar, Reclamar), azul `#0293F2` (secundário), vermelho para fechar.
- **Personagens (originais):** abelhas redondas e fofas com olhos grandes e brilhantes. Protagonista **Mel** (amarela). Amigas: **Lila** (rosa), **Azu** (azul), **Menta** (verde), **Rainha Doce** (para o Tesouro). Expressões: feliz, a festejar, triste (derrota), concentrada.
- **Arte:**
  - Fase 1: faz tudo em **SVG/canvas desenhado por código**, num estilo consistente (gradientes, brilho, contorno), para o jogo já ficar bonito sem ficheiros externos.
  - Cria um `assets/manifest.json` com todos os nomes de imagens, para eu poder trocar mais tarde por PNG feitos por um ilustrador ou por IA, sem mexer no código.
- **Animações obrigatórias:** janelas a entrar com ressalto (escala 0,8 → 1,05 → 1); botões com "squash & stretch"; moedas e prémios a voar até ao contador; baús a abanar e a abrir com luz; confetes; personagem em repouso (respirar, pestanejar); transições suaves entre ecrãs; partículas de pólen a flutuar no início.
- Respeitar "reduzir movimento" do sistema (animações mais curtas).

## 8. Som
- Música calma de jardim (loop), sons curtos: toque, peça na ranhura, entrega de bloco (tom que sobe com o combo), peça concluída, vitória, derrota, moedas, baú.
- Gera os sons por código (Web Audio) na fase 1; deixa-os trocáveis por ficheiros depois.
- Vibração leve ao tocar e ao concluir uma peça (desligável).

---

## 9. Tecnologia

- **Phaser 3 + TypeScript + Vite** (corre no browser para testar rápido).
- **Capacitor** para gerar a app Android (AAB) com o Android Studio no Windows.
- Anúncios: `@capacitor-community/admob` (usar **IDs de teste** até eu dar os reais) + **consentimento UMP do Google** (obrigatório na UE/Portugal antes de mostrar anúncios).
- Compras: RevenueCat (`@revenuecat/purchases-capacitor`) ou Google Play Billing; restaurar compras.
- Gravação: `@capacitor/preferences` (no browser, localStorage), com versão de save e migração.
- Funciona **100% offline** (anúncios e compras só quando houver rede).
- Temporizadores com base no relógio do servidor quando houver rede; proteção básica contra mudar a hora do telemóvel.
- Remote config simples (JSON) para preços, frequência de anúncios e eventos ativos, com valores por defeito embutidos.
- Analytics (fase posterior): Firebase — início/fim de nível, derrotas por nível, uso de reforços, vídeos vistos, compras.

### Estrutura sugerida
```
src/
  core/        # lógica pura: board, reachability, swarm, slots, solver, generator (sem Phaser)
  scenes/      # Boot, Home, Game, Shop, Events…
  ui/          # botões, janelas, contadores, componentes reutilizáveis
  art/         # desenho procedural das abelhas, blocos, ícones
  services/    # AdService, IapService, SaveService, TimeService, AudioService, Analytics
  meta/        # economia, vidas, reforços, eventos, passe, ofertas
  i18n/        # pt-PT.json, en.json
levels/        # JSON gerados
tools/         # gerador de níveis, quantizador de imagens
tests/         # vitest
```

---

## 10. Fases (pára no fim de cada uma)

**Fase 0 — Preparar**
Projeto Vite + Phaser + TS, ESLint, Vitest, `CLAUDE.md` com estas regras (incluindo a secção 11), script `npm run dev`. `.gitignore`, `.env.example`, verificação de segredos (gitleaks) e `npm audit` configurados desde o início. Ecrã de teste a correr no browser em modo telemóvel (390×844).

**Fase 1 — Núcleo jogável**
Lógica pura em `core/` com testes (alcance, enxames, ranhuras, vitória/bloqueio). Ecrã de jogo com arte provisória limpa. 10 níveis à mão. Aceitação: consigo ganhar e perder; 60 fps num telemóvel médio; testes verdes.

**Fase 2 — Gerador + solver**
Quantizador de imagens, gerador, solver, etiquetas de dificuldade, 300 níveis validados. Relatório com a curva de dificuldade.

**Fase 3 — Sensação e arte**
Abelhas animadas, blocos com relevo e brilho, partículas, sons, velocidade 2x, combos, ecrã de vitória/derrota com animação. Aceitação: parece um jogo da loja, não um protótipo.

**Fase 4 — Economia e ecrã inicial**
Moedas, vidas, reforços (com 3 grátis e tutorial), ecrã inicial completo, loja, definições, tutorial dos primeiros níveis.

**Fase 5 — Monetização (simulada)**
`AdService` e `IapService` falsos com todos os pontos de vídeo, intersticial, banner, compras, "Sem espaço", "Sem anúncios", corrente "Tesouro da Rainha".

**Fase 6 — Eventos**
Recompensas diárias, Passe da Colmeia, Corrida das Flores, Subida ao Girassol, Construir a Colmeia. Temporizadores e pontos "!".

**Fase 7 — Android real**
Capacitor, ícone e ecrã de arranque, AdMob com IDs de teste + consentimento UMP, compras em modo de teste, build AAB assinado. Escreve-me um passo a passo para Windows (instalar Android Studio, gerar a chave, carregar na Play Console, testes fechados com 12 testadores durante 14 dias).

**Fase 8 — Polimento para lançamento**
Política de privacidade (PT/EN), tabela para a secção Segurança dos dados, ecrã "Créditos e licenças", ficha da loja (descrição PT/EN, sugestões de capturas), otimização de tamanho, testes em ecrãs pequenos. Revisão completa da secção 11 (lista com cada ponto marcado como feito, não aplicável ou pendente) e guia para eu analisar o APK com MobSF.

---

## 11. Segurança, privacidade e regras legais (obrigatório em todas as fases)

> O jogo é **offline e individual**, sem chat nem contas na versão 1. Isso já elimina muitos riscos (não há base de dados de jogadores nem passwords para roubar). Mesmo assim, aplica tudo o que está abaixo. Se mais tarde houver funções online, aplica a parte 11.3 **antes** de as lançar.

### 11.1 Chaves, segredos e código
- **Nenhuma chave secreta dentro da app.** Tudo o que vai no APK/AAB pode ser extraído (descompilado). Na app só entram identificadores que são públicos por natureza (ID da app AdMob, IDs dos blocos de anúncios, chave **pública** do SDK RevenueCat). Chaves secretas (API secreta da RevenueCat, contas de serviço da Google, tokens de webhooks) ficam só num servidor ou num gestor de segredos, nunca no código nem no Git.
- Ficheiro `.env` para configuração local + `.env.example` sem valores. O `.gitignore` tem de incluir `.env*`, `*.keystore`, `*.jks`, `key.properties`, `google-services.json` (se não for necessário no repositório) e as pastas de build.
- Antes de cada commit/build: verificação automática de segredos (ex.: `gitleaks`) e `npm audit`. Ativa o Dependabot (ou equivalente) se o repositório estiver no GitHub. O repositório deve ser **privado**.
- Só dependências oficiais e mantidas, com versões fixas (`package-lock.json`). Ferramentas (Node, Android Studio, JDK) só dos sites oficiais.
- Build de lançamento com minificação/ofuscação (R8/ProGuard no Android, minificação no Vite) e sem `console.log` de debug, mapas de código (*source maps*) ou menus de teste.
- **Chave de assinatura:** usar a assinatura de apps da Google Play (Play App Signing). A chave de *upload* fica guardada fora do projeto, com cópia de segurança em dois sítios e password num gestor de passwords. Se se perder, explica-me o processo de recuperação.

### 11.2 Compras, moedas e batota
- **Nunca confiar no telemóvel para compras.** Uma compra só dá o prémio depois de validada (RevenueCat valida o recibo da Google do lado deles). Usa a lista de *entitlements* devolvida pelo serviço, não uma variável local. "Restaurar compras" tem de funcionar.
- Confirmar (*acknowledge*) todas as compras no prazo da Google, senão são reembolsadas automaticamente.
- Prémios de vídeos recompensados só depois do evento "recompensa ganha" do SDK (nunca ao abrir o vídeo). Para valores importantes, usar a verificação do lado do servidor (SSV) da AdMob.
- Moedas e progresso offline guardados localmente com versão + verificação de integridade simples (checksum/HMAC com chave derivada, só para dissuadir edição fácil). Aceitamos que num jogo offline é impossível impedir 100% a batota: o objetivo é que a batota não dê acesso a nada pago.
- Proteção do relógio: se a hora do telemóvel andar para trás ou saltar muito para a frente, não dar vidas/recompensas de tempo extra (usar a hora da rede quando houver ligação).
- Se houver funções online (11.3), verificar a integridade da app com a **Play Integrity API**. Anti-batota de PC (Easy Anti-Cheat, BattlEye) não se aplica a um jogo casual de Android.

### 11.3 Se houver funções online (guardar na nuvem, rankings, equipas, chat)
- O jogo **nunca fala diretamente com a base de dados**: passa sempre por uma API ou funções no servidor (ex.: Firebase com Cloud Functions, ou Supabase com Edge Functions), que validam tudo (o servidor decide moedas, prémios e pontuações).
- Firebase: regras de segurança fechadas por defeito (cada jogador só lê/escreve os seus dados) + App Check. Supabase: Row Level Security ativa em todas as tabelas; a chave `service_role` nunca vai para a app.
- Autenticação com tokens (Firebase Auth / Supabase Auth, ou JWT de curta duração). Se houver contas com password, guardar só o *hash* (Argon2 ou bcrypt com salt). Melhor ainda: não criar passwords próprias e usar login da Google/anónimo.
- Só HTTPS (TLS). No Android, bloquear tráfego sem encriptação (`cleartextTrafficPermitted=false`).
- Limite de pedidos (*rate limiting*) por utilizador e por IP. IDs aleatórios (UUID), nunca sequenciais. Validar e limpar todos os dados de entrada; consultas sempre parametrizadas/ORM (nunca juntar texto do jogador numa query).
- A base de dados não fica exposta à internet; encriptação em repouso (por defeito nos serviços geridos) e cópias de segurança automáticas.
- Chaves com permissões mínimas, restritas à app (pacote + certificado SHA-1/SHA-256) ou ao servidor, e com rotação se houver suspeita de fuga.
- **Chat:** só se for mesmo necessário. Se existir: frases pré-definidas ou filtro de palavras, botão de denúncia, bloquear jogador, moderação e regras da comunidade publicadas.
- Se houver contas: **eliminação da conta e dos dados** dentro da app e por uma página web (obrigatório na Google Play).

### 11.4 Privacidade (RGPD) e dados
- Recolher o mínimo possível. A versão 1 não pede nome, email nem localização. Não guardar dados pessoais em registos (*logs*).
- **Consentimento antes dos anúncios:** formulário UMP da Google (certificado para a UE) no primeiro arranque, com opção nas Definições para mudar a escolha. Se a pessoa recusar, mostrar só anúncios não personalizados.
- **Política de privacidade** em português e inglês, alojada num URL público (ex.: GitHub Pages), com ligação na loja e dentro da app. Tem de dizer: que dados recolhem os SDK (AdMob, RevenueCat, Firebase se houver), para quê, com quem são partilhados, quanto tempo ficam guardados, os direitos RGPD (acesso, apagar, oposição) e um email de contacto.
- Preencher a secção **Segurança dos dados** (*Data safety*) da Play Console de acordo com o que os SDK realmente recolhem (ID de publicidade, dados de diagnóstico, histórico de compras). Gera-me uma tabela para copiar.
- Pedir apenas as permissões necessárias (internet, ID de publicidade, faturação). Nada de contactos, câmara, localização ou ficheiros.
- Analytics e relatórios de erros (se houver) também declarados e cobertos pelo consentimento quando aplicável.

### 11.5 Público, menores e práticas justas
- Público-alvo na Play Console: **13+** (ou 18+), sem publicidade dirigida a crianças. O estilo é fofo, por isso a Google pode considerar que "atrai crianças". Nesse caso, cumprir a política Famílias: anúncios com classificação de conteúdo máxima **G**, `tagForUnderAgeOfConsent`/tratamento para crianças quando aplicável, e sem anúncios personalizados para menores.
- Nos ajustes da AdMob: classificação máxima de anúncios G ou PG e bloquear categorias sensíveis (jogos de azar, encontros, álcool).
- **Moedas virtuais e compras (princípios da rede europeia de defesa do consumidor, CPC):** mostrar sempre o preço em euros das compras com dinheiro real; não esconder o custo real das moedas; nada de contagens decrescentes falsas nem pressão enganadora; botão de fechar sempre visível nas ofertas; não dirigir ofertas pagas a crianças; regras dos eventos claras (botão "i").
- **Sem caixas aleatórias pagas** (*loot boxes*). Se alguma vez houver prémios aleatórios ligados a dinheiro, mostrar as probabilidades antes da compra.
- Os rivais da Corrida das Flores são controlados pelo jogo e isso é dito nas regras do evento.
- Reembolsos: seguem as regras da Google Play; indicar o email de suporte nas Definições e na loja.
- Classificação etária: preencher o questionário IARC na Play Console (deve dar PEGI 3).

### 11.6 Propriedade intelectual e licenças
- Tudo original ou com licença que permita uso comercial. Fontes Baloo 2, Fredoka e Nunito: licença SIL OFL (permitido; guardar o ficheiro da licença). Bibliotecas: guardar as licenças (MIT, Apache…) num ecrã "Créditos e licenças" nas Definições.
- Imagens/sons feitos com IA: confirmar que os termos da ferramenta permitem uso comercial e guardar registo de onde veio cada ficheiro (`assets/CREDITS.md`).
- Assets de lojas (Unity Asset Store, itch.io, etc.): ler a licença; nada de "uso não comercial".
- Nenhum nome, personagem, logotipo, música ou texto de outros jogos ou marcas.
- Antes de publicar: confirmar que o nome "Colmeia Doce" não está registado como marca (EUIPO/INPI) nem usado por outro jogo na Play Store.

### 11.7 Requisitos da Google Play
- Conta de programador pessoal: verificação de identidade + **teste fechado com pelo menos 12 testadores durante 14 dias seguidos** antes de poder publicar em produção.
- Cumprir o *target API level* exigido pela Google no momento do envio, formato AAB, ícone 512×512, imagem de destaque 1024×500, capturas de ecrã, descrição sem palavras enganadoras ("n.º 1", "grátis para sempre").
- Anúncios: cumprir a política de anúncios (nada de anúncios inesperados em ecrã inteiro ao abrir a app ou a meio do jogo; botão de fechar visível; banner sem tapar botões).
- Testar sempre com **IDs de teste da AdMob** (clicar nos próprios anúncios reais leva ao bloqueio da conta).

### 11.8 Qualidade e testes de segurança (a Jp vai fazer esta parte, explica-me como)
- Seguir a lista OWASP MASVS (nível L1) para apps móveis e marcar o que se aplica.
- Analisar o APK final com MobSF e com `apktool`/`jadx` para confirmar que não há segredos, URLs de teste nem permissões a mais.
- Testar com a Internet desligada, com o relógio alterado, com o save apagado e com o save corrompido: o jogo nunca pode bloquear nem perder compras.
- Relatórios de erros (ex.: Firebase Crashlytics, declarado na privacidade) e atualizações regulares com correções.

## 12. Regras de trabalho

- Explica-me as decisões em linguagem simples e curta (estou a aprender).
- Faz commits pequenos com mensagens claras.
- A lógica do jogo fica separada dos gráficos e tem testes.
- Antes de dizer que uma fase está feita: corre os testes, abre o jogo e confirma que não há erros na consola.
- Se algo nesta especificação estiver confuso ou impossível, pergunta-me antes de inventar.
- Nada de copiar nomes, textos, personagens ou arte de jogos existentes.
- A secção 11 aplica-se a todo o código: se uma tarefa entrar em conflito com ela, pára e avisa-me.
- Se alguma regra da Google Play ou da UE tiver mudado desde que este documento foi escrito, segue a versão oficial mais recente e diz-me o que mudou.
