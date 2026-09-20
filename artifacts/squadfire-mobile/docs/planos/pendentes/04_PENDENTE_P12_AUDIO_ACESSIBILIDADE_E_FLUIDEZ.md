# P12 — Áudio, acessibilidade e base de fluidez

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 04.
Status: Pendente. Existe um agregador de eventos de áudio, mas ele ainda não reproduz sons.
Dependência de liberação: [P04 — etapa 3](03_EM_ANDAMENTO_P04_JOGABILIDADE_E_CONTINUAR.md).
Estimativa preliminar: 4–7 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Entregar áudio, preferências e orçamento de fluidez antes dos menus. P13 valida o desempenho com todos os sistemas e assets finais integrados.

## Atividades em ordem

- [ ] **P12-01** — Integrar reprodução de música e efeitos usando o barramento de áudio existente; limitar sons simultâneos sem mudar tiros lógicos.
- [ ] **P12-02** — Produzir/selecionar sons licenciados para intro, UI, arma, impacto, portais, boss, derrota e vitória.
- [ ] **P12-03** — Implementar mixagem e volume separados, mudo, interrupções, vibração e persistência das preferências.
- [ ] **P12-04** — Entregar movimento reduzido, redução de flashes, contraste, áreas de toque e sinalização além da cor.
- [ ] **P12-05** — Medir memória/CPU/GPU/frame time no ciclo de partida disponível e pior caso 499/500; entregar roteiro reutilizável para P05/P11 e medição integrada final em P13.
- [ ] **P12-06** — Criar níveis de qualidade visual ajustando partículas, sombras, resolução e decoração, sem alterar regras de jogo.
- [ ] **P12-07** — Eliminar travamentos de carregamento, vazamentos e aquecimento excessivo; registrar relatório nos aparelhos-alvo.

## Áudio e feedback

Atualmente game/audio.ts agrega eventos, mas a reprodução não está conectada. Não declarar áudio pronto por haver esse arquivo.
Uma unidade P10 não deve gerar volume dez vezes maior. Prioridade sonora para ameaça, acerto e interação;
limitar vozes simultâneas e evitar saturação. Voltar do segundo plano não duplica música.
No navegador, tratar necessidade de interação antes do som; intro continua normalmente se áudio não puder iniciar.

## Fluidez

Nesta etapa, repetir metas de P02 durante 15 minutos de gameplay com o conteúdo disponível. Em P13, repetir com conteúdo final, cargas de rede/loja e 30 ciclos Home↔partida↔Shop.
Registrar p50/p95/p99 de frame time, picos de memória, dispositivo/SO, qualidade e temperatura/queda de desempenho.
HUD não deve provocar reconstrução integral da cena por tiro. Qualidade baixa reduz estética, jamais quantidade de inimigos,
hitboxes ou cadência. Testes offline de imagens são evidência visual, não FPS de celular.

## Acessibilidade

Botões com rótulos e foco; alvo de toque ≥48 unidades de layout, texto legível e ampliação onde aplicável.
Cor complementada por texto/ícone/silhueta. Movimentos de câmera e flashes configuráveis.
Não prometer acessibilidade total do combate sem testar com usuários; documentar o suporte real.

## Entrega e aceite

Entregas: Áudio funcional, preferências, perfis gráficos e relatório de desempenho/acessibilidade.

Aceite desta etapa: metas P02 medidas na base disponível; serviço de som e preferências funcional; perfis de qualidade sem mudança de regras. Aceite no conteúdo final, skins e menus completos pertence a P13.

Validação: Aparelhos mínimo/alvo, fone/alto-falante, interrupções, offline, menus repetidos e stress prolongado.

## Liberação e conclusão desta etapa

Entrada: Guia de arte P02 e ciclo de pausa/retomada P04 definidos.

Saída: Serviço de áudio, preferências, acessibilidade e níveis de qualidade funcionam no jogo existente; metas medidas nessa base.

Próxima ação: Conectar áudio e preferências ao jogo atual, preparar sons de UI/intro e verificar interrupções antes de construir as configurações em P03.

## Impacto sobre os outros planos

Menus posteriores consomem o mesmo serviço de preferências. P05/P11 respeitam os orçamentos; P13 mede o conteúdo final e as 30 transições de menus.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P12 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Feedback tático e fluidez (16/09/2026)

Planejamento aprovado, integrado a P12-01/02/04/05/06; implementação pendente.

- Priorizar aviso de ataque, escudo desativado, impacto válido e portal aplicado sobre disparos repetidos.
  Todo aviso sonoro essencial tem equivalente visual; vibração opcional não é requisito para sobreviver.
- Distinguir impacto em proteção de acerto em alvo vulnerável. Consolidar P10 com feedback curto,
  sem multiplicar volume pela cadência ou ocultar os avisos seguintes.
- Qualidade reduzida mantém telegráficos, limites de perigo e ponto fraco legíveis.
  Repetir orçamento térmico/frames com estados finais de P05 em P13; a prova atual não aprova efeitos futuros.

Registro documental: 16/09/2026 — estratégia aprovada pelo responsável e incorporada às atividades acima.
As caixas de implementação permanecem abertas; aceite funcional e humano ainda pendente.

## Sinais de Wave e ruptura (16/09/2026)

Planejamento aprovado, integrado a P12-01/02/04/05/06; P05 implementa os eventos e P06 mede a leitura.

- Priorizar quatro sinais curtos: prévia da Wave, portal útil aplicado, vínculo/proteção rompido e abertura
  encerrada. Cada um tem forma, ícone, contraste e/ou texto breve equivalente; nenhum depende só de cor,
  áudio ou vibração.
- O Eco de Comando usa o mesmo vocabulário factual do combate e não cria alerta persistente. Som e haptic
  são opcionais e respeitam volume, mudo, interrupção e movimento reduzido.
- Qualidade reduzida preserva prévia, alvo vinculado, núcleo e abertura; pode reduzir partículas, sombras,
  rastros e decoração. P12-05/P13 medem o pior caso de vanguarda e blocos sem o overlay de depuração para
  evitar que a própria ferramenta seja tratada como desempenho de produção.

Registro documental: 16/09/2026 — nenhum som, efeito, preferência ou medição nova foi executado nesta atualização.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
