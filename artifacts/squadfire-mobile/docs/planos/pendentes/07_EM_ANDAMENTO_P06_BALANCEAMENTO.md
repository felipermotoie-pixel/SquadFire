# P06 — Balanceamento de combate com evidências

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 07.
Status: Em andamento por ajustes de crescimento/HP/cadência já existentes. Não há aceite final da dificuldade com um soldado nem dos bosses.
Dependência de liberação: [P05 — etapa 6](06_EM_ANDAMENTO_P05_FASES_CENARIOS_E_BOSSES.md).
Estimativa preliminar: 5–9 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Equilibrar as dez fases com métricas reproduzíveis, testes humanos e limites para itens de aceleração.

## Atividades em ordem

- [ ] **P06-01** — Identificar a configuração candidata após P05 e comparar com o baseline de P01-08; manter 1 soldado inicial e registrar build, regras e seeds. Reutilizar medições só quando configuração e conteúdo forem iguais.
- [ ] **P06-02** — Revalidar o instrumento preparado em P01-08: ganho pós-cap, escolha/aplicação, descrição coerente e contagem de escolhas sem efeito. Estender perfis e corrigir somente diferenças novas; não reimplementar a mesma correção.
- [ ] **P06-03** — Medir campanha sem itens com perfis iniciante, intermediário e experiente, incluindo atraso de reação, erro de mira e escolhas imperfeitas.
- [ ] **P06-04** — Registrar por fase poder de entrada/saída, perdas, acertos, dano efetivo, overkill, tempo, pressão, portais úteis/inúteis e causas de morte.
- [ ] **P06-05** — Ajustar primeiro crescimento e pressão de regulares; depois medir bosses, separando aproximação de tempo de combate no alcance de ataque.
- [ ] **P06-06** — Definir a matriz de itens isolados e combinações, com limites de aceite; executar a revalidação final dos itens reais em P13 após P09–P11.
- [ ] **P06-07** — Realizar rodadas humanas, documentar dados e fechar a configuração somente após critérios de aceite; guardar cada medição antes/depois.

## Modelo e instrumentos

DPS teórico atual = poder × dano-base × modificador de dano × cadência-base × modificador de cadência.
Dano real depende da mira, colisão, overkill, fases sem alvo e distribuição dos tiros. Não equilibrar apenas por DPS teórico.
P10 já escala cadência: não multiplicar dano por dez novamente. Não usar dados antigos de cinco soldados iniciais como baseline atual.

Matriz automatizada: sementes 1337, 17, 29, 43, 71 e 101 para comparação; ampliar para 100 sementes antes do candidato de lançamento.
Executar 30/60/120 Hz para consistência lógica. Controle parado é teste negativo; bot perfeito não representa a dificuldade humana.
Os perfis iniciante/intermediário/experiente são definidos por parâmetros reproduzíveis e validados contra sessões reais.

## Faixas candidatas para calibração

| Métrica | Meta inicial proposta |
| --- | --- |
| Início de partida | Exatamente 1 soldado |
| Poder na entrada da fase 3, priorizando soldados | Mediana 8–16; p90 até 22, sem limite artificial de poder |
| Fases regulares | Mediana de 60–95 s; investigar caudas acima de 120 s |
| Aproximação de boss | 8–12 s, medida separadamente |
| Combate sub-boss / final, perfil intermediário sem item | 8–20 s / 12–30 s após chegada ao hold |
| Primeira fase em teste humano iniciante após tutorial | 80–95% de conclusão na primeira tentativa |
| Campanha inteira com experiência intermediária | Meta a calibrar após piloto; não inventar precisão antes de observar jogadores |
| Teto de poder / pool | Poder ≤500; nenhuma perda de tiro por esgotamento |

Essas faixas são propostas para teste, não resultados observados nem mudanças implementadas.
Piloto: pelo menos 10 participantes com 3 tentativas registradas, reportando contagens e distribuição, sem tratar a amostra como prova estatística definitiva.
O objetivo é desafio gradual; não ajustar HP secretamente ao gasto, ao inventário ou ao desempenho individual.

## Bosses

A implementação histórica não teve aceite final de balanceamento. Revalidar integralmente no estado atual.
Se o boss morrer sistematicamente antes de atacar, comparar alterações de HP, entrada e padrões de ataque.
Escudo de aproximação exige decisão de design, aviso visual e teste; não inserir proteção oculta.

## Aceite de precisão

Cada configuração tem versão e relatório com amostra, perfil, seed e limites da conclusão.
Não existe promessa de equilíbrio perfeito; o processo exige medição, comparação e revisão humana.

## Entrega e aceite

Entregas: Relatórios reproduzíveis, perfis de teste, configuração versionada e matriz de itens.

Aceite: Campanha sem compras viável, crescimento inicial controlado, bosses exercem seu papel e nenhuma regressão numérica relevante.

Validação: Simulações, análise de distribuição, replay das falhas e sessões humanas; gate final repetido em P13.

## Liberação e conclusão desta etapa

Entrada: P05 estabilizado; reutilizar ferramentas e baseline de P01-08, identificando mudanças desde a medição inicial.

Saída: Campanha gratuita medida e aceita, perfis reproduzíveis e limites documentados para economia. Revalidação final com itens é responsabilidade de P13.

Próxima ação: Comparar o conteúdo de P05 com a base P01-08, completar medições humanas e calibrar regulares antes dos bosses.

## Impacto sobre os outros planos

P06 controla números de combate. P09 calibra itens dentro desses limites; qualquer extrapolação reabre P06 antes de vender. Nenhuma regra muda por skin.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P06 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
