# SquadFire — ordem oficial de execução

Revisão documental 1.1 · 15/09/2026 · Projeto: `C:\SquadFire\SquadFire`.
Revisão concluída dos 15 documentos pendentes: este guia e 14 planos de execução.
A organização continua com somente `concluidos` e `pendentes`; atividades e evidências ficam nos próprios planos.
O [changelog cronológico](../../changelog/CHANGELOG.md) registra o que foi concluído,
validado, está em andamento e será feito, sem substituir os planos.

## O que seguir agora

**Executar a etapa 01 (P01) primeiro.** Há inventário parcial feito; terminar decisões, contratos,
diagnóstico da campanha com um soldado e preparação de ambientes antes de iniciar a reforma gráfica.
Planos com base já implementada não estão todos liberados simultaneamente.

Seguir o número inicial do arquivo, de 01 a 14. O arquivo 00 é este guia, não uma etapa extra.
Os IDs P01–P14 foram preservados para rastrear referências antigas; **P12 agora ocupa a etapa 04**, por exemplo.
Não usar o número do ID como prioridade. O nome `NN_EM_ANDAMENTO_` indica trabalho parcial,
não aprovação nem liberação automática. `NN_PENDENTE_` indica entrega ainda não iniciada.
Dentro dos planos, `[ ]` significa atividade ainda não aceita; ao terminar, usar `[x] ~~descrição~~` com data/evidência.

## Ordem revisada e ponto de liberação

| Etapa | Plano | Situação verificada | Entrega que permite avançar |
| --- | --- | --- | --- |
| 01 | [P01 — produto e arquitetura](01_EM_ANDAMENTO_P01_PRODUTO_E_ARQUITETURA.md) | Em andamento — prioridade atual | Decisões que afetam contratos registradas; baseline atual medido; contratos versionados; ambiente de teste e caminho de build definidos. |
| 02 | [P02 — reforma grafica](02_PENDENTE_P02_REFORMA_GRAFICA.md) | Pendente | Cena jogável comparada, orçamento de frame/memória registrado, tecnologia escolhida e referência visual aceita. |
| 03 | [P04 — jogabilidade e continuar](03_EM_ANDAMENTO_P04_JOGABILIDADE_E_CONTINUAR.md) | Em andamento — base existente; aguarda sua vez | Retomada local e migrações verificadas; encerramento de processo não promete save que falhou; contratos de consumo/recompensa disponíveis para P09. |
| 04 | [P12 — audio acessibilidade e fluidez](04_PENDENTE_P12_AUDIO_ACESSIBILIDADE_E_FLUIDEZ.md) | Pendente | Serviço de áudio, preferências, acessibilidade e níveis de qualidade funcionam no jogo existente; metas medidas nessa base. |
| 05 | [P03 — abertura home e menus](05_PENDENTE_P03_ABERTURA_HOME_E_MENUS.md) | Pendente | Boot, intro, Home, Jogar/Continuar, Menu, Ajuda e Tutorial funcionam. Destinos de conta, perfil, coleção e Shop têm contratos definidos e liberação controlada. |
| 06 | [P05 — fases cenarios e bosses](06_EM_ANDAMENTO_P05_FASES_CENARIOS_E_BOSSES.md) | Em andamento — base existente; aguarda sua vez | Dez fases e bosses com conteúdo funcional estável, sinais legíveis e transições completas; configuração candidata identificada para P06. |
| 07 | [P06 — balanceamento](07_EM_ANDAMENTO_P06_BALANCEAMENTO.md) | Em andamento — base existente; aguarda sua vez | Campanha gratuita medida e aceita, perfis reproduzíveis e limites documentados para economia. Revalidação final com itens é responsabilidade de P13. |
| 08 | [P07 — contas backend e sincronizacao](08_PENDENTE_P07_CONTAS_BACKEND_E_SINCRONIZACAO.md) | Pendente | Login real, isolamento de contas, migração de convidado e conflito de saves testados em builds de desenvolvimento; backup restaurado. |
| 09 | [P09 — economia e itens](09_PENDENTE_P09_ECONOMIA_E_ITENS.md) | Pendente | Carteira, inventário, catálogo, XP e recompensas por eventos validados, consumo idempotente e valores candidatos medidos. Perfil e Shop usam esses contratos. |
| 10 | [P08 — perfil e conquistas](10_PENDENTE_P08_PERFIL_E_CONQUISTAS.md) | Pendente | Perfil usa dados reais, estatísticas e conquistas não duplicam benefícios; imagem padrão funciona. P11 é responsável por conectar variantes equipadas. |
| 11 | [P11 — skins e colecao](11_PENDENTE_P11_SKINS_E_COLECAO.md) | Pendente | Skins, coleção, prévia e equipar funcionam com direitos concedidos pelo serviço de inventário em ambiente de teste. Valores de combate permanecem idênticos. |
| 12 | [P10 — shop e compras](12_PENDENTE_P10_SHOP_E_COMPRAS.md) | Pendente | Jornada real compra → posse → equipar/usar → partida funciona; duplicações, cancelamentos e reconciliação testados. |
| 13 | [P13 — validacao end to end](13_PENDENTE_P13_VALIDACAO_END_TO_END.md) | Pendente | Jornadas finais passam em aparelhos; desempenho com todas as skins/menus aprovado; balanceamento com itens e beta documentados; zero falha crítica aberta. |
| 14 | [P14 — publicacao e operacao](14_PENDENTE_P14_PUBLICACAO_E_OPERACAO.md) | Pendente | Instalação/atualização verificadas, suporte/recuperação ensaiados e lançamento rastreável. Depois do período inicial, operação contínua tem responsável definido. |

**Sequência:** produto/base → prova gráfica → controles/save → áudio/preferências → abertura/menus →
conteúdo/fases → equilíbrio → contas → economia → perfil → skins → Shop → validação integrada → publicação.

Trabalhar uma etapa por vez. Correção indispensável em uma etapa anterior é tratada ali, revalidada e registrada;
depois retomar a ordem. Uma falha no aceite não é resolvida simplesmente renomeando o documento para concluído.
Serviços externos indisponíveis podem permitir trabalhos locais independentes, mas não liberar o aceite que depende deles.

## Resultado da revisão profunda

| Problema encontrado | Consequência | Correção no plano |
| --- | --- | --- |
| Medições de abertura com 5 soldados após mudança para 1 | Ajustar novos cenários/itens a uma base que não foi medida | P01-08 antecipa diagnóstico e ferramenta; P06 calibra conteúdo final |
| Profile B compara desequilíbrio sem priorizar ganho útil pós-cap | Bot pode escolher portal sem efeito e distorcer conclusões | Revisar em P01-08; reutilizar/revalidar em P06-02 |
| Home/Continuar antes de save real | Botão com promessa que a base não cumpre | P04 antes de P03; P03 só liga retomada válida |
| Configurações e intro exigiam som, mas reprodução vinha quase no fim | Preferências sem efeito e retrabalho de telas | P12 passa à etapa 04; teste térmico final fica em P13 |
| Perfil concedia recompensas antes de carteira/XP | Duas fontes de saldo, regras divergentes | P09 antes de P08; recompensas passam por um serviço único |
| Shop exigia equipar skin antes de Coleção existir | Dependência circular P10/P11 | P11 antes de P10; inventário de teste valida coleção, depois compra real |
| QA/beta precisava build, logs e backup previstos só para publicação | Descoberta tardia de falhas de login e distribuição | Preparação em P01-09/P07; evidências em P13; promoção final em P14 |
| Nome “em andamento” e corpo “execução pendente” | Estado impossível de interpretar | Status com motivo, próxima ação e critério de saída em cada plano |
| Índice/citações referiam acompanhamentos apagados | Instrução impossível de seguir | Conteúdo centralizado neste guia e checklists nos próprios planos |
| Documentos históricos classificados como concluídos têm ressalvas | Falso aceite de bosses/desempenho | Pendências explicitamente atribuídas a P06 e P13; histórico não vale como aprovação atual |

A direção de começar por produto e gráfico era adequada. A ordem intermediária precisava dessas correções.
Não há garantia de impacto zero: a proteção é manter contratos, medir a base e repetir os testes das áreas afetadas.

## O que existe hoje, por evidência

Inspeção de código e documentos em 15/09/2026. **Não foram executados testes do jogo nesta auditoria.**

| Sistema | Evidência local | Conclusão e dono do restante |
| --- | --- | --- |
| Abertura atual | [entrada nativa](../../../app/index.tsx), [entrada web](../../../app/index.web.tsx), [CampaignScreen](../../../components/CampaignScreen.tsx) | Abre tela pré-partida; web espera CanvasKit. P03 cria Boot/intro/Home desacoplado |
| Poder e disparos | [balance.ts](../../../game/balance.ts), [squad-power.ts](../../../game/squad-power.ts), [engine.ts](../../../game/engine.ts) | initialSize=1; 19=1 P10+9 P1; cadência escala poder e dano por bala permanece normal. Base aproveitada em P04/P06 |
| Cor e arte | [SceneRenderer](../../../components/battlefield/SceneRenderer.ts), [visuals](../../../game/visuals.ts) | P10 vermelho existente; nova reforma e skins ainda pendentes em P02/P11 |
| Fases | [stages](../../../game/stages.ts), [scheduler](../../../game/spawn-schedule.ts), [planets](../../../game/planets.ts) | Terra/10 fases/bosses e scheduler existem; conteúdo visual e aceite final continuam P05/P06 |
| Salvamento | [campaign](../../../game/campaign.ts), [modelo de progresso](../../../game/campaign-progress.ts) | Recordes v3; falha de gravação capturada no catch; não há retomada real. P04 resolve |
| Áudio | [audio.ts](../../../game/audio.ts) | Eventos agregados sem reprodução; P12 pendente |
| Conta/Shop | [rotas do servidor](../../../../api-server/src/routes/index.ts), [schema](../../../../../lib/db/src/schema/index.ts) | Apenas health e schema esqueleto; sem produto de login/carteira/Shop implementado |
| Medições | [relatório de abertura](../../reports/OPENING_BALANCE_2026-09-15.md), [measure-earth](../../../scripts/measure-earth.ts) | Relatório declara início antigo=5; código usa SQUAD.initialSize, mas descrição ainda /5 e política B sem filtro útil. P01-08/P06 |
| Testes disponíveis | [fire-system](../../../game/tests/fire-system.test.ts), [stage-system](../../../game/tests/stage-system.test.ts) | Suites existentes, não prova de sucesso atual sem executar |

P01 está em andamento pela auditoria de produto/base; P04 por controles e recordes existentes; P05 por campanha existente;
P06 por ajustes anteriores de dificuldade. Nenhum dos sete itens novos de cada plano foi riscado automaticamente.
P12 continua pendente: existir um barramento de áudio não significa reprodução entregue.

## Decisões a fechar antes do trabalho dependente

| Decisão | Ponto em que é necessária | Proposta para decidir; não aprovação |
| --- | --- | --- |
| Público, idioma e aparelhos mínimo/alvo | P01-02, antes de medir P02 | Português inicial, Android/iPhone identificados e web para testes |
| Direção gráfica e tecnologia | Estilo em P01-03; tecnologia comprovada em P02 | Aparência 3D estilizada premium; comparar Skia aprimorado e alternativa se necessário |
| Política de Continuar | P01-03, antes de schema P04 | Retomar início da fase; ponto exato exige snapshot completo |
| Moeda do jogo ou dinheiro real | P01-03, antes de contratos P07/P09 | Começar com moeda ganha; trilha real condicional em P10 |
| Convidado e sincronização | P01-05, antes de P07 | Entrada local sem login obrigatório; conta para sincronizar/transacionar |
| Recompensas e consumo offline | P01-05, antes de P07/P09 | Jogo gratuito offline; compra/consumo transacionável online; reconciliar ganho offline por regra explícita |
| IDs, provedor e builds internos | P01-09/P07-01 | Definir cedo ambiente/teste e identificar dependências externas |
| Conteúdo e catálogo | P01-04; detalhar em P05/P09/P11 | Terra 10 fases, três conjuntos de cenário e skins iniciais propostas |

Pedidos confirmados: começar com um soldado, grupos completos de dez vermelhos com restos individuais,
melhorar radicalmente gráfico/fluidez, Shop com aceleração, cosméticos, perfil e experiência completa.
Os valores candidatos de itens, preços, probabilidades de conclusão e desempenho ainda precisam medição/aceite.
A ordem acima pode ser seguida com essas decisões registradas nos próprios planos, sem arquivos auxiliares de acompanhamento.

## Donos dos sistemas e integração sem duplicação

| Contrato ou recurso | Dono | Consumidores e obrigação |
| --- | --- | --- |
| Regras, dano, limites e parâmetros | P06, sobre motor existente | P05 declara mudanças funcionais; P09 respeita limites; P11 não muda combate |
| Câmera, geometria de sprite e orçamento de arte | P02 | P04 alinha mira/colisão; P05/P11 produzem dentro do contrato |
| Ciclo da sessão, checkpoint e erro de save local | P04 | P03 navega; P07 sincroniza; P09 referencia consumo |
| Som, preferências e qualidade | P12 | P03 liga configurações; P05/P11 respeitam orçamento; P13 mede conjunto final |
| Navegação | P03 | P07 liga Conta; P08 liga Perfil; P11 liga Coleção; P10 liga Shop |
| Identidade, autorização e dados entre aparelhos | P07 | P08/P09/P10/P11 usam o mesmo usuário |
| Carteira, inventário, XP, recompensa e consumo | P09 | P08 mostra/concede pelo contrato; P10 compra; P11 valida posse |
| Equipamento cosmético | P11 | Home/Perfil renderizam; Shop usa prévia e efeito equipar |
| Transação comercial e estados de compra | P10 | Usa ledger P09; autorização P07; revalidação integrada P13 |
| Evidência final e candidato | P13 | P14 publica o artefato aprovado |

Definir em P01: playerId, runId, stageAttemptId, eventId, checkpointVersion, balanceVersion, catalogVersion,
itemId, skinId e transactionId. Uma repetição de evento não repete benefício. Tutorial/dev permanece inelegível
até a ponta de perfil/carteira. Os nomes exatos são fechados no contrato de implementação.

## Como cada etapa protege o que veio antes

1. Registrar versão/commit ou identificação do estado de trabalho e configuração usada. Há mudanças locais de documentação;
   não descartá-las nem mover tags existentes.
2. Registrar dados ou contrato afetado antes da alteração. Mudar arte não autoriza alterar regras silenciosamente.
3. Executar verificações da área e ao menos abrir → jogar → pausar → retornar na superfície já disponível.
4. Ao mudar camera/spawn/alcance, repetir geometria, colisão e comparação de dificuldade. Ao mudar schema, testar migração,
   falha de escrita e reversão. Ao mudar recompensa, testar evento repetido e duas sessões/dispositivos.
5. Registrar no plano teste executado, resultado e limite. Teste automatizado não substitui avaliação humana de arte/dificuldade.
6. Só riscar a atividade após seu aceite; marcar o plano concluído somente quando todas as entregas do seu escopo passarem.

P01-08 mede antes da reforma; P02 mede a cena; P05 verifica cada fase; P06 calibra campanha; P09 verifica itens;
P11 mede skins; P13 repete tudo integrado. Essas verificações têm objetos diferentes, não são execuções duplicadas sem motivo.

## Quando cada experiência estará demonstrável

| Marco | Última etapa | Experiência |
| --- | --- | --- |
| M1 | 02 | Referência gráfica jogável sobre base diagnosticada |
| M2 | 05 | Logo/intro/Home, tutorial, som, pausa e Continuar locais |
| M3 | 07 | Dez fases com arte/conteúdo novos e equilíbrio-base aceito |
| M4 | 11 | Conta, carteira, perfil e skins equipáveis com concessões de teste/conquista |
| M5 | 12 | Shop integrado: comprar, receber, equipar/consumir e jogar |
| M6 | 13–14 | Candidato validado e distribuição preparada/autorizada |

Na etapa 05, os destinos futuros são identificados como indisponíveis. Os planos donos ativam as ações quando funcionam.
O aplicativo final só é aceito se P13 comprovar todos os destinos reais; nenhum menu simulado conta como entrega final.

## Histórico e ressalvas anteriores

O programa contém agora **100 atividades**: as 98 originais, com descrições e responsabilidades corrigidas,
mais P01-08 (diagnóstico inicial) e P01-09 (preparação técnica antecipada).
Nenhuma implementação foi iniciada nesta revisão. As caixas permanecem abertas porque os novos aceites não foram demonstrados.

A revisão 1.1 substitui a ordem documental 1.0. IDs preservados; nomes físicos seguem a nova etapa.
A organização anterior já retirou acompanhamentos separados com autorização do usuário.
As ressalvas nos registros antigos de `concluidos` não aprovam bosses ou dispositivos hoje:
P06 assume medição de bosses; P13 assume validação integrada em aparelho. Requisitos históricos que contradizem
um soldado inicial, restos individuais ou cadência P10 são substituídos pelos pedidos posteriores e pelo código atual.

## Esforço e próxima ação

A projeção anterior de 63–107 dias úteis é referência preliminar, não prazo validado por esta auditoria.
A antecipação de tarefas não adiciona todo seu esforço de novo: preparação de builds e logs foi redistribuída.
P01-07 deve reestimar o restante após decisões de arte, escopo comercial, aparelhos e resultados do diagnóstico.
Migração de engine, produção artística original ampla e pagamento real exigem estimativa própria quando escolhidos.

**Próxima ação concreta: terminar P01-01 e avançar P01-02–P01-09.**
Não retomar diretamente ajustes numéricos em P06 só porque seu arquivo está em andamento.
Primeiro validar a base com um soldado; o ajuste fino entra após conteúdo/câmera estáveis.
