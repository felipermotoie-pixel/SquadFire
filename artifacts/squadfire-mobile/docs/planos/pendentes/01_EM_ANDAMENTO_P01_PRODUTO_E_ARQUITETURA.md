# P01 — Produto, escopo e arquitetura

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 01.
Status: Em andamento: inventário documental e inspeção do código executados nesta revisão; decisões, contratos e testes de base ainda pendentes.
Dependência de liberação: nenhuma; início do programa.
Estimativa preliminar: 2–3 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Definir uma versão completa e finita, com contratos comuns para arte, gameplay, contas e loja.

## Atividades em ordem

- [x] ~~**P01-01** — Inventariar código, saves, arte, testes e relatórios; registrar a base sem perder mudanças locais.~~
- [ ] **P01-02** — Definir público, Android/iPhone mínimo e alvo, idioma, sessão esperada e acessibilidade.
- [ ] **P01-03** — Resolver direção artística, política de Continuar e inclusão de dinheiro real na primeira versão.
- [ ] **P01-04** — Fixar escopo de lançamento: Terra com dez fases, abertura/Home, tutorial, perfil, contas, loja, itens, skins e áudio.
- [ ] **P01-05** — Desenhar fronteiras entre motor de combate, renderização, navegação, persistência, perfil, economia e backend.
- [ ] **P01-06** — Definir IDs e versões para jogador, partida, checkpoint, catálogo, item, skin, transação e balanceamento.
- [ ] **P01-07** — Registrar responsáveis, critérios de aceite e projeção de esforço ajustada às decisões.

- [x] ~~**P01-08** — Preparar a medição inicial antes da reforma: revisar o ganho pós-cap do Profile B, usar SQUAD.initialSize no código e na descrição, verificar escolha/aplicação do portal e registrar campanha com 1 soldado, seeds fixas e código identificado. Executar regressões de combate/fases/tipos na base; separar falhas numéricas de defeitos mecânicos. Reaproveitar o instrumento em P06, sem duplicar implementação.~~
- [ ] **P01-09** — Definir IDs do app, ambiente interno, caminho de build Android/iOS/web, interfaces de logs/eventos e artefatos de teste. Conferir cedo acesso a aparelhos/contas e compilar a base atual no alvo disponível. P02 usa esse caminho para sua cena; P07 acrescenta login real. Não esperar P14.

## Contratos

Eventos de sessão devem ter runId, stageAttemptId, eventId, versão de regras e progressEligible.
A elegibilidade acompanha tutorial/dev até perfil, carteira e sincronização; replay de checkpoint não gera novo prêmio.
Contrato de checkpoint inclui versão de regras, estado determinístico e consumo referenciado. Preferências têm um serviço único.
XP, saldo e conquistas recebem contratos de eventos agora; suas regras finais pertencem a P09 e sua apresentação a P08.
A decisão sobre recompensas offline precisa estar registrada antes de P07/P09 implementar sincronização financeira.

Motor simula combate e não depende de telas ou compras. Renderizador lê o estado e não decide dano.
Navegação monta, pausa e encerra sessões. Persistência distingue recordes, checkpoint e preferências.
Backend autoriza posse, conta e transações; preços e saldos enviados pelo cliente não são a fonte de verdade.

## Escopo e restrições

Partida nova/RETRY: um soldado. P10 vermelho equivale a dez soldados; restos ficam individuais.
Mira manual, tiros retos e dano por colisão permanecem. Skins não alteram estatísticas.
Terra 1–10 é o conteúdo do primeiro lançamento completo; outros planetas ficam em expansão posterior.
Web continua funcional para testes; distribuição comercial web é uma decisão própria.
O plano descreve trabalho futuro, sem declarar o aplicativo pronto nem contratar serviços.

## Entrega e aceite

Entregas: Documento de produto, contratos de dados, matriz de dispositivos e decisões registradas.

Aceite: Cada pedido do usuário mapeado a uma entrega verificável e cada sistema com responsabilidade única.

Validação: Revisão de escopo e dependências; nenhuma função necessária ao lançamento fica sem plano.

## Liberação e conclusão desta etapa

Entrada: Nenhuma etapa anterior. Esta é a única etapa liberada para execução agora.

Saída: Decisões que afetam contratos registradas; baseline atual medido; contratos versionados; ambiente de teste e caminho de build definidos.

Próxima ação: executar P01-02, confirmando público, aparelhos mínimo/alvo, idioma, sessão esperada e acessibilidade. P01-01 e o diagnóstico técnico P01-08 foram concluídos em 15/09/2026; P01-03 e contratos continuam bloqueados pelas decisões de produto correspondentes.

## Impacto sobre os outros planos

A tecnologia visual de P02 pode exigir revisão dos contratos. Identidade, runId, checkpoint, preferências, catálogo e eventos precisam ter donos únicos antes de telas e banco.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P01 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro de execução

### 15/09/2026 — P01-01 concluído: inventário real da base

- **Código e estado:** `HEAD` era `0fef40f` (`Adjustments`) e `git status --short` estava vazio antes
  desta atividade. O motor está em `game/`, a UI em `app/` e `components/`, e o harness da campanha em
  `scripts/measure-earth.ts`. As mudanças desta execução ficaram limitadas ao harness e aos relatórios/
  documentos aqui citados; nenhuma alteração local anterior foi descartada.
- **Saves:** `game/campaign.ts` e `game/campaign-progress.ts` implementam progresso de campanha v3 com
  migração de saves wave-era/v2; o save guarda recordes, não retomada de partida. A suíte de fases cobre
  save novo, migração, limites, idempotência e planetas desconhecidos.
- **Assets:** runtime contém soldado azul, grunt vermelho, boss crimson e horizonte costeiro; `assets/source/`
  preserva os originais e variantes v0.3.5. Não houve mudança de arte.
- **Testes e relatórios existentes:** `game/tests/fire-system.test.ts`,
  `game/tests/stage-system.test.ts`, `docs/reports/OPENING_BALANCE_2026-09-15.md`,
  `docs/reports/campaign-after-2026-09-15.json` e `docs/reports/EARTH_BALANCE_v0.4.0.*`.
- **Evidência executada:** `pnpm run test:sim` e `pnpm run typecheck` foram tentados primeiro e não
  iniciaram as suítes porque o registro de workspace do pnpm retornou `EEXIST`/`EBUSY` para um symlink.
  Sem reinstalar dependências, a execução sequencial direta de `esbuild` + `node` aprovou **67/67** checks
  de tiro/formação e **19/19** de fases/portais/persistência. `tsc -p tsconfig.json --noEmit` também passou.

### 15/09/2026 — P01-08 concluído: baseline de um soldado e Profile B

- **Correção limitada do harness:** `scripts/measure-earth.ts` continua iniciando com
  `SQUAD.initialSize` (1) e usando `Game.setInputX`, o mesmo alvo horizontal usado pela mira manual.
  Profile B agora rejeita um portal sem efeito quando a alternativa altera poder/dano/cadência; quando as
  duas opções são efetivas, escolhe maior DPS real, depois menor desequilíbrio e, por fim, desempate fixo.
  Cada decisão registra efetividade esquerda/direita e motivo no JSON. Duas guardas internas executadas
  na medição provam `no-op avoided` e `higher effective DPS preferred`.
- **Medição executada:** compilação direta de `scripts/measure-earth.ts` com esbuild e execução Node,
  viewport 402×874, `dt=1/60`, seed primária 1337 (A/B/C) e seeds suplementares B 17/29/43/71/101.
  Resultado integral em `docs/reports/EARTH_BALANCE_v0.4.0.md` e `.json`.
- **Resultado:** B venceu 6/6 campanhas, de 813,3 a 825,6 s; na seed 1337, venceu em 822,6 s,
  completou as dez fases e chegou a poder 73. Não houve exaustão do pool. Sub-boss e boss final ainda
  morreram durante a aproximação em todas as seeds B (logo, `BALANCE REVIEW REQUIRED`). As regressões
  aprovadas não indicam defeito mecânico de tiro reto, mira por arrasto, colisão, P10 ou portal; a pendência
  é numérica e pertence ao balanceamento posterior, sem ajuste aplicado nesta etapa.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
