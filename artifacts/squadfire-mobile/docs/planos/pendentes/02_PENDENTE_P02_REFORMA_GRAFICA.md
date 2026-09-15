# P02 — Reforma gráfica e prova visual jogável

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 02.
Status: Pendente. A arte atual é a base de comparação; nenhuma cena nova desta reforma foi produzida.
Dependência de liberação: [P01 — etapa 1](01_EM_ANDAMENTO_P01_PRODUTO_E_ARQUITETURA.md).
Estimativa preliminar: 6–10 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Demonstrar uma melhora radical de aparência e fluidez em uma cena jogável antes de produzir toda a arte.

## Atividades em ordem

- [ ] **P02-01** — Criar guia de arte: materiais, proporções, iluminação, paleta, câmera, silhuetas e referências próprias/licenciadas.
- [ ] **P02-02** — Conceituar logo, intro, soldado azul, P10 vermelho, inimigo e cenário com linguagem visual coerente.
- [ ] **P02-03** — Comparar uma cena aprimorada em Skia/2.5D com prova de 3D real se necessária; manter a mesma densidade e câmera.
- [ ] **P02-04** — Produzir cena de referência com corrida, tiro, chão, horizonte, sombras, portal e inimigos.
- [ ] **P02-05** — Conferir perspectiva, sobreposição, muzzle, projéteis e leitura das ameaças durante movimento.
- [ ] **P02-06** — Medir frame time, memória, temperatura e carregamento em Android/iPhone definidos em P01, incluindo stress.
- [ ] **P02-07** — Registrar tecnologia escolhida, comparação visual e orçamento de assets; liberar produção somente após a prova.

## Direção proposta

Aparência 3D estilizada premium é uma recomendação provisória, não uma escolha confirmada.
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

Próxima ação: Criar a referência visual em P02-01 após fechar P01; produzir apenas uma cena antes de escalar assets.

## Impacto sobre os outros planos

Câmera, spawn e alcance estão relacionados. Comparar a mesma seed e geometria; se mudar distância, velocidade percebida ou área jogável, declarar mudança funcional e remedir P06.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P02 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
