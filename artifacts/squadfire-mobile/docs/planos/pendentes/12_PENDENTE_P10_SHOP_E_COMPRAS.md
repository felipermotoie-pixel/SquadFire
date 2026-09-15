# P10 — Shop, catálogo e compras

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 12.
Status: Pendente. Não há compra, carteira ou catálogo comercial funcionais hoje.
Dependência de liberação: [P11 — etapa 11](11_PENDENTE_P11_SKINS_E_COLECAO.md).
Estimativa preliminar: 5–9 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Entregar uma loja compreensível e confiável, da descoberta do item até sua posse e uso.

## Atividades em ordem

- [ ] **P10-01** — Criar categorias Itens e Skins, cards, detalhes, prévia, saldo, propriedade e estados de disponibilidade.
- [ ] **P10-02** — Integrar catálogo versionado e preço validado no servidor; detalhar efeito/duração/limites antes da confirmação.
- [ ] **P10-03** — Implementar compra com moeda do jogo como transação atômica: débito e concessão juntos, com chave de idempotência.
- [ ] **P10-04** — Implementar histórico de compras, item já possuído, saldo insuficiente, oferta retirada e falha após confirmação.
- [ ] **P10-05** — Se dinheiro real entrar no escopo inicial, configurar produtos Apple/Google e validar transação no backend antes de conceder benefício.
- [ ] **P10-06** — Testar compra pendente/cancelada, restauração de direitos aplicáveis, reembolso/revogação e reinício do app durante compra.
- [ ] **P10-07** — Integrar compra→inventário→equipar/usar→partida→resultado com P09/P11 prontos; reconciliar eventos e ativar Shop na Home somente para produtos válidos.

## Experiência

Home → Shop → categoria → detalhe com prévia e preço → confirmação → adquirido → Usar/Equipar.
Cancelar não debita. Duplo toque não compra duas vezes por acidente. Item vendido permanece no inventário se sair do catálogo,
salvo revogação legítima. Skin já possuída mostra Equipar, não Comprar.
Sem urgência fictícia, benefício ambíguo ou compra acionada por toque no personagem durante combate.

## Dinheiro real: trilha condicional planejada

A escolha entre só moeda de jogo e dinheiro real na primeira versão foi enviada ao usuário.
O plano inclui ambas, mas não presume autorização para contratar, cobrar ou publicar produtos.
Se habilitado: produtos consumíveis para itens, direitos duráveis para skins, preços localizados fornecidos pela loja,
transação vinculada ao usuário, validação de recibo/token e processamento idempotente de notificações.
Usar StoreKit/IAP e Play Billing como integração proposta, revendo requisitos de região/canal na publicação.

Consumíveis já gastos não são “restaurados” como uma skin permanente. Reembolsos/revogações atualizam direitos com
política explícita e evitam conceder repetidamente o mesmo recibo. Compras pendentes não liberam item.
Base técnica: [Apple In-App Purchase](https://developer.apple.com/in-app-purchase/) e
[validação segura no Play Billing](https://developer.android.com/google/play/billing/security).

Dinheiro real acrescenta estimativa de 5–10 dias de engenharia/teste à faixa-base, além de esperas externas.
Sem dinheiro real, concluir compra/consumo com moeda do jogo e registrar esta trilha como adiada, não como implementada.

## Entrega e aceite

Entregas: Shop funcional, histórico, contratos de compra e integração de pagamentos se escolhida.

Aceite: Comprar uma vez debita/concede uma vez; recibo inválido não concede; cancelamento e erro não perdem saldo.

Validação: Sandbox das lojas para dinheiro real; testes concorrentes de carteira, produto removido, app fechado e dois dispositivos.

## Liberação e conclusão desta etapa

Entrada: Conta P07, economia P09, perfil P08, coleção/equipar P11 disponíveis; estratégia de dinheiro real definida.

Saída: Jornada real compra → posse → equipar/usar → partida funciona; duplicações, cancelamentos e reconciliação testados.

Próxima ação: Conectar o catálogo de P09 à prévia de P11 e testar transações antes de liberar entrada Shop no Home.

## Impacto sobre os outros planos

Shop usa serviços existentes, nunca grava saldo diretamente. Só publicar itens/skins cujos efeitos/assets passaram. Trilha de dinheiro real é condicional, registrada como fora de escopo se não escolhida.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P10 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
