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

## Linha de Fogo Tática — conteúdo aprovado (16/09/2026)

Implementação pendente; este contrato detalha P05-01/03/04/05/06/07. O ciclo é observar a ameaça,
posicionar a linha de tiro, escolher um benefício, perceber o resultado e aplicar o aprendizado.

| Momento | Decisão ensinada | Evidência esperada |
| --- | --- | --- |
| Fases 1–2 | Alinhar tiros e escolher ganho efetivo | Acerto/miss legíveis; primeira consolidação compreensível |
| Fases 3–4 | Priorizar runner e reposicionar contra coluna blindada | Ameaças apresentadas separadamente antes de combinadas |
| Fase 5 | Alternar esquiva e ponto fraco do sub-boss | Aviso, área segura e abertura visíveis |
| Fases 6–8 | Eliminar suporte que protege outro alvo | Vínculo de proteção visível; efeito cessa ao eliminar suporte |
| Fases 9–10 | Combinar prioridades e enfrentar boss final | Reutilização do aprendizado, sem regra surpresa não ensinada |

- Reutilizar runner e arquétipos existentes onde possível. Coluna blindada e suporte são comportamentos
  a especificar/prototipar, não uma nova coleção de heróis. Definir por ficha: proteção, vulnerabilidade,
  trajetória, aviso, reação possível e condição de término. Validar um comportamento por vez.
- Blindagem e suporte não podem formar proteção circular nem impedir qualquer solução alcançável.
  Prioridades mudam com distância e ameaça; eliminar suporte nem sempre supera evitar contato iminente.
- Bosses: aproximação protegida com escudo visível e impacto bloqueado; escudo desativa ao chegar ao
  ponto de combate. Introduzir janelas de ponto fraco e ataques antecipados que exigem reposicionamento.
  Definir colisores, estados vulneráveis e dano em P05; HP, durações e multiplicadores são candidatos
  medidos em P06. Sem auto-aim, proteção invisível ou aumento oculto de hitbox.
- Ataque e janela vulnerável devem permitir deslocamento até posição válida nos limites reais da formação;
  evitar exigir ocupar uma área de dano inevitável para acertar. Todo boss tem sequência encerrável.
- Portais mantêm os tipos poder, dano e cadência. Exibir ícone/texto e ganho efetivo após caps; substituir
  deterministicamente uma opção sem benefício por alternativa útil. Se nenhum ganho dos tipos for possível,
  omitir o par, sem conceder prêmio alternativo inventado. P06 mede o impacto dessa composição.
- “Mais soldados” não promete “mais linhas de tiro”: 9→10 comprime a formação; 19 continua 1 P10 + 9 P1.
  Não adicionar troca de formação, armas novas ou bônus exclusivo de P10. DPS equivalente não implica
  cobertura de pista idêntica; essa diferença precisa entrar nos testes e na explicação.
- Aceite adicional: testes de escudo sem dano/desativação, acerto/miss no ponto fraco, proteção de suporte
  removida, transição de fase, ausência de portais mortos e padrões determinísticos por seed.
  Testes humanos precisam identificar ameaça e resposta possível. P05 integra dicas/resumos de P03
  usando eventos reais; mantém transições rápidas e vitória terminal na fase 10.

Registro documental: 16/09/2026 — estratégia aprovada pelo responsável e incorporada às atividades acima.
As caixas de implementação permanecem abertas; aceite funcional e humano ainda pendente.

## Ondas de Ruptura — contrato de implementação (16/09/2026)

Planejamento aprovado e atribuído a P05-01/03/04/05/06/07; implementação pendente. `Wave` substitui
`Stage` apenas na linguagem do jogador. `StageConfig`, IDs e saves atuais devem continuar interoperáveis até
que P04 aprove uma migração versionada e testada.

- **P05-01 — composição:** fichar as dez Waves com prévia de 1–2 s, ameaça ensinada, portal útil anterior à
  horda, vanguarda de 20–35% em 1–2 s e blocos restantes legíveis. Wave 5 e Wave 10 mantêm os bosses.
  A composição deve ser determinística por seed para teste e não pode lançar toda a horda no mesmo quadro.
- **P05-03/06 — Formação de Ruptura:** introduzir runner/líder, coluna blindada e suporte em encontros
  separados antes de combiná-los. Vínculo de proteção e núcleo exposto são visíveis; atingir manualmente o
  suporte ou líder correto remove a proteção por janela limitada. Definir trajetória, colisores, término,
  leitura e contrajogo alcançável; não adicionar homing, auto-aim, invulnerabilidade invisível ou dano sem
  colisão.
- **P05-04 — bosses:** Wave 5/10 reaproveitam o aprendizado: aproximação protegida, ponto vulnerável e
  reposicionamento legíveis. Duração, HP, escudo e cadência seguem candidatos para P06, não são decididos
  por este adendo.
- **P05-05/07 — portais e Eco de Comando:** reutilizar a política de ganho efetivo pós-cap antes da horda.
  Emitir eventos mínimos e factuais — portal aplicado, alvo de ruptura eliminado, contato/perda e término —
  para P03 exibir no máximo dois fatos e uma dica derivada deles. O Eco não altera progresso, recompensa ou
  elegibilidade da partida.
- **Aceite adicional:** testes cobrem seed, ordem prévia → portal → vanguarda → blocos, ausência de portal
  morto, acerto/miss no núcleo ou suporte, início/fim da abertura, transição de Wave e RETRY com um soldado.
  P05 revalida mira manual, tiro reto, colisão, formação e representação P10; P06 aceita ritmo e números.

Registro documental: 16/09/2026 — escopo aprovado pelo responsável. Nenhuma Wave, formação, evento ou
alteração de save foi implementada nesta atualização.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
