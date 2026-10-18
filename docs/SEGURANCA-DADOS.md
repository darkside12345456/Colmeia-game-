# Tabela para a secção "Segurança dos dados" (Data safety) da Play Console

Baseada no que os SDK incluídos recolhem (Google Mobile Ads/UMP via `@capacitor-community/admob`,
RevenueCat via `@revenuecat/purchases-capacitor`). **Antes de submeter, confirma nas páginas oficiais**
(podem ter mudado):
- Google Mobile Ads: https://developers.google.com/admob/android/privacy/play-data-disclosure
- RevenueCat: https://www.revenuecat.com/docs/platform-resources/apple-app-privacy (secção Google Play)

## Perguntas gerais

| Pergunta | Resposta |
|---|---|
| A app recolhe ou partilha algum dos tipos de dados obrigatórios? | **Sim** |
| Todos os dados recolhidos são encriptados em trânsito? | **Sim** (só HTTPS) |
| Os utilizadores podem pedir que os dados sejam eliminados? | **Sim** - por email de suporte (não há contas; dados locais apagam-se ao desinstalar) |
| A app segue a política Famílias? | Não (público 13+). Se a Google classificar como "atrai crianças", rever. |
| Revisão de segurança independente (MASA)? | Não (opcional) |

## Tipos de dados

| Categoria → Tipo | Recolhido | Partilhado | Opcional? | Finalidade | Quem |
|---|---|---|---|---|---|
| Localização → **Localização aproximada** | Sim | Sim | Não | Publicidade/marketing; Prevenção de fraude, segurança e conformidade | AdMob (a partir do IP) |
| Identificadores do dispositivo ou outros → **ID de publicidade / IDs do dispositivo** | Sim | Sim | Não | Publicidade/marketing; Estatísticas (do SDK); Prevenção de fraude | AdMob |
| Identificadores do dispositivo ou outros → **ID de utilizador da app (anónimo)** | Sim | Não | Não | Funcionalidade da app (compras) | RevenueCat |
| Informações financeiras → **Histórico de compras** | Sim | Não | Não | Funcionalidade da app; Gestão de conta (restaurar compras) | RevenueCat |
| Atividade na app → **Interações na app** | Sim | Sim | Não | Publicidade/marketing; Estatísticas | AdMob (interações com anúncios) |
| Informações e desempenho da app → **Registos de falhas** | Sim | Não | Não | Estatísticas; Prevenção de fraude | AdMob |
| Informações e desempenho da app → **Diagnósticos** | Sim | Não | Não | Estatísticas; Funcionalidade | AdMob, RevenueCat |
| Informações e desempenho da app → **Outros dados de desempenho** | Sim | Não | Não | Publicidade; Estatísticas | AdMob |

Não recolhidos: nome, email, telefone, morada, contactos, fotos, ficheiros, calendário, mensagens,
localização precisa, saúde, áudio, histórico de navegação, dados de pagamento (tratados pela própria Google Play).

Quando ativares o **Firebase Analytics/Crashlytics** (fase posterior), acrescenta-os aqui, na política de
privacidade e no consentimento.

## Outras declarações na Play Console

| Secção | Resposta |
|---|---|
| Anúncios | Contém anúncios |
| ID de publicidade | Sim - para publicidade e estatísticas (AdMob) |
| Público-alvo | 13-15, 16-17, 18+ |
| Classificação (IARC) | Responder com honestidade: sem violência, sem jogo a dinheiro, compras na app = sim, interação entre utilizadores = não. Esperado PEGI 3. |
| Compras na app | Sim |
| Caixas aleatórias pagas (loot boxes) | Não existem |
