# P14 — Publicação, operação e evolução

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 14.
Status: Pendente. Assinatura/ambientes internos são preparados cedo; publicação e operação permanecem nesta última etapa.
Dependência de liberação: [P13 — etapa 13](13_PENDENTE_P13_VALIDACAO_END_TO_END.md).
Estimativa preliminar: 3–5 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Preparar e publicar uma versão rastreável, com suporte, recuperação e caminho sustentável de evolução.

## Atividades em ordem

- [ ] **P14-01** — Auditar IDs, assinatura, ambiente, segredos, URLs, versões e schemas já preparados em P01/P07; reaproveitar exatamente o candidato aprovado em P13.
- [ ] **P14-02** — Preparar ícone, screenshots reais, descrição, classificação etária, dados de privacidade e suporte conforme funcionalidades entregues.
- [ ] **P14-03** — Promover o build interno/beta validado para o canal previsto; repetir smoke de instalação/atualização e registrar identidade do artefato. A primeira disponibilização interna ocorre antes de P13.
- [ ] **P14-04** — Auditar logs/eventos e alertas implementados nas etapas donas desde P01/P07/P09; definir painel, responsável, retenção e resposta operacional.
- [ ] **P14-05** — Ensaiar backup/restore, atendimento a compra não entregue e desativação segura de oferta/item com erro.
- [ ] **P14-06** — Preparar publicação gradual e rollback; enviar às lojas somente com autorização de publicação e contas habilitadas.
- [ ] **P14-07** — Acompanhar a janela inicial definida de lançamento, tratar falhas e entregar operação contínua a responsável; criar planos para evolução sem bloquear eternamente o encerramento desta entrega.

## Operação

Eventos mínimos: abertura, saída do tutorial, início/fim de fase, causa de derrota, falha de save,
compra solicitada/confirmada/negada, consumo e erro de sincronização. Correlacionar por IDs técnicos;
não registrar senha, token de sessão ou comprovante completo em logs comuns.
Metas operacionais candidatas: ≥99,5% sessões sem crash e nenhum caso conhecido de perda de save/débito duplicado.
Definir amostra/janela antes de interpretar percentuais. Contagens pequenas não garantem estabilidade.

Configuração de economia e balanceamento é versionada; partida em andamento mantém a versão com que começou.
Reverter catálogo não deve apagar posse de uma skin legítima. Oferta defeituosa pode ser desativada; compensação passa pelo ledger.
Falha de backend não bloqueia abertura/Home e jogo local permitido. Autenticação/pagamentos externos permanecem dependências reais.

## Publicação

Revisar requisitos atuais das lojas no momento do envio, inclusive login, dados, exclusão de conta e compras digitais.
Planejar revisão de privacidade conforme público e dados efetivamente coletados. Não inserir anúncios/SDKs extras sem necessidade definida.
Arte promocional deve representar o produto entregue. Habilitar uma plataforma apenas quando sua matriz passou.
Prazos de análise de loja, acesso a contas e certificados não são controlados pelo plano.

## Próximas versões

Após estabilização: novos planetas, eventos, skins e desafios, cada qual com produção, economia, QA e migração próprios.
Multiplayer, chat, ranking competitivo, passes, assinaturas e anúncios não fazem parte da versão proposta e exigem planos adicionais
se forem solicitados. Isso mantém a primeira entrega completa e executável.

## Entrega e aceite

Entregas: Pacote de publicação, runbooks, observabilidade, rollback e backlog pós-lançamento.

Aceite: Instalação/atualização verificadas; suporte consegue recuperar falhas; publicação autorizada e rastreável por versão.

Validação: Ensaio de rollout/rollback e restauração; sandbox/interno antes de qualquer compra ou dado de produção.

## Liberação e conclusão desta etapa

Entrada: P13 aprovado, acesso às contas de distribuição e autorização de publicação quando houver envio.

Saída: Instalação/atualização verificadas, suporte/recuperação ensaiados e lançamento rastreável. Depois do período inicial, operação contínua tem responsável definido.

Próxima ação: Após P13, conferir o pacote aprovado e executar distribuição gradual. Definir janela de acompanhamento do lançamento, sem declarar um monitoramento infinito como tarefa concluída.

## Impacto sobre os outros planos

P14 usa build, logs, backups e sandbox já exercitados. Não introduzir infraestrutura nova no candidato aprovado sem revalidar as áreas afetadas.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P14 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
