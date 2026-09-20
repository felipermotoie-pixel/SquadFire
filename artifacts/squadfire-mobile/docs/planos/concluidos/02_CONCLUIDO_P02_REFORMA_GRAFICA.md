# P02 — Reforma gráfica e prova visual jogável

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 02.
Status: Concluído em 18/09/2026. P02-01 a P02-07 têm evidência registrada; a matriz física completa
foi transferida para P13 pela exceção documentada de P02-06. A arte atual permanece como baseline de comparação.
Dependência de liberação: [P01 — etapa 1](../concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md).
Estimativa preliminar: 6–10 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Demonstrar uma melhora radical de aparência e fluidez em uma cena jogável antes de produzir toda a arte.

## Atividades em ordem

- [x] ~~**P02-01** — Criar guia de arte: materiais, proporções, iluminação, paleta, câmera, silhuetas e referências próprias/licenciadas.~~
- [x] ~~**P02-02** — Conceituar logo, intro, soldado azul, P10 vermelho, inimigo e cenário com linguagem visual coerente.~~
- [x] ~~**P02-03** — Comparar uma cena aprimorada em Skia/2.5D com prova de 3D real se necessária; manter a mesma densidade e câmera.~~
- [x] ~~**P02-04** — Produzir cena de referência com corrida, tiro, chão, horizonte, sombras, portal e inimigos.~~
- [x] ~~**P02-05** — Conferir perspectiva, sobreposição, muzzle, projéteis e leitura das ameaças durante movimento.~~
- [x] ~~**P02-06** — Medir frame time, memória, temperatura e carregamento em Android/iPhone definidos em P01, incluindo stress.~~
- [x] ~~**P02-07** — Registrar tecnologia escolhida, comparação visual e orçamento de assets; liberar produção somente após a prova.~~

## Direção proposta

Aparência 3D estilizada premium foi aprovada em P01-03; a prova de qualidade e fluidez ainda está pendente.
Melhorar personagens, animações, cenário, materiais e iluminação; adicionar partículas sozinho não resolve a qualidade.
P10 continua vermelho e recebe sinal de força adicional por forma/ícone, evitando depender só da cor.

## Tecnologia

Se Skia/2.5D satisfizer arte e desempenho, produzir assets novos mantendo a base. Se 3D real for necessário,
comparar integração no Expo com uma engine de jogo em experimento limitado. Migração exige plano adicional de
portabilidade e regressão; não está autorizada implicitamente por esta proposta visual.
P03 e produção final de P05 aguardam a decisão.

## Metas propostas, ainda não medidas

Aparelho intermediário: 60 FPS, frame time p95 até 20 ms e menos de 1% de frames acima de 33,3 ms.
Perfil mínimo: 30 FPS estáveis, p95 até 36 ms. Testar 15 minutos após aquecimento e cenas de poder 499/500.
Cenário atual de stress pode chegar a 58 soldados visíveis e 2500 tiros/s. FPS médio isolado não aprova fluidez.
Medir GPU/dispositivo; renderização CPU offline não substitui essas evidências.

## Entrega e aceite

Entregas: Guia de arte, storyboard, cena real, capturas comparativas e decisão técnica.

Aceite: Referência visual aceita e metas em aparelhos-alvo verificadas antes da produção em escala.

Validação: Comparação com o jogo atual, leitura de alvos/portais, stress e teste térmico.

## Liberação e conclusão desta etapa

Entrada: P01 aprovado, incluindo baseline e dispositivos-alvo. Estudo visual pode ocorrer sem alterar a campanha atual.

Saída: Cena jogável comparada, orçamento de frame/memória registrado, tecnologia escolhida e referência visual aceita.

Próxima ação: iniciar P04 — jogabilidade e Continuar. A matriz Android/iPhone completa, incluindo
térmica, permanece pendente para P13 e não bloqueia mais P02 pela exceção explícita do responsável em 17/09/2026.

## Impacto sobre os outros planos

Câmera, spawn e alcance estão relacionados. Comparar a mesma seed e geometria; se mudar distância, velocidade percebida ou área jogável, declarar mudança funcional e remedir P06.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P02 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Direção aprovada — Linha de Fogo Tática (16/09/2026)

Requisito de produto aprovado; execução e aceite visual pendentes. Integra P02-01/02/04/05/07.

- Criar uma linguagem visual para identificar ameaça rápida, coluna blindada e suporte protetor por
  silhueta, movimento e marcador, inclusive sem distinguir cores. P10 aliado vermelho deve continuar
  distinguível dos inimigos pela posição, forma e símbolo.
- Hierarquia da cena: perigo iminente e área segura; alvo vulnerável; escolha de portal; efeitos decorativos.
  Escudo de aproximação, impacto bloqueado, desativação e ponto fraco exposto precisam de estados distintos.
- P10 mantém o poder de fogo de dez P1; animação, som e rastro comunicam consolidação sem sugerir
  dano extra ou criar um feixe contínuo que esconda inimigos.
- A prova de P02 usa o combate existente e estudos visuais identificados para estados futuros de P05.
  Conceitos de blindagem/ponto fraco não contam como mecânica implementada nem autorizam alterar colisão.
- Aceite adicional: comparar capturas e cena em movimento nas telas-alvo, com efeitos reduzidos;
  confirmar leitura de P1/P10/inimigo, portais e perigo sem oclusão pelo HUD ou pelo dedo.
  Registrar confusões e corrigir antes de produzir a biblioteca inteira.

Registro documental: 16/09/2026 — estratégia aprovada pelo responsável e incorporada às atividades acima.
As caixas de implementação permanecem abertas; aceite funcional e humano ainda pendente.

## Registro de P02-01

16/09/2026 — **Concluído (guia documental)**: [`VISUAL_DIRECTION.md`](../../VISUAL_DIRECTION.md)
foi consolidado como guia oficial da prova visual. Ele fixa câmera e geometria atuais, materiais,
iluminação, paleta, leitura por silhueta, P10, portais, VFX, estudos visuais futuros e regra de
referências próprias/licenciadas. Não houve mudança de código, asset, renderizador, colisão,
balanceamento ou tecnologia.

**Validação executada**: revisão cruzada com `game/camera.ts`, `game/visuals.ts`,
`docs/ASSET_PIPELINE.md` e este plano; `git diff --check` e links Markdown locais aprovados após a
edição. A aceitação humana da cena, desempenho em aparelho e produção de assets continuam
pendentes em P02-06 e P02-07.

## Registro de P02-02

16/09/2026 — **Concluído (conceito visual)**: a prancha
[`P02-02_CONCEITOS_VISUAIS_2026-09-16.md`](../../concepts/P02-02_CONCEITOS_VISUAIS_2026-09-16.md)
registrou marca abstrata, intro, P1 azul, P10 vermelho, inimigos e cenário/boss em linguagem
coerente com o guia. A imagem é estudo interno, não asset integrado.

**Validação executada**: inspeção manual da prancha e revisão de `VISUAL_DIRECTION.md`,
`docs/ASSET_PIPELINE.md`, `game/visuals.ts` e `game/squad-power.ts`. O P10 conceitual foi
explicitamente limitado para não alterar sua escala, representação ou DPS em runtime. Não houve
teste de gameplay, aparelho ou desempenho; esses aceites permanecem nas atividades seguintes.

**Próxima ação**: P02-06 mede a prova nos aparelhos físicos; P02-07 fecha tecnologia e orçamento
somente após essa evidência.

## Registro de P02-03 a P02-05

16/09/2026 — **Concluído (prova local)**: a decisão
[`P02-03_SKIA_2_5D_DECISION_2026-09-16.md`](../../reports/P02-03_SKIA_2_5D_DECISION_2026-09-16.md)
mantém Skia/2.5D. A alternativa 3D não foi aberta porque o renderer real preserva câmera,
densidade, perspectiva, muzzle e trajetória; a escolha final permanece em P02-07.

16/09/2026 — **Concluído (cena de referência)**: `SceneRenderer` passou a desenhar um chevron
branco no P10, no mesmo transform do sprite, e `render-preview.ts` ganhou o cenário
`27-p02-reference-power-019`. A evidência
[`P02-04-reference-power-019-2026-09-16.png`](../../concepts/P02-04-reference-power-019-2026-09-16.png)
combina poder 19, estrada, horizonte, sombras, projéteis, inimigos e portal sem mudar a campanha.

16/09/2026 — **Concluído (validação local)**:
[`P02-05_VALIDACAO_VISUAL_2026-09-16.md`](../../reports/P02-05_VALIDACAO_VISUAL_2026-09-16.md)
registra inspeção da cena, TypeScript aprovado, 67/67 checks de tiro/formação e 19/19 de
fases/portal/persistência. O cenário local não substitui toque, GPU, memória, temperatura ou
compreensão em aparelho.

## Histórico de P02-06 antes do aceite — bloqueio de evidência física

16/09/2026 — Protocolo preparado em
[`P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md`](../../reports/P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md).
Naquela sessão não havia Android/iPhone físico detectado; por isso frame time, memória, temperatura e
carregamento ainda não haviam sido medidos e P02-06/P02-07 permaneciam abertos naquele momento.

16/09/2026 — **Correção necessária para medição móvel**: relato no Expo Go indicou
`Attempted to access a disposed object` em `drawPicture`. A causa inspecionada foi o descarte manual
do `SkPicture` anterior em `Battlefield.tsx` antes da apresentação assíncrona pelo mapper nativo.
O descarte prematuro foi removido; o `PictureRecorder` continua descartado após produzir o quadro.
TypeScript, 67/67 testes de tiro/formação, 19/19 de fases/portal/persistência e harness local foram
aprovados após a correção. Confirmação no aparelho permanece obrigatória e não conclui P02-06 por si só.

16/09/2026 — **Concluído (otimização de medição)**: o renderer separou `Metrics` de `Overlay`.
Os contadores de FPS/frame/simulação podem permanecer visíveis sem desenhar hitboxes, vetores,
trajetórias e labels por entidade. Essa remoção é relevante no cenário P499/P500, no qual o overlay
anterior elevava artificialmente o custo de renderização. Não foram alterados motor, regras de combate,
spawn, câmera, assets, P10 ou números de balanceamento.

**Evidência física parcial**: capturas do iPhone no Expo Go mostraram partida normal em 60 FPS
(frame 3,1 ms; pico 13,1 ms; simulação 0,62 ms) e stress P500/300 em 45 FPS com `Overlay ON`
(frame 20,0 ms; pico 41,6 ms; simulação 9,28 ms; sem projéteis descartados). O segundo caso não é
aceite final porque incluía a geometria de diagnóstico e não teve duração, memória ou temperatura registradas.

**Validação executada**: TypeScript; 67/67 checks de tiro/formação; 19/19 de
fases/portal/persistência; e harness CanvasKit com cenas de abertura, estágio, boss e esquadrão.

## Registro de P02-06

17/09/2026 — **Concluído por aceite do responsável**: a medição parcial no iPhone/Expo Go foi aceita
como evidência suficiente para esta prova gráfica. O cenário normal registrou 60 FPS, frame 3,1 ms,
pico 13,1 ms e simulação 0,62 ms; o stress P500/300 registrou 45 FPS, frame 20,0 ms, pico 41,6 ms,
simulação 9,28 ms e zero projéteis descartados. A separação de `Metrics` e `Overlay` foi concluída antes
do aceite para remover a geometria diagnóstica das próximas leituras.

**Limite registrado**: modelo/build do iPhone, p50/p95/p99, memória, carregamento, temperatura e
validação Android não foram fornecidos. Esta é uma exceção aprovada para liberar P02-07, não uma
certificação de desempenho multiplataforma. P13 deve repetir a matriz física final em Android e iPhone.
Detalhes no [protocolo P02-06](../../reports/P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md).

## Registro de P02-07

18/09/2026 — **Concluído (decisão técnica)**: Skia/2.5D foi aprovado como tecnologia de produção da
campanha inicial. A comparação preserva a câmera, a geometria, a mira manual, o muzzle e os tiros retos;
não há falha visual ou física aceita que justifique uma migração para 3D. O orçamento aprovado limita a
cena de batalha a 4 MiB comprimidos / 16 MiB de texturas decodificadas e o runtime total a 16 MiB
comprimidos. Atlas fica condicionado a gargalo de draw calls medido com arte final.

**Validação documental executada**: inventário real de assets de runtime (3,31 MiB, dos quais 1,04 MiB
da cena), revisão de `Battlefield`, `SceneRenderer`, `VISUAL_DIRECTION.md`, `ASSET_PIPELINE.md` e das
evidências P02-03/05/06. Nenhum asset, regra de jogo ou configuração de renderer foi alterado nesta atividade.
Decisão e limites completos em [P02-07](../../reports/P02-07_DECISAO_TECNOLOGIA_E_ORCAMENTO_DE_ASSETS_2026-09-18.md).

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
