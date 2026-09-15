# P08 — Perfil do jogador e conquistas

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 10.
Status: Pendente. Não há perfil completo ou conquistas implementadas.
Dependência de liberação: [P09 — etapa 9](09_PENDENTE_P09_ECONOMIA_E_ITENS.md).
Estimativa preliminar: 3–5 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Criar um perfil atraente que mostre identidade, evolução e coleção com informações reais.

## Atividades em ordem

- [ ] **P08-01** — Criar layout de perfil com personagem equipado, avatar, nickname, título e progresso na Terra.
- [ ] **P08-02** — Modelar estatísticas: partidas, vitórias, fases, precisão quando definida, tempo e melhor resultado elegível.
- [ ] **P08-03** — Implementar apresentação de patente/nível e conquistas sobre o contrato de XP e recompensas de P09, sem bônus ocultos de dano.
- [ ] **P08-04** — Implementar edição de nome/avatar e validação de textos, limites e estados de erro.
- [ ] **P08-05** — Conectar carteira e inventário reais de P09; usar skin padrão e contrato de equipamento. P11 liga as variantes visuais sem reescrever estatísticas.
- [ ] **P08-06** — Conceder conquistas por eventos idempotentes através do serviço de recompensas de P09; validar repetição e checkpoint sem criar saldo paralelo.
- [ ] **P08-07** — Testar perfil vazio, veterano, convidado, offline e conta vinculada; ativar entrada Perfil na Home. P11 testa e conecta skins alternativas.

## Composição proposta

Cabeçalho com avatar/nickname/patente; personagem e skin em destaque; campanha e conquistas abaixo;
atalhos para Coleção, Itens e Conta. Evitar transformar o perfil em uma tabela técnica.

## Definições de estatísticas

Distinguir recorde por tentativa de total acumulado. Precisão = projéteis que acertaram / projéteis válidos disparados,
com regra documentada para múltiplos alvos e futuras armas. Tempo não inclui pausa.
Tutorial/dev não entra em conquistas ou ranking. Saves antigos sem estatística mostram “a partir desta versão”, sem inventar histórico.

## Catálogo inicial proposto

Primeira vitória de fase, primeira formação P10, primeira conclusão da Terra e domínio de esquiva/mira.
Exibir condições e progresso. Eventuais recompensas têm IDs e passam pelo ledger de P09.
Avatares pré-definidos são suficientes na primeira versão; upload de imagem/chat exigiriam moderação adicional.

## Entrega e aceite

Entregas: Perfil, estatísticas definidas, conquistas e editor de identidade.

Aceite: Números conciliam com eventos reais; nenhuma conquista repetida concede recompensa novamente; visual usa a skin padrão; variantes equipadas são integradas e verificadas por P11.

Validação: Repetir evento, reinstalar, sincronizar dois dispositivos e migrar usuário antigo.

## Liberação e conclusão desta etapa

Entrada: P07 entrega identidade e P09 entrega saldo/XP/recompensas; Home P03 oferece destino de navegação.

Saída: Perfil usa dados reais, estatísticas e conquistas não duplicam benefícios; imagem padrão funciona. P11 é responsável por conectar variantes equipadas.

Próxima ação: Montar perfil com dados reais e avatar padrão em P08-01; vincular estatísticas aos eventos elegíveis.

## Impacto sobre os outros planos

P08 não recalcula saldo nem cria um segundo ledger. Skins ainda não produzidas não impedem testar perfil padrão; conexão das variantes ocorre em P11.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P08 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
