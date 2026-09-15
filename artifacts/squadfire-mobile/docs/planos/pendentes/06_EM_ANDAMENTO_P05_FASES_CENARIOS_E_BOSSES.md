# P05 — Fases, cenários, inimigos e bosses

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 06.
Status: Em andamento por base existente: dez fases, scheduler, bosses 5/10 e vitória terminal. Ambientes novos, animações e revisão dos padrões continuam pendentes.
Dependência de liberação: [P03 — etapa 5](05_PENDENTE_P03_ABERTURA_HOME_E_MENUS.md).
Estimativa preliminar: 6–10 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Produzir uma campanha visualmente variada com ameaças legíveis e progressão de aprendizado.

## Atividades em ordem

- [ ] **P05-01** — Especificar as dez fases: objetivo, cenário, ritmo, grupos, inimigos, pausas e encerramento.
- [ ] **P05-02** — Produzir ambientes modulares, iluminação, materiais, sombras e transições segundo o guia de arte.
- [ ] **P05-03** — Produzir animações de corrida, ataque, acerto e morte; diferenciar arquétipos por silhueta e comportamento.
- [ ] **P05-04** — Desenhar bosses 5/10 com sinais de ataque, janelas de reação e padrões que exijam posicionamento.
- [ ] **P05-05** — Integrar conteúdo e registrar toda mudança funcional; HP/cadência e ajustes numéricos passam por P06.
- [ ] **P05-06** — Auditar horizonte, oclusão, hitboxes, intervalos sem ameaça e concorrência visual com tiros/portais.
- [ ] **P05-07** — Entregar vitória da Terra, resumo e próximo objetivo correspondente ao conteúdo disponível.

## Matriz proposta de ambientes

| Fases | Ambiente | Foco |
| --- | --- | --- |
| 1–2 | Litoral/cidade | Mira e crescimento controlado |
| 3–4 | Acesso industrial | Runners e reposicionamento |
| 5 | Portão industrial | Sub-boss e leitura de ataques |
| 6–8 | Complexo/fortaleza | Combinação dos arquétipos |
| 9–10 | Fortaleza | Desafio final e encerramento |

São três conjuntos visuais reutilizáveis, não novos planetas. A matriz é proposta, não arte já produzida.
Decoração não cria colisão invisível. Alterações de pista que afetem movimento exigem regras e testes próprios.
Assets devem ter escala/pivô padronizados, origem/licença e versões de qualidade.
HP nunca depende do poder ou do gasto do jogador; dificuldade deriva de regras públicas e conteúdo.

## Entrega e aceite

Entregas: Dez fichas de fase, ambientes, personagens, bosses e biblioteca de assets.

Aceite: Campanha completa e legível; nenhuma fase depende de compra; arte respeita orçamento de P02.

Validação: Cada fase isolada, campanha inteira, aspectos de tela e sincronização entre aviso de ataque e colisão.

## Liberação e conclusão desta etapa

Entrada: P02 aprova assets/câmera; P04 entrega ciclo de partida; P12/P03 fornecem preferências e fluxo local.

Saída: Dez fases e bosses com conteúdo funcional estável, sinais legíveis e transições completas; configuração candidata identificada para P06.

Próxima ação: Detalhar as fichas das dez fases em P05-01 aproveitando a campanha existente; não refazer o scheduler sem necessidade demonstrada.

## Impacto sobre os outros planos

Mudanças de geometria, ataque e spawn alteram pressão e invalidam números antigos. Congelar comportamento antes do ajuste fino em P06; usar o diagnóstico P01-08 como referência.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P05 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
