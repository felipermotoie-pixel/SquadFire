# P13 — Qualidade, regressões e validação end to end

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 13.
Status: Pendente. Testes antigos existem, mas não aprovam recursos ainda ausentes ou o candidato completo.
Dependência de liberação: [P10 — etapa 12](12_PENDENTE_P10_SHOP_E_COMPRAS.md).
Estimativa preliminar: 6–10 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Provar que todos os recursos funcionam juntos, desde a abertura até retomada, compras, perfil e encerramento.

## Atividades em ordem

- [ ] **P13-01** — Consolidar matriz de casos por plataforma, versão de save, tipo de conta e conectividade.
- [ ] **P13-02** — Completar e executar regressões de combate, migração, autorização, ledger, compras, inventário e recompensas já criadas pelos planos donos; cobrir lacunas sem adiar testes locais até esta etapa.
- [ ] **P13-03** — Executar jornadas completas da matriz abaixo com dados e builds de teste isolados.
- [ ] **P13-04** — Repetir balanceamento da campanha gratuita e todas as combinações permitidas de itens na arte final.
- [ ] **P13-05** — Testar Android/iPhone/web no build interno existente, falhas de rede, encerramento e retomada; repetir metas P02/P12 com skins/loja finais, 15 minutos térmicos e 30 ciclos de menus.
- [ ] **P13-06** — Realizar beta com jogadores e coletar dificuldades, leitura visual, entendimento da loja e falhas de interação.
- [ ] **P13-07** — Corrigir regressões com seus planos donos e produzir candidato versionado. Ensaiar restauração e atualização, conferir evidências por plataforma e plano de reversão antes de P14.

## Jornadas completas obrigatórias

| Caso | Sequência | Resultado verificável |
| --- | --- | --- |
| Primeiro acesso | Instalar → logo → intro → Home → tutorial → Jogar | Um soldado, treino sem progresso real |
| Continuidade | Jogar → pausar → fechar processo → abrir → Continuar | Estado conforme política, sem prêmio repetido |
| Cosmético | Criar conta → obter moeda → comprar skin → equipar → jogar → reabrir | Aparência persiste, atributos iguais |
| Consumível | Comprar → inventário → preparar → iniciar → pausar/retomar → terminar | Efeito e consumo corretos uma vez |
| Conta | Convidado → login → aparelho B → sincronizar → logout | Progresso correto e isolamento por usuário |
| Compra falha | Confirmar → perder rede → reconectar → repetir retorno | Nenhum débito/grant duplicado |
| Final | Concluir fase 10 → resumo → Home | Vitória/recompensa única; nenhuma fase 11 inexistente |
| Menus | Home → cada menu → ação → voltar | Sem caminhos mortos, foco e estado preservados |
| Pagamento real, se incluído | Sandbox → pendente/sucesso/reembolso/restauração | Direitos conciliados com backend |

## Critérios de saída

Zero defeitos abertos que impeçam jogar, causem perda de save, vazem dados ou corrompam compra/saldo.
Demais defeitos têm severidade, responsável e decisão de inclusão; não ocultar pendência como “concluído”.
Arte, desempenho e dificuldade precisam validação humana, além de testes automatizados.
Baseline dos testes antigos é evidência histórica; executar no candidato final.
Dados de teste/dev não chegam a saldos e recordes de produção.

## Entrega e aceite

Entregas: Relatório de QA, evidências por plataforma, resultados de beta e candidato versionado.

Aceite: Todas as jornadas do escopo passam; P06 e P09 revalidados; nenhuma falha crítica aberta.

Validação: Testes automatizados e dispositivos reais, com builds assinados para login/pagamentos; repetir somente áreas afetadas por correções.

## Liberação e conclusão desta etapa

Entrada: Todas as entregas de P01–P12 no escopo atual integradas; build interno e ambientes preparados desde P01/P07.

Saída: Jornadas finais passam em aparelhos; desempenho com todas as skins/menus aprovado; balanceamento com itens e beta documentados; zero falha crítica aberta.

Próxima ação: Consolidar evidências já produzidas e executar a matriz final; não começar a criação de builds ou a instrumentação somente aqui.

## Impacto sobre os outros planos

QA ocorre em cada etapa. P13 concentra a prova integrada: falha em compra volta a P09/P10, save a P04/P07, arte a P02/P05/P11, equilíbrio a P06/P09.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P13 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
