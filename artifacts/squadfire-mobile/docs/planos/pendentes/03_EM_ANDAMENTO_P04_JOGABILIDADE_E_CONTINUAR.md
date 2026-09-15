# P04 — Jogabilidade, controles e retomada

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 03.
Status: Em andamento por base existente: controles, formação, disparos e save de recordes estão implementados. A retomada da partida ainda não existe; nenhum novo item está aprovado só por essa base.
Dependência de liberação: [P02 — etapa 2](02_PENDENTE_P02_REFORMA_GRAFICA.md).
Estimativa preliminar: 4–7 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Garantir resposta ao controle, consistência de combate e retomada sem perda ou duplicação de progresso.

## Atividades em ordem

- [ ] **P04-01** — Auditar toque/mouse, formação, limites, colisão e alinhamento entre nova arte e simulação.
- [ ] **P04-02** — Medir latência do arrasto e tratar troca de dedo, pausas e interrupções do sistema.
- [ ] **P04-03** — Fechar com o usuário a política de Continuar e implementar checkpoint ou snapshot conforme a decisão.
- [ ] **P04-04** — Versionar save, migrar recordes v3 sem inventar uma partida antiga e tratar corrupção/escrita interrompida.
- [ ] **P04-05** — Gravar nos momentos seguros e restaurar pausado, com preparação; encerrar retomada em derrota/vitória.
- [ ] **P04-06** — Definir e emitir eventos elegíveis com IDs de partida/fase/tentativa para evitar reaplicação após restauração; validar contrato em testes. Concessão financeira e inventário serão implementados por P09.
- [ ] **P04-07** — Revalidar P10, transições 9↔10 e 19↔20, perdas, teto de poder e projéteis durante arrasto.

## Retomada pendente de decisão

Proposta: início da fase com estado registrado na entrada. Dados: planeta, fase, seed/estado determinístico,
poder, modificadores, versão de regras, runId, stageAttemptId e referências a consumíveis.
Retomar exatamente no combate também exige inimigos, projéteis, portais, chefes, timers, RNG e scheduler.
As duas alternativas estão planejadas; implementar apenas a escolhida.

## Regras

Pausa congela a simulação e efeitos baseados no tempo de jogo. Retornar do segundo plano não cria outro motor.
Nova partida substitui somente a retomada confirmada, nunca carteira/recordes. Tutorial/dev não produz save elegível.
Consumíveis não podem ser devolvidos pelo reload enquanto o efeito é preservado (contrato de P09).
Revisar propagação de erros de save: o armazenamento atual captura falhas e não basta para prometer gravação bem-sucedida.

## Entrega e aceite

Entregas: Contratos de save, migração, retomada funcional e regressões.

Aceite desta etapa: restauração local consistente, eventos de conclusão não duplicados e controles em 30/60/120 Hz. P09 integra consumíveis reais ao checkpoint; P13 valida a restauração com compras e sincronização.

Validação: Encerrar processo antes/depois da escrita, pausar no boss, restaurar save antigo, repetir fase e RETRY.

## Liberação e conclusão desta etapa

Entrada: Contratos P01 e câmera/tecnologia P02 definidos; política de Continuar escolhida.

Saída: Retomada local e migrações verificadas; encerramento de processo não promete save que falhou; contratos de consumo/recompensa disponíveis para P09.

Próxima ação: Auditar a base existente em P04-01; implementar e testar Continuar antes de habilitá-lo na Home.

## Impacto sobre os outros planos

P04 é dono do checkpoint local; P07 adapta identidade e sincronização; P09 é dono do consumo. Não criar três sistemas concorrentes de gravação.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P04 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
