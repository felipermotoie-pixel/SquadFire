# P07 — Contas, backend e sincronização

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 08.
Status: Pendente. Backend atual só registra a rota de saúde; o schema do banco é um esqueleto.
Dependência de liberação: [P06 — etapa 7](07_EM_ANDAMENTO_P06_BALANCEAMENTO.md).
Estimativa preliminar: 6–10 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Construir a identidade e a persistência confiável que sustentam perfil, inventário e compras.

## Atividades em ordem

- [ ] **P07-01** — Selecionar provedor e concretizar ambientes/URLs de retorno usando IDs e estratégia de build de P01-09; produzir build de desenvolvimento para autenticação antes dos testes de login.
- [ ] **P07-02** — Implementar cadastro/login da Conta SquadFire, confirmação de e-mail, recuperação e expiração de sessão.
- [ ] **P07-03** — Integrar Apple/Google por plataforma e testar login real, cancelamento, retorno e vinculação segura.
- [ ] **P07-04** — Modelar jogador, progresso, checkpoint, preferências e dispositivos; separar dados por identidade e ambiente.
- [ ] **P07-05** — Implementar APIs autorizadas e logs/eventos sem segredos, controle de repetição e contratos de economia. P09 implementa as regras de ledger, preços e consumo; não duplicá-las aqui.
- [ ] **P07-06** — Implementar migração de convidado, sincronização offline/online e resolução de conflitos sem somar partidas diferentes.
- [ ] **P07-07** — Entregar logout, exclusão de conta, backup/restauração em teste e suporte; ativar a entrada Conta no Home de P03.

## Modelo mínimo de dados

P07 implementa users/profiles, campaign_progress, run_checkpoints e user_preferences.
inventory_entitlements, wallet_ledger, transactions, item_consumptions e catalog_versions são interfaces previstas em P01;
sua estrutura financeira definitiva e regras pertencem a P09. P10 consome essas APIs.
Credenciais de provedores e chaves administrativas somente no servidor. Tokens do app em armazenamento seguro apropriado.
Vinculação de contas exige autenticação dos provedores; e-mail igual sozinho não comprova propriedade.

## Offline e fraude

Progresso local deve sobreviver à perda de rede. Pontos/itens trazidos de uma sessão offline não se tornam saldo confiável por simples upload.
Definir política: sessões verificáveis/replay ou recompensas offline limitadas e reconciliadas. Em conflito de checkpoints,
mostrar versão/fase/data e preservar recuperação. Ledger não aceita sobrescrita de saldo pelo cliente.
No primeiro lançamento, propor compras e consumo de itens de valor transacionável online; jogar sem itens continua offline.

## Dependências externas

Projetos Apple/Google/provedor, bundle ID/package name, URLs de retorno e infraestrutura devem ser configurados em P07.
Solicitar acesso quando indispensável, sem segredos no chat. Login Google nativo precisa build de desenvolvimento,
conforme [Expo](https://docs.expo.dev/guides/google-authentication/); não aprovar integração só em Expo Go.
Planejar exclusão de conta junto do cadastro, conforme [orientação Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
Contas não adicionam multiplayer, chat nem ranking público a este escopo.

## Entrega e aceite

Entregas: Modelo de dados, APIs, login real, sincronização e documentação operacional.

Aceite: Usuário só acessa seus dados; token inválido é rejeitado; conflitos e logout não misturam contas; backup restaurado em teste.

Validação: Dois dispositivos, convidado→conta existente, internet interrompida, sessão revogada e tentativas de acesso cruzado.

## Liberação e conclusão desta etapa

Entrada: Identidade/IDs/ambientes definidos em P01; checkpoint P04 estável. A posição após P06 evita integrar persistência sobre regras ainda móveis.

Saída: Login real, isolamento de contas, migração de convidado e conflito de saves testados em builds de desenvolvimento; backup restaurado.

Próxima ação: Preparar o provedor e o build de desenvolvimento em P07-01 usando IDs definidos em P01-09.

## Impacto sobre os outros planos

P07 implementa identidade e acesso. Estruturas financeiras citadas são contratos; regras de saldo e transação pertencem a P09. Não validar auth só no Expo Go.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P07 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
