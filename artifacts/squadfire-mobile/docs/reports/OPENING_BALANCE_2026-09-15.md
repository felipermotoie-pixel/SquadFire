# Ajuste de dificuldade — 15/09/2026

**Decisão posterior do usuário:** partidas novas e RETRY agora começam com **1 soldado**.
As medições abaixo foram feitas antes dessa decisão, com 5 soldados iniciais; suas faixas de
progressão não representam a nova abertura com um soldado.

Pedido: reduzir o crescimento excessivo do esquadrão e aumentar gradualmente a dificuldade,
mantendo a primeira fase acessível. Alterações aplicadas em `game/balance.ts`, `game/engine.ts`
e `game/stages.ts`. O agrupamento em unidades vermelhas de dez permanece ativo.

## Alterações

| Parâmetro | Antes | Agora |
| --- | --- | --- |
| Intervalo entre pares de portais | 12 s | 18 s |
| Ganhos de soldados disponíveis | +3 / +4 / +5 | +1 / +2 / +3 |
| Portal de cadência | ×1,25 | ×1,15 |
| Portais de dano | ×1,5 / ×2 | ×1,2 / ×1,3 |

O primeiro portal continua surgindo aos 9 segundos. Os limites de modificadores, o poder máximo,
o dano e a cadência básicos da arma permanecem iguais. Os valores dos portais são usados tanto
na exibição quanto na aplicação do efeito. Todos os estágios usam o novo ritmo de melhorias.

| Fase | HP anterior → atual | Velocidade anterior → atual |
| --- | --- | --- |
| 1 | 20 → 20 | 1,00 → 1,15 |
| 2 | 30 → 45 | 1,02 → 1,40 |
| 3 | 40 → 75 | 1,04 → 1,65 |
| 4 | 50 → 95 | 1,06 → 1,75 |
| 5 | 50 → 110 | 1,07 → 1,80 |
| 6 | 60 → 130 | 1,08 → 1,85 |
| 7 | 70 → 150 | 1,10 → 1,90 |
| 8 | 80 → 175 | 1,12 → 1,95 |
| 9 | 100 → 200 | 1,14 → 2,00 |
| 10 | 120 → 230 | 1,15 → 2,05 |

Velocidade é o multiplicador da velocidade própria de cada tipo de inimigo.
A progressão das fases posteriores foi ajustada para evitar queda de resistência/velocidade após a fase 3.
Quantidade de inimigos, janelas de surgimento e HP dos bosses não foram alterados.

## Medições executadas

Simulação determinística do motor real a 60 Hz, sementes 1337, 17 e 29, iniciando na fase 1 com poder 5.
O script `scripts/measure-opening.ts` compara três comportamentos:

- `squad`: mira no inimigo mais próximo e prioriza portais de soldados.
- `damage`: mesma mira, mas escolhe o maior dano teórico por segundo após os limites dos modificadores.
- `idle`: permanece no centro, sem mirar nem escolher intencionalmente os portais.

Portais e colisões são processados pelo motor; não há concessão artificial de soldados nem limpeza de inimigos.

| Poder ao concluir a fase, priorizando soldados | Antes | Depois |
| --- | --- | --- |
| 1 | 18–22 | 8–12 |
| 2 / entrada na fase 3 | 41–45 | 15–17 |
| 3 | 67–69 | 21–25 |

Com escolha pelo maior dano teórico, o poder no fim da fase 3 passou de 43–50 para 11–13.
As seis simulações ativas completaram a abertura antes e depois. Após o ajuste, o comportamento parado
perdeu na fase 1 nas três sementes; antes conseguia concluir a abertura em uma delas.

Também foram executadas as dez fases nas mesmas sementes. As seis simulações ativas chegaram à vitória:
813,2–845,6 segundos até o último evento de conclusão, poder final 74–94, zero esgotamentos de projéteis.

## Validação e limites

- Verificação de tipos aprovada.
- 67/67 verificações de combate e formação aprovadas.
- 19/19 verificações de fases, portais e persistência aprovadas.
- Os bots ativos usam mira ideal e não sofreram perdas; isso confirma viabilidade, não dificuldade humana ideal.
- As medições desta alteração não certificam os antigos critérios específicos de tempo de combate dos bosses.
- A sensação de dificuldade e o desempenho no celular ainda precisam de teste manual.

Dados: `opening-before-2026-09-15.json`, `opening-after-2026-09-15.json` e `campaign-after-2026-09-15.json`.
Para repetir, compile `scripts/measure-opening.ts` com esbuild e execute com Node.
`OPENING_REPORT` define o arquivo JSON; `MEASURE_LAST_STAGE=10` amplia a medição para a campanha completa
(padrão: 3). As escolhas aleatórias podem variar conforme as ações do jogador; as faixas acima são resultados
das sementes testadas, não limites artificiais de soldados.

## Como testar

Atualize o navegador com Ctrl+F5 e inicie uma nova partida para testar a progressão desde o começo.
Observe o tamanho do esquadrão ao entrar na fase 3, a necessidade de reposicionar a mira e as escolhas
entre mais soldados e melhorias da arma. Uma partida antiga não serve para comparar o crescimento inicial.
