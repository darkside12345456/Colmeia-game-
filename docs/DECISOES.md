# Decisões tomadas e perguntas para a Jp

A especificação deixa algumas coisas em aberto. Tomei estas decisões para não parar o trabalho;
**todas são fáceis de mudar** (a maioria está em `src/meta/config.ts`, que também pode vir do remote config).

## Acelerar 2x com anúncios (pedido extra)
| Decisão | Porquê | Onde mudar |
|---|---|---|
| "Curto" = intersticial recompensado da AdMob; "longo" = vídeo recompensado | A AdMob não deixa escolher a duração de um anúncio; estes são os dois formatos com prémio | `src/services/ads.ts` |
| 2 curtos **ou** 1 longo = **5 minutos de jogo a 2x** | Pedido | `config.speedBoost` |
| O tempo só conta **enquanto jogas com o 2x ligado** (não gasta nos menus nem com o jogo em pausa); o botão 2x liga/pausa | Mais justo: quem vê os anúncios recebe mesmo 5 minutos de jogo | `consumeSpeed` em `src/meta/economy.ts` |
| Pode acumular até 30 min e ativar até 10 vezes por dia | Evitar abuso de anúncios / regras da AdMob | `config.speedBoost.maxStackMinutes`, `maxPerDay` |
| Se viste 1 curto e saíste, o progresso fica guardado até ao fim do dia | Não perder o anúncio já visto | |
| As recompensas "10 min x2" do Tesouro usam o mesmo tempo 2x | Coerência | |

## Visual moderno (pedido da Jp, substitui parte da secção 7 da especificação)

- A Jp achou o primeiro visual "rústico e demasiado criança". O jogo passou para um estilo **moderno e premium**:
  fundo noturno índigo/ameixa com brilhos cor de mel, rosa e azul, e favos muito subtis.
- Blocos e peças em **gema/vidro** com brilho e um pequeno espaço entre blocos. Já **não há contornos pretos grossos**.
- Janelas em **vidro fosco escuro**, com o título numa etiqueta em pílula. O botão de fechar continua sempre visível.
- Botões em pílula com gradiente e um brilho suave da própria cor. As cores são mais vivas (verde-esmeralda, azul,
  violeta, mel).
- Letra única **Outfit** (SIL OFL 1.1), em vez de Baloo 2 e Nunito. As licenças, os créditos e o `assets/CREDITS.md`
  foram atualizados.
- As abelhas mantêm a personalidade, mas com traço fino e asas de vidro.
- Ícone, splash e imagens da loja foram gerados de novo no mesmo estilo.
- Cores e letra ficam num só sítio (`src/ui/theme.ts`), por isso mudar o visual outra vez é fácil.
- A lógica do jogo e os níveis não mudaram.

## Economia e preços (inventados por mim - confirma)
- Moedas de vitória 20/40/60, vidas 5 com 1 a cada 30 min (da especificação).
- Reforços: +1 Ranhura 250, Baralhar 150, Pinça 200, Flor-íman 300 moedas (dentro de 150-300).
- Packs de moedas: 0,99 € = 1000 · 4,99 € = 6000 · 9,99 € = 14 000 · 19,99 € = 32 000.
- Pack inicial (1,99 €): 1500 moedas + 2 de cada reforço + 1 h de vidas infinitas. Só aparece uma vez (popup no nível 10), não fica na loja.
- Tesouro da Rainha: passos pagos a 1,99 / 2,99 / 4,99 € (12 passos, ritmo 2-3 grátis/vídeo + 1 pago, recomeça a cada 2 dias).
- "Continuar" (900 moedas) e "Ver vídeo" no ecrã Sem espaço dão **+1 ranhura** (máximo 7 ranhuras).
- Passe da Colmeia: 30 patamares, 3 bilhetes por patamar (Normal 1, Difícil 2, Muito difícil 3). O Premium é uma
  compra **consumível por temporada** (4,99 €) e inclui 1 "reviver grátis" por nível ("Revive já com o Passe").
  Alternativa possível: subscrição "a cada 4 semanas" da Google Play (mais burocracia; diz-me se preferires).

## Eventos
- Desbloqueiam nos níveis: Prémio diário 2, Tesouro 4, Passe 8, Corrida 12, Girassol 16, Construir a Colmeia 22.
- Corrida das Flores: 24 h; rivais com nomes inventados (Zuca, Pipoca, Bolota, Fifi, Tito, Nina…).
- Subida ao Girassol: ciclo semanal, marcos 5, 11, 17, 22, 28, 35, 42.
- Construir a Colmeia: 5 etapas × 3 tarefas (base de cera, porta florida, telhado de folhas, jardim, bandeira).
- **Ainda não feitos** (a especificação diz "fase posterior"): Multiplicador de pólen e Álbum de cartas.
  Rankings, Equipa e Coleção mostram "Em breve" (Rankings/Equipa precisam de servidor - secção 11.3).

## Jogo
- Níveis 1-20 feitos à mão (a secção 2.4 pede 1-20; a Fase 1 pedia 10 - fiz os 20).
- Obstáculos: gémeas ficam em colunas diferentes ligadas por barra; o tubo liga a peça da frente à peça **logo atrás** dela na mesma coluna.
- "Baralhar" troca as peças livres das colunas e escolhe, se possível, uma ordem que ainda dê para ganhar.
- "Flor-íman" recolhe os blocos alcançáveis **nesse momento** (não continua em cascata).
- Depois do nível 300, os níveis repetem (até haver uma atualização com mais).
- A pedra de cera tapa um bloco; ao partir, revela-o.
- Perder ou sair de um nível tira 1 vida; fechar a app a meio não tira.

## Tecnologia
- Phaser **3.90** (a especificação pede Phaser 3; já existe a versão 4).
- Capacitor 8, AdMob plugin 8.2, RevenueCat 13.7, Vite 8, TypeScript 5.9.
- `appId` Android: **`pt.colmeiadoce.app`** - não pode mudar depois de publicar. Confirma se queres outro.
- A hora "da rede" só é usada se definires `VITE_REMOTE_CONFIG_URL` (lê o cabeçalho Date desse pedido).

## Perguntas para ti
1. Concordas com a forma do **Acelerar 2x** (tempo de jogo, não tempo real; acumulável até 30 min; 10 por dia)?
2. Os **preços e quantidades** acima estão bem?
3. `pt.colmeiadoce.app` serve como identificador?
4. O Passe Premium como compra por temporada (e não subscrição) está bem?
5. Que **email de suporte** e que **nome** queres na política de privacidade?
6. Queres que avance com o Multiplicador de pólen e o Álbum de cartas?
