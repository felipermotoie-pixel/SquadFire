# Acompanhamento — planos v0.4.0 de planetas e engenharia

Planos associados:

- [Planetas, fases e compressão](2026-09-11_v0.4.0_planetas-fases-compressao_v1.0.md)
- [Plano principal de engenharia](2026-09-11_v0.4.0_plano-engenharia-principal_v1.0.md)

Situação: entregas principais concluídas no histórico da v0.4.0; o balanceamento dos bosses
não recebeu aprovação final. Esta é a razão de a entrega estar classificada como concluída com ressalva.

## Atividades verificadas

- [x] ~~Criar planeta Earth com dez fases fixas.~~
- [x] ~~Usar contagem e HP absolutos por fase, com scheduler determinístico.~~
- [x] ~~Implementar spawn no horizonte e profundidade de combate derivada da câmera.~~
- [x] ~~Adicionar sub-boss na fase 5 e boss final na fase 10, com vitória terminal.~~
- [x] ~~Criar Squad Power, limite de 500, formação limitada e reconciliação de roster.~~
- [x] ~~Adicionar save de campanha v3, migração e gravação serializada.~~
- [x] ~~Adicionar testes de fases, formação, colisão, portais e relatório de medição.~~
- [x] ~~Adicionar tela pré-partida, HUD por planeta/fase e resumo de conclusão.~~
- [x] ~~Preservar tiro reto, mira horizontal manual e dano por colisão.~~

## Alterações posteriores registradas

- [x] ~~Corrigir a representação de resto: 19 = uma unidade P10 vermelha e nove unidades P1 azuis.~~
- [x] ~~Fazer P10 disparar na cadência equivalente a dez soldados, com dano normal por projétil.~~
- [x] ~~Ajustar progressão local de portais e inimigos; novas partidas começam com um soldado.~~

## Ressalvas pendentes

- [~] Boss da fase 5: implementação existe, mas a janela final de combate ainda precisa de nova medição após os ajustes posteriores de cadência, portais e um soldado inicial.
- [~] Boss da fase 10: implementação existe, mas a janela final de combate ainda precisa de nova medição após os ajustes posteriores de cadência, portais e um soldado inicial.
- [ ] Validação manual em Expo Go/dispositivo físico para desempenho alto, entrada de boss e persistência após fechamento.

Evidências: `PROJECT_STATE.md`, `docs/reports/EARTH_BALANCE_v0.4.0.md`,
`docs/reports/OPENING_BALANCE_2026-09-15.md`, testes de combate e fases.
