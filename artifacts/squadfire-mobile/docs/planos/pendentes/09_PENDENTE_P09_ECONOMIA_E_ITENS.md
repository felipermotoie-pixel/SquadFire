# P09 — Economia, moedas e itens de aceleração

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 09.
Status: Pendente. Coins/score por partida não formam carteira confiável nem inventário.
Dependência de liberação: [P07 — etapa 8](08_PENDENTE_P07_CONTAS_BACKEND_E_SINCRONIZACAO.md).
Estimativa preliminar: 4–7 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Projetar recompensas e itens úteis sem tornar a compra necessária para progredir ou inflar o esquadrão.

## Atividades em ordem

- [ ] **P09-01** — Definir fontes/destinos de moeda, recompensas por fase e conquista, XP/patente visual, derrota, repetição e política de recompensas offline. Entregar contratos para P08, sem depender de sua tela.
- [ ] **P09-02** — Implementar carteira com ledger de entradas/saídas e inventário; migrar dados antigos com política explícita.
- [ ] **P09-03** — Especificar item e skin como tipos de catálogo: preço, posse, origem, versão; para consumíveis, definir efeito/duração/ativação/limites/incompatibilidades. Assets das skins serão ligados em P11.
- [ ] **P09-04** — Implementar consumo transacional associado a runId, incluindo falha de início, pausa, checkpoint e encerramento.
- [ ] **P09-05** — Simular ganho e gasto por sessão para iniciante/intermediário/experiente, compradores e não compradores.
- [ ] **P09-06** — Calibrar preços por esforço de jogo e testar combinações para detectar inflação, ciclo de lucro e vantagem excessiva.
- [ ] **P09-07** — Aprovar regras e valores candidatos do catálogo, com relatório de economia/combate. P11 liga assets/direitos de skins e P10 fecha disponibilidade comercial; nada se torna público por este relatório.

## Regras propostas

“Acelerar” significa ajudar a progressão/recompensas; não alterar a velocidade da simulação.
Uma moeda obtida jogando no primeiro catálogo. Moeda premium só se a estratégia de dinheiro real for escolhida.
Sem vender soldados iniciais: toda partida nova começa com um. Cosméticos têm zero impacto em dano, cadência e colisão.
O modo de campanha sem itens deve permanecer viável. Nenhuma energia obrigatória nem caixa aleatória paga é proposta.

## Candidatos a protótipo — valores não aprovados

| Item | Efeito candidato | Duração/limite | Cuidados |
| --- | --- | --- | --- |
| Bônus de créditos | +25% sobre créditos elegíveis da partida | 1 partida; não acumula | Não multiplica saldo comprado nem reembolso |
| Bônus de experiência | +25% de XP de perfil | 1 partida; não acumula | XP muda patente visual, não poder |
| Impulso de dano | +10% de dano efetivo | 30 s de combate; 1 uso/partida | Respeita teto total ×3 e matriz de bosses |
| Escudo de emergência | Absorve um contato comum | 1 uso/partida | Não neutraliza slam de boss; feedback claro |

Prioridade de produção: créditos e XP; itens de combate somente depois do teste de equilíbrio.
No máximo um item de combate equipado na proposta inicial. Evitar vender efeito sem benefício no estado atual (cap já atingido).
Decidir confirmação e momento de consumo antes de integrar: reserva no preparo, confirmação ao iniciar, consumo idempotente,
liberação da reserva se partida falhar antes do início. Repetir checkpoint não duplica item nem duração.

## Precificação e métricas

Preço candidato = ganho mediano líquido por minuto × minutos-alvo de esforço, validado por perfil.
Metas para teste: primeiro consumível em 2–3 fases; primeira skin simples em 3–5 campanhas. Medir também iniciante.
Rejeitar loops em que comprar bônus produz lucro infinito sem jogar/risco. Registrar saldo antes/depois e motivo de cada movimento.
Os atuais coins da run não são uma carteira persistente; não assumir que já existe saldo acumulado confiável.

## Entrega e aceite

Entregas: tabela de economia versionada, regras de XP/recompensas, ledger, inventário, catálogo e testes de consumo. Registros de receita/despesa fazem parte do serviço, sem depender da UI de Shop.

Aceite: Sem saldo negativo ou grant duplicado; todos os itens têm regra clara; baseline gratuito e combinações cumprem P06.

Validação: Replay de compra/consumo, queda de rede, app encerrado, efeitos no cap, derrota/vitória e campanha com cada combinação permitida.

## Liberação e conclusão desta etapa

Entrada: P06 fornece limites e campanha gratuita; P07 fornece usuário/autorização; P04 fornece runId/checkpoint.

Saída: Carteira, inventário, catálogo, XP e recompensas por eventos validados, consumo idempotente e valores candidatos medidos. Perfil e Shop usam esses contratos.

Próxima ação: Definir fontes/destinos de moeda, contrato de XP e eventos de conquista em P09-01 antes de implementar telas de perfil ou compras.

## Impacto sobre os outros planos

P09 é fonte única de saldo, preços, consumo e recompensa. P08 define apresentação e concede pelo contrato; P10 só solicita transações. P11 valida posse pelo mesmo inventário.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P09 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
