# P02-06 — Protocolo de medição em aparelho

Data: 16/09/2026
Status: concluído por aceite explícito do responsável em 17/09/2026; matriz física completa transferida para P13.

## Aparelhos

1. Android 10 ou superior, preferencialmente Android 14 intermediário.
2. iPhone 11 ou superior, iOS 16 ou superior.

Registrar modelo, versão do sistema, build, bateria, modo de energia, perfil gráfico e ambiente.

## Cenários

| Cenário | Duração | Evidência mínima |
| --- | --- | --- |
| Abertura real com 1 P1 | 3 min | FPS/frame time, carregamento e leitura |
| Poder 19 (1 P10 + 9 P1) | 3 min | P10, portal, arrasto e tiros retos |
| Estresse 499/500 | 15 min após aquecimento | p50/p95/p99, frames lentos, memória, temperatura e pool |
| Boss/portal em movimento | 3 min | ameaça, HUD e oclusão pelo dedo |

## Critérios a medir

- Intermediário: 60 FPS, p95 até 20 ms e menos de 1% acima de 33,3 ms.
- Perfil mínimo: 30 FPS estáveis e p95 até 36 ms.
- Registrar p50, p95, p99, percentagem acima de 33,3 ms, memória antes/depois, carregamento e aquecimento.

## Resultado parcial — iPhone / Expo Go (16/09/2026)

Capturas enviadas pelo responsável nesta conversa, sem modelo, versão de iOS, bateria ou build registrados:

| Cenário | Evidência observada | Limite |
| --- | --- | --- |
| Partida normal, poder 3 | 60 FPS; frame 3,1 ms; pico 13,1 ms; simulação 0,62 ms; 0 projéteis descartados | Captura pontual; não mede carregamento, memória ou temperatura. |
| Stress, poder 500 / 300 inimigos | 45 FPS; frame 20,0 ms; pico 41,6 ms; simulação 9,28 ms; 50 visíveis; 0 projéteis descartados | `Overlay ON` desenhava hitboxes e trajetórias; duração não registrada. Não representa custo de produção. |

As capturas comprovam execução em aparelho, fluidez percebida em partida normal e que o cenário de estresse
não esgotou o pool. Elas não comprovam p50/p95/p99, carregamento, memória, temperatura ou comportamento
térmico.

## Otimização de medição — métricas sem geometria (16/09/2026)

**Concluído (código)**: `Metrics` e `Overlay` passaram a ser controles independentes no painel DEV.
`Metrics` desenha os contadores leves já existentes; `Overlay` desenha exclusivamente hitboxes, vetores,
linhas de tiro e labels por entidade. A medição pode manter `Metrics ON` e `Overlay OFF`, evitando cobrar a
geometria de diagnóstico no frame medido. A alteração não toca no motor, spawn, mira, dano, colisão, assets
ou balanceamento.

**Validação executada**: TypeScript aprovado; 67/67 checks de tiro/formação e 19/19 de
fases/portal/persistência aprovados; harness CanvasKit executou as cenas de abertura, estágio, boss e
esquadrão sem falha. O raster CPU continua sendo apenas verificação de renderer, não FPS de aparelho.

## Aceite de P02-06 (17/09/2026)

O responsável aceitou a evidência parcial do iPhone como suficiente para concluir P02-06 e liberar
P02-07. A ausência de métricas completas, modelo/build e validação Android foi registrada como exceção;
não pode ser usada como certificação final de desempenho. P13 deve executar a matriz física Android/iPhone,
incluindo stress térmico, no conteúdo final.
