# P01 — Produto, escopo e arquitetura

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 01.
Status: Concluído em 16/09/2026: decisões, contratos, baseline, identificação e caminho de export registrados; limites de build instalável e validação física foram encaminhados às etapas donas.
Dependência de liberação: nenhuma; início do programa.
Estimativa preliminar: 2–3 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Definir uma versão completa e finita, com contratos comuns para arte, gameplay, contas e loja.

## Atividades em ordem

- [x] ~~**P01-01** — Inventariar código, saves, arte, testes e relatórios; registrar a base sem perder mudanças locais.~~
- [x] ~~**P01-02** — Definir público, Android/iPhone mínimo e alvo, idioma, sessão esperada e acessibilidade.~~
- [x] ~~**P01-03** — Resolver direção artística, política de Continuar e inclusão de dinheiro real na primeira versão.~~
- [x] ~~**P01-04** — Fixar escopo de lançamento: Terra com dez fases, abertura/Home, tutorial, perfil, contas, loja, itens, skins e áudio.~~
- [x] ~~**P01-05** — Desenhar fronteiras entre motor de combate, renderização, navegação, persistência, perfil, economia e backend.~~
- [x] ~~**P01-06** — Definir IDs e versões para jogador, partida, checkpoint, catálogo, item, skin, transação e balanceamento.~~
- [x] ~~**P01-07** — Registrar responsáveis, critérios de aceite e projeção de esforço ajustada às decisões.~~

- [x] ~~**P01-08** — Preparar a medição inicial antes da reforma: revisar o ganho pós-cap do Profile B, usar SQUAD.initialSize no código e na descrição, verificar escolha/aplicação do portal e registrar campanha com 1 soldado, seeds fixas e código identificado. Executar regressões de combate/fases/tipos na base; separar falhas numéricas de defeitos mecânicos. Reaproveitar o instrumento em P06, sem duplicar implementação.~~
- [x] ~~**P01-09** — Definir IDs do app, ambiente interno, caminho de build Android/iOS/web, interfaces de logs/eventos e artefatos de teste. Conferir cedo acesso a aparelhos/contas e compilar a base atual no alvo disponível. P02 usa esse caminho para sua cena; P07 acrescenta login real. Não esperar P14.~~

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

Próxima etapa: P02-01, criando o guia de arte para a prova visual em Skia/2.5D. A implementação de conta, pagamento, build instalável e teste em aparelho permanece nas etapas donas.

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

### 15/09/2026 — P01-02 concluído: público, plataformas e sessão inicial

- **Público e interação:** lançamento voltado a jogadores casuais de celular, em retrato, com toque e
  mira por arrasto como controle prioritário. A web permanece funcional para teste/demonstração, sem
  compromisso de distribuição comercial no primeiro lançamento.
- **Idiomas:** português do Brasil é o único idioma inicial. Nenhuma tradução foi declarada entregue;
  localização estruturada será planejada quando houver conteúdo/telas finais para localizar.
- **Matriz inicial:** Android mínimo 10 (API 29), com Android 14 ou superior em aparelho intermediário
  moderno como alvo de validação; iOS mínimo 16, com iPhone 11 ou posterior como alvo. iPad não faz
  parte do lançamento inicial. O `app.json` atual já é retrato e declara `supportsTablet: false`; IDs,
  builds e validação física pertencem a P01-09/P13 e ainda não foram executados.
- **Sessão:** primeira partida local, como convidado e offline, sem login obrigatório. Conta passa a ser
  necessária somente nos fluxos futuros de sincronização e transações, sob P07/P10.
- **Acessibilidade inicial:** labels para menus/HUD, contraste legível, opção de reduzir tremor e haptics
  opcionais. Não se declara o combate totalmente compatível com leitor de tela até testes com usuários;
  áudio, preferências e validação de acessibilidade pertencem a P12/P13.
- **Evidência:** decisão explícita do responsável em 15/09/2026; inspeção anterior de `app.json`,
  `components/GameScreen.tsx`, `components/CampaignScreen.tsx` e `docs/TEST_PLAN.md`. Não houve
  alteração de código, assets, números de balanceamento ou configurações de build nesta atividade.

### 15/09/2026 — P01-03 concluído: direção, Continuar e modelo comercial

- **Direção artística:** 3D estilizado premium, com silhuetas e contraste priorizados para leitura em
  celular. P1 permanece azul; P10 permanece vermelho e deve ter forma/ícone adicional para não depender
  apenas da cor. Cenário, iluminação e profundidade devem ser cinematográficos sem buscar realismo pesado.
  P02 valida a referência visual; nenhuma arte nova ou tecnologia foi entregue por esta decisão.
- **Tecnologia:** Skia/2.5D continua como padrão da prova visual P02. Uma prova limitada de 3D real só
  será considerada se a cena de referência não atender simultaneamente qualidade e fluidez nos aparelhos
  definidos; nenhuma migração de engine está autorizada implicitamente.
- **Continuar:** checkpoint no início da fase atual, restaurado pausado, com planeta/fase, seed ou estado
  determinístico, poder, modificadores, versões e IDs de sessão registrados na entrada. Não restaurar
  inimigos, tiros, portais ou timers no meio do combate. P04 é o único dono de implementar, versionar,
  testar corrupção/interrupção e garantir que recompensas não sejam duplicadas.
- **Modelo comercial:** primeira versão usa apenas moeda obtida jogando; dinheiro real fica fora do
  lançamento inicial. Conta, carteira, inventário, catálogo, itens e Shop permanecem nos planos P07/P09/
  P10, e qualquer trilha de pagamento exige decisão futura, backend e validação de segurança próprios.
- **Evidência:** decisão explícita do responsável em 15/09/2026, fundamentada nos planos P02, P04, P09
  e P10. Não houve alteração de código, balanceamento, assets, save ou configuração comercial nesta atividade.

### 16/09/2026 — P01-04 concluído: escopo de lançamento e UX

- **Conteúdo:** a versão completa inicial inclui somente Terra (dez fases), Boot/Home, tutorial, pausa,
  Continuar, áudio, perfil, conta, coleção, itens e Shop com moeda conquistada jogando. Os três cenários
  internos da Terra são litoral/cidade, área industrial e fortaleza; o próximo planeta é sinalizado como
  expansão indisponível, não conteúdo jogável.
- **UI:** Home oferece apenas ações realmente disponíveis. Durante a implementação incremental, destinos
  futuros exibem indisponibilidade clara; na entrega final, nenhum destino do escopo pode ser simulado ou
  terminar sem função. Jogar deve manter prioridade visual e exigir no máximo duas ações para iniciar.
- **Fora do escopo inicial:** multiplayer, chat, ranking público, anúncios, energia obrigatória, loot boxes
  pagas e armas com atributos diferentes. Cosméticos não alteram combate; dinheiro real permanece adiado
  conforme P01-03.

### 16/09/2026 — P01-05 concluído: fronteiras de sistemas

- **Motor:** única fonte de regras para mira, tiro reto, colisão, dano, portais, fases, bosses e limites.
  Renderizador apenas lê e desenha o estado; UI apresenta estado e encaminha intenção de toque, sem decidir
  regras ou conceder efeitos.
- **Sessão e persistência:** navegação abre, pausa, retoma e encerra sessões; persistência local é dona de
  recordes e checkpoint; backend futuro é dono de identidade, sincronização, autorização de posse e
  transações. Não haverá sistemas concorrentes de save.
- **Economia:** perfil, carteira, inventário e Shop consomem eventos idempotentes da sessão e serviços
  próprios. Não recalculam combate, não manipulam saldo diretamente e não concedem recompensa por reabrir
  checkpoint ou interface.

### 16/09/2026 — P01-06 concluído: contratos de identidade, versão e elegibilidade

- **IDs obrigatórios:** `playerId`, `runId`, `stageAttemptId`, `eventId`, `checkpointVersion`,
  `balanceVersion`, `catalogVersion`, `itemId`, `skinId` e `transactionId`. São strings opacas, estáveis,
  nunca reutilizadas; formato e geração concreta serão definidos pelo serviço dono antes da implementação.
- **Versões:** checkpoint, balanceamento e catálogo acompanham sessão, checkpoint e eventos relevantes.
  Restauração incompatível é recusada com mensagem clara e preserva dados recuperáveis; nunca é adaptada
  silenciosamente. Migrações explícitas pertencem ao dono do dado.
- **Elegibilidade:** tutorial, debug, presets, saltos de fase e hooks de teste tornam a sessão inelegível
  para progresso, conquistas, moeda e inventário. A marca segue a run até o encerramento.

### 16/09/2026 — P01-07 concluído: responsabilidades, aceite e projeção

- **Donos:** P02 arte/câmera; P04 controles/checkpoint; P12 áudio, preferências e fluidez; P03 navegação;
  P05 conteúdo; P06 balanceamento; P07 identidade; P09 economia; P08 perfil; P11 skins; P10 Shop; P13
  validação integrada; P14 publicação. Cada etapa altera somente o contrato sob sua responsabilidade e
  revalida dependências afetadas.
- **Aceite de P01:** exige decisões e contratos registrados, baseline atual medido, versões/IDs definidos
  e P01-09 com ambiente interno, caminho de build Android/iOS/web e artefatos de teste identificados.
  Não exige que sistemas futuros estejam implementados.
- **Estimativa registrada:** P01-09 e o fechamento documental/técnico foram estimados em 2–4 dias úteis,
  excluindo espera por aparelhos físicos, contas Apple/Google ou serviços externos. É referência de
  planejamento, não prazo contratado.
- **Evidência:** aprovação explícita do responsável em 16/09/2026, após leitura dos planos P02–P12 e dos
  contratos atuais. Esta atividade é documental: nenhum código, asset, regra de combate ou integração
  externa foi alterada.

### 16/09/2026 — P01-09 concluído: identificação, build e evidência técnica

- **IDs definidos:** `android.package` e `ios.bundleIdentifier` são `com.feinmach.squadfire`;
  o scheme existente permanece `squadfire-mobile`. Estes identificadores são de distribuição e não
  alteram o nome visível `SquadFire Mobile`.
- **Ambiente e caminhos de build:** desenvolvimento local usa Expo SDK 57. Exports verificáveis são
  `expo export --platform android`, `expo export --platform ios` e `expo export --platform web`.
  O script `pnpm run build` é específico do deploy estático/Replit e exige domínio configurado; não é
  caminho de APK/AAB/IPA. Não existe `eas.json`; build instalável requer configuração EAS e contas das
  lojas em P07/P14, sem credenciais registradas neste repositório.
- **Eventos/logs e artefatos:** eventos de sessão usam os IDs P01-06 e incluem início/fim de run,
  início/clear de fase, portal aplicado, boss, checkpoint, erro de save e estado de elegibilidade.
  Evidência automatizada fica em `game/tests/`, `docs/reports/` e `docs/TEST_PLAN.md`; exports locais
  são descartáveis em `tmp/` e não substituem teste de dispositivo.
- **Validação executada:** exports Android, iOS e web concluídos com sucesso em 16/09/2026. Antes da
  definição dos IDs, a inspeção não encontrou `android.package`, `ios.bundleIdentifier` ou `eas.json`;
  também não detectou `adb`/`eas` nem aparelho anexado. Logo, bundle/export foi validado, mas APK/AAB/IPA,
  login de loja e teste físico continuam pendentes, sem alegação de entrega.

## Registro da revisão

16/09/2026 — adendo de produto aprovado pelo responsável: Linha de Fogo Tática passa a orientar
arte/UI/conteúdo. Inclui prioridade de ameaças, coluna blindada e suporte, bosses com escudo de aproximação
e janelas de ponto fraco, escolhas de portal com ganho efetivo e resumo de aprendizado.
O detalhamento e os aceites foram atribuídos a P02/P04/P12/P03/P05/P06/P13 no
[plano geral](../pendentes/00_EM_ANDAMENTO_PLANO_GERAL_DO_APLICATIVO.md).
Este adendo registra a decisão posterior ao fechamento de P01; não aprova implementação nem invalida
os resultados históricos da baseline, que deverão ser repetidos para o novo conteúdo em P06.
Mantêm-se os contratos de controle, poder, sessão e economia; eventos táticos concretos serão definidos
e testados no plano dono antes de consumo pela UI. Estimativas anteriores exigem revisão por etapa afetada.

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
