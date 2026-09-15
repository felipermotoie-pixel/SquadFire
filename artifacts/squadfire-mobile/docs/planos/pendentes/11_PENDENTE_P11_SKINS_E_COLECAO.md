# P11 — Skins, coleção e equipamento visual

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 11.
Status: Pendente. P10 vermelho é uma indicação de poder existente; não é um sistema de skins compráveis.
Dependência de liberação: [P08 — etapa 10](10_PENDENTE_P08_PERFIL_E_CONQUISTAS.md).
Estimativa preliminar: 4–7 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Criar personalização desejável, coerente com o universo do jogo e sem vantagens de combate.

## Atividades em ordem

- [ ] **P11-01** — Especificar catálogo visual inicial e formas de obter cada skin: padrão, conquista, moeda do jogo e eventual compra.
- [ ] **P11-02** — Produzir skins com escala, pivô, arma, muzzle e animações padronizados para soldado comum e P10.
- [ ] **P11-03** — Criar Coleção com filtros de possuído/bloqueado, detalhes, origem de obtenção e prévia.
- [ ] **P11-04** — Implementar Equipar/Desequipar e atualização imediata da prévia no Home e Perfil.
- [ ] **P11-05** — Aplicar skin ao esquadrão e à unidade P10 preservando marcador vermelho de força e leitura de facção.
- [ ] **P11-06** — Persistir equipamento por usuário e validar posse em P09; usar skin padrão quando asset/ID falhar. Integrar Home/Perfil e ativar entrada Coleção.
- [ ] **P11-07** — Comparar combate com todas as skins e medir memória/carregamento; testar obter direito→equipar→jogar com concessão autorizada de teste. A compra comercial completa é validada em P10/P13.

## Catálogo inicial proposto

Uma skin padrão gratuita e três alternativas: uma por conquista, uma por moedas e uma especial cujo canal
será definido na estratégia comercial. Proposta de conjuntos: Reconhecimento, Industrial e Guardião.
O número pode mudar após estimativa de arte em P02; cada expansão exige orçamento de animações e texturas.

## Contrato de cosmético

Skin referencia somente recursos visuais. Não modifica dano, cadência, hitbox, velocidade, capacidade de mira ou contagem de soldados.
Variação de arma é visual no escopo; armas com atributos diferentes são outro sistema e exigiriam novo balanceamento.
A geometria lógica do muzzle é estável; arte que não alinhar com ela precisa correção, não um desvio oculto de tiro.

P10 conserva vermelho e um símbolo/forma de força, mesmo sobre temas cosméticos. P1 e inimigos precisam se distinguir
por posição, silhueta e marcadores, inclusive para quem não diferencia cores. Testar clareza em movimento.
Efeitos cosméticos não podem esconder projéteis de perigo nem extrapolar o orçamento gráfico.

## Entrega e aceite

Entregas: skins, coleção, prévia e equipamento ligados ao inventário; catálogo visual pronto para consumo pelo Shop em P10.

Aceite: Comparação determinística resulta no mesmo combate para qualquer skin; posse e seleção sobrevivem à troca de aparelho.

Validação: skin removida de catálogo, asset ausente, logout, troca no Home, bloqueio de troca durante sessão conforme contrato, soldado P10 e stress com a skin mais pesada. Direitos de teste ficam isolados de produção.

## Liberação e conclusão desta etapa

Entrada: P02 fornece contratos de assets; P07/P09 fornecem identidade e posse; P08 fornece perfil.

Saída: Skins, coleção, prévia e equipar funcionam com direitos concedidos pelo serviço de inventário em ambiente de teste. Valores de combate permanecem idênticos.

Próxima ação: Especificar catálogo visual e produzir skins compatíveis antes de colocar produtos definitivos no Shop.

## Impacto sobre os outros planos

P11 não exige Shop pronto. P10 testa a aquisição comercial depois; P13 refaz a jornada completa. Equipar durante combate só se contrato explícito; proposta padrão: trocar no Home para a próxima sessão.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P11 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
