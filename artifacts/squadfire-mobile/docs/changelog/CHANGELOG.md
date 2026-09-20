# SquadFire — Changelog

Registro cronológico único das alterações do produto. Atualizado em 18/09/2026.

Este arquivo diferencia fatos concluídos de trabalho em andamento e planejado:

- **Concluído**: código, documento ou configuração alterado e evidência registrada.
- **Validado**: verificação executada e resultado documentado.
- **Em andamento**: implementação iniciada, ainda sem aceite final.
- **Planejado**: escopo aprovado para execução futura; não é funcionalidade entregue.

Os planos detalham tarefas, dependências e critérios de aceite. O changelog registra o
resultado após cada marco relevante; não deve ser usado para declarar uma funcionalidade
como concluída sem evidência.

## Em andamento

### 18/09/2026 — P02 concluído: Skia/2.5D e orçamento de assets

- **Concluído (decisão técnica)**: Skia/2.5D foi aprovado para a campanha inicial. A prova preserva
  câmera, mira manual, muzzle, tiros retos e a geometria existente; 3D não oferece benefício comprovado
  que justifique recriar esses contratos.
- **Concluído (orçamento)**: cena de batalha até 4 MiB comprimidos / 16 MiB de texturas decodificadas;
  runtime total até 16 MiB comprimidos. O inventário atual mede 3,31 MiB em runtime, dos quais 1,04 MiB
  pertencem à cena de batalha. Atlas só será considerado diante de gargalo de draw calls medido com arte final.
- **Limite preservado**: não houve asset final novo, migração de engine, alteração de gameplay,
  balanceamento, Shop, contas ou saves. P13 continua responsável pela matriz física completa Android/iPhone.

Evidência: [decisão P02-07](../reports/P02-07_DECISAO_TECNOLOGIA_E_ORCAMENTO_DE_ASSETS_2026-09-18.md) e
[plano P02](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md).

### 17/09/2026 — P02-06 aceita com evidência do iPhone

- **Concluído por aceite do responsável**: a prova física no iPhone/Expo Go foi aceita para P02-06.
  As capturas registradas mostram 60 FPS em cenário normal e 45 FPS no stress P500/300 antes da separação
  de `Metrics` e `Overlay`; não houve projéteis descartados no cenário de stress.
- **Exceção registrada**: modelo/build do iPhone, p50/p95/p99, memória, carregamento, temperatura e
  Android não foram medidos. Isso libera somente P02-07; não é certificação multiplataforma. P13 deverá
  repetir a matriz física final em Android/iPhone, com conteúdo e efeitos finais.

Evidência: [protocolo P02-06](../reports/P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md) e
[plano P02](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md).

### 16/09/2026 — P02-06: medição sem geometria de depuração

- **Concluído (código)**: `Metrics` e `Overlay` do painel DEV são independentes. O primeiro mostra os
  contadores de desempenho; o segundo desenha hitboxes, trajetórias, vetores e labels de diagnóstico.
  Assim, o cenário P499/P500 pode ser observado com métricas sem cobrar a geometria por entidade no frame.
- **Preservado**: simulação, mira manual, tiros retos, colisão, spawn, formação, P10, assets e
  balanceamento não foram alterados.
- **Validado localmente**: TypeScript; 67/67 checks de tiro/formação; 19/19 de fases/portal/persistência;
  e harness CanvasKit de renderização aprovados. O comando `pnpm` não foi usado para validar porque tentou
  reconciliar dependências sem TTY; os binários já instalados foram executados sem modificar o ambiente.
- **Evidência física parcial**: capturas de iPhone/Expo Go mostram 60 FPS em cenário normal e 45 FPS no
  stress P500/300 com `Overlay ON`. Este último não é número de produção; a comparação com `Metrics ON` e
  `Overlay OFF` permanece pendente.

Evidência: [protocolo P02-06](../reports/P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md) e
[plano P02](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md).

### 16/09/2026 — Direção Ondas de Ruptura aprovada

- **Concluído (documentação)**: os planos geral, P03, P05, P06, P12 e P13 receberam o contrato de
  `WAVE 1/10`: prévia curta, portal útil antecipado, vanguarda rápida, blocos legíveis, Formação de Ruptura
  e Eco de Comando factual.
- **Planejado**: P05 implementará as Waves sem trocar IDs/saves técnicos sem migração aprovada por P04; P03
  ensina e mostra o Eco; P12 preserva sinais; P06 mede estratégia/ritmo; P13 valida a jornada integrada.
- **Limites preservados**: nenhum código, asset, teste, número de balanceamento, save, Shop ou conta foi
  alterado. Tiros retos, mira manual, colisão, nova partida/RETRY com um soldado, regra P10 e a política de
  portal com ganho efetivo permanecem requisitos de aceite, não funcionalidades declaradas prontas.

Evidência: [plano geral](../planos/pendentes/00_EM_ANDAMENTO_PLANO_GERAL_DO_APLICATIVO.md) e planos
[P03](../planos/pendentes/05_PENDENTE_P03_ABERTURA_HOME_E_MENUS.md),
[P05](../planos/pendentes/06_EM_ANDAMENTO_P05_FASES_CENARIOS_E_BOSSES.md),
[P06](../planos/pendentes/07_EM_ANDAMENTO_P06_BALANCEAMENTO.md),
[P12](../planos/pendentes/04_PENDENTE_P12_AUDIO_ACESSIBILIDADE_E_FLUIDEZ.md) e
[P13](../planos/pendentes/13_PENDENTE_P13_VALIDACAO_END_TO_END.md).

### 16/09/2026 — Correção de estabilidade Skia para Expo Go

- **Concluído (código)**: `Battlefield.tsx` não descarta mais o `SkPicture` anterior depois de
  publicá-lo em um shared value. O mapper nativo do React Native Skia pode desenhar esse objeto de
  modo assíncrono; descartá-lo causava `Attempted to access a disposed object` em `drawPicture`.
- **Preservado**: simulação, câmera, tiros, assets, regras de P10 e renderer de cena não foram
  alterados. O `PictureRecorder` temporário continua sendo descartado após cada quadro.
- **Validado localmente**: TypeScript, 67/67 testes de tiro/formação, 19/19 de fases/portal/persistência
  e harness de renderização passaram após a correção.
- **Pendente**: validação em Expo Go/aparelho físico e medição P02-06; o erro original ocorre no
  mapper nativo e não pode ser aprovado apenas pelo harness Node.

Evidência: diagnóstico do erro em aparelho e [host do battlefield](../../components/battlefield/Battlefield.tsx).

### 16/09/2026 — P02-01: guia de arte da prova visual

- **Concluído (documentação)**: `docs/VISUAL_DIRECTION.md` foi consolidado como guia oficial de
  P02-01. Ele define materiais, proporções, iluminação, paleta, câmera, silhuetas, P10, portais,
  VFX e referências próprias/licenciadas para a prova visual.
- **Preservado**: câmera, geometria, mira manual, tiros retos, colisão, P10 = dez P1 e números de
  balanceamento não foram alterados. Estados de blindagem, suporte, escudo e ponto fraco são apenas
  estudos de arte para P05.
- **Validado**: revisão cruzada dos contratos de câmera, visuais e pipeline de assets; `git diff
  --check` e links Markdown locais aprovados e registrados no plano.
- **Pendente**: conceitos, cena jogável, leitura humana em movimento, medição em aparelhos e decisão
  técnica continuam atribuídos a P02-02 até P02-07.

Evidência: [guia de arte](../VISUAL_DIRECTION.md) e [plano P02](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md).

### 16/09/2026 — P02-02: conceitos visuais da prova gráfica

- **Concluído (conceito)**: prancha interna criou a linguagem comum para marca abstrata, intro,
  P1, P10, ameaças, cenário e boss. Ela é uma referência de produção, não um asset de runtime.
- **Preservado**: o P10 vermelho não ganhou dano, tamanho de colisão, escala de runtime ou poder
  adicional. Estudos de escudo, suporte, blindagem e ponto fraco não implementam mecânicas.
- **Validado**: inspeção visual manual e revisão dos contratos de direção visual, pipeline, P10 e
  representação. Não houve teste de gameplay ou desempenho, pois a entrega é conceitual.

Evidência: [conceitos P02-02](../concepts/P02-02_CONCEITOS_VISUAIS_2026-09-16.md) e
[plano P02](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md).

### 16/09/2026 — P02-03 a P02-05: prova Skia/2.5D e cena de referência

- **Concluído**: Skia/2.5D foi mantido para a prova visual. Não foi aberta prova 3D porque a base
  real preserva câmera, densidade, mira manual, muzzle e trajetória reta; decisão final depende de
  medição em aparelho e continua com P02-07.
- **Concluído**: `SceneRenderer` recebeu somente um chevron branco de leitura no P10, aplicado no
  transform do sprite. `render-preview.ts` recebeu cenário local de referência com poder 19,
  inimigos e portal. Não houve mudança de motor, colisão, formação, cadência, dano ou balanceamento.
- **Validado**: TypeScript, 67/67 testes de tiro/formação e 19/19 testes de fases/portal/persistência
  aprovados; cena real inspecionada no harness. O raster CPU não foi usado como FPS de aplicativo.
- **Em andamento**: P02-06 tem protocolo preparado, mas não há aparelho Android/iPhone físico nesta
  sessão. Frame time, memória, temperatura e carregamento continuam sem medição; P02-06/P02-07 não
  têm aceite final.

Evidências: [decisão técnica](../reports/P02-03_SKIA_2_5D_DECISION_2026-09-16.md),
[cena de referência](../concepts/P02-04-reference-power-019-2026-09-16.png),
[validação visual](../reports/P02-05_VALIDACAO_VISUAL_2026-09-16.md) e
[protocolo físico](../reports/P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md).

### 16/09/2026 — Estratégia Linha de Fogo Tática aprovada

- **Concluído (documentação)**: plano geral, adendo P01 e planos P02/P04/P12/P03/P05/P06/P13
  ajustados após aprovação do responsável. Ordem preservada e aceites atribuídos a cada dono.
- **Planejado**: prioridade por mira manual; runner, coluna blindada e suporte protetor; bosses com
  escudo visível na aproximação e ponto fraco exposto; portais com ganho efetivo após caps.
- **Planejado**: tutorial progressivo, feedback P10, resumo breve com fatos e dica, UI que facilita
  jogar/continuar. Engajamento será avaliado por aprendizado, clareza, diversão e vontade espontânea de repetir.
- **Limites**: nenhuma mecânica, número de balanceamento ou asset alterado. Evidência de diversão,
  gameplay e desempenho continua pendente dos testes descritos nos planos. Faixas de esforço serão
  reavaliadas nas etapas afetadas pelo conteúdo ampliado.

Direção e responsáveis: [plano geral](../planos/pendentes/00_EM_ANDAMENTO_PLANO_GERAL_DO_APLICATIVO.md).

Validação documental executada: `git diff --check` aprovado e links locais dos dez documentos
alterados conferidos, sem destinos ausentes. Testes de gameplay não foram executados nesta revisão
exclusivamente documental; alterações locais anteriores foram preservadas.

### 15/09/2026 — P01: inventário e baseline medido com um soldado

- **Concluído**: P01-01 inventariou a base real no commit `0fef40f`, saves v3/migrações, assets,
  suítes, relatórios e estado local inicial limpo.
- **Validado**: execução sequencial direta aprovou 67/67 checks de tiro/formação, 19/19 de
  fases/portais/persistência e TypeScript. A tentativa inicial via pnpm falhou antes dos testes por
  `EEXIST`/`EBUSY` no registro de workspace; nenhuma dependência foi reinstalada.
- **Concluído**: Profile B do harness passou a evitar portal sem efeito quando existe ganho aplicável;
  entre ganhos efetivos usa maior DPS, menor desequilíbrio e desempate fixo. A política registra sua
  justificativa no relatório bruto e possui guardas executadas para os dois casos críticos.
- **Validado**: campanha Terra com início em 1 soldado foi medida em 6 seeds fixas. Profile B venceu
  todas, mas os dois bosses continuam morrendo durante a aproximação; o resultado permanece
  `BALANCE REVIEW REQUIRED`. Não houve ajuste de HP, dano, velocidade, portais, arte, Shop ou contas.

Evidências: [plano P01](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md) e
[medição Earth](../reports/EARTH_BALANCE_v0.4.0.md).

### 15/09/2026 — P01: decisões de público e plataformas iniciais

- **Concluído**: P01-02 definiu lançamento para celular em retrato e toque, português-BR inicial,
  Android 10+ (alvo Android 14+ intermediário), iOS 16+ (alvo iPhone 11+) e sem iPad.
- **Concluído**: web continua destinada a teste/demonstração; sessão começa local, convidada e offline,
  sem login obrigatório. Conta fica para sincronização/transações futuras.
- **Planejado**: compromisso inicial de acessibilidade inclui labels, contraste, redução de tremor e
  haptics opcionais. Não é declaração de acessibilidade integral do combate; validação com usuários,
  áudio e preferências permanecem nos planos P12/P13.

Evidência: decisão do responsável registrada no [plano P01](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md).

### 15/09/2026 — P01: direção visual, Continuar e modelo comercial

- **Concluído**: direção de produto aprovada como 3D estilizado premium e legível em celular; Skia/2.5D
  permanece padrão para a prova de P02. Uma migração para 3D real só pode ser considerada após essa prova.
- **Concluído**: Continuar foi definido como restauração pausada no início da fase atual, com estado de
  entrada determinístico; P04 implementará e validará o checkpoint.
- **Concluído**: dinheiro real está fora da primeira versão. A economia inicial será obtida jogando;
  contas, carteira, inventário e Shop seguem pendentes nos planos donos.

Evidência: decisão do responsável registrada no [plano P01](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md).

### 16/09/2026 — P01: escopo, contratos e responsabilidades do lançamento

- **Concluído**: escopo inicial confirmado: Terra 1–10, Home/tutorial/Continuar, áudio, conta, perfil,
  coleção, itens e Shop com moeda conquistada jogando. Web é teste/demonstração; o próximo planeta é
  expansão sinalizada. Multiplayer, anúncios, energia obrigatória, loot boxes e armas com atributos ficam fora.
- **Concluído**: regras de fronteira registradas. Motor decide combate; renderizador desenha; UI encaminha
  intenção; navegação controla sessão; persistência controla recordes/checkpoint; serviços futuros controlam
  identidade, posse, economia e transações.
- **Concluído**: IDs, versões e elegibilidade foram contratados. Runs de tutorial/debug/teste não podem gerar
  progresso, moeda, conquista ou inventário; restaurações incompatíveis devem falhar claramente.
- **Concluído**: responsáveis e aceite de P01 definidos. P01-09 identificou ambiente e caminho de build;
  P01 foi encerrado após essa evidência.

Evidência: aprovação do responsável e detalhes no [plano P01](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md).

### 16/09/2026 — P01: identificação e caminho de build inicial

- **Concluído**: Android e iOS usam o identificador `com.feinmach.squadfire`; o scheme permanece
  `squadfire-mobile` e o nome visível não mudou.
- **Validado**: exports Expo Android, iOS e web concluídos localmente. Eles comprovam bundles/export,
  não APK/AAB/IPA instalável nem teste em aparelho.
- **Pendente fora de P01**: não há `eas.json`, credenciais de lojas, EAS/adb ou aparelho detectado.
  Build instalável, contas e validação física pertencem a P07/P13/P14.

Evidência: [plano P01](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md).

### 16/09/2026 — P01 concluído

- **Concluído**: todas as atividades P01-01 a P01-09 possuem decisão ou evidência registrada. O plano foi
  movido para `docs/planos/concluidos` e P02 foi liberado como próxima etapa.
- **Pendente nas etapas donas**: build instalável, contas de lojas, credenciais, teste físico, conta,
  pagamento e validação integrada não foram antecipados nem declarados entregues por P01.

### 15/09/2026 — organização do programa e correções locais

- **Concluído**: início de partidas e RETRY fixado em um soldado.
- **Concluído**: representação do esquadrão corrigida. Poder 19 mostra uma unidade P10
  vermelha e nove unidades P1; P10 mantém o poder de fogo equivalente a dez unidades.
- **Concluído**: crescimento inicial, intervalos de portais, vida e velocidade dos
  inimigos receberam ajuste de dificuldade. As verificações automatizadas relatadas
  passaram; a sensação em dispositivo e o aceite de bosses continuam pendentes.
- **Concluído**: estrutura de planos simplificada para as pastas
  docs/planos/concluidos e docs/planos/pendentes.
- **Concluído**: dependências dos planos foram revisadas. A ordem oficial começa por
  produto/base, passa por gráfico, save, áudio, menus, conteúdo, equilíbrio, contas,
  economia, perfil, skins, Shop, QA e publicação.
- **Concluído**: P01 — produto, contratos e diagnóstico da base com um soldado. A P02 está liberada.
- **Em andamento**: P04 — controles, save e Continuar, sobre a base de controles e
  recordes já existente.
- **Em andamento**: P05 — campanha, fases e bosses, sobre a Terra de dez fases existente.
- **Em andamento**: P06 — balanceamento. A campanha ainda não possui aceite final de
  bosses ou teste humano/dispositivo com a base atual.

Evidências: [estado do projeto](../PROJECT_STATE.md),
[relatório de abertura](../reports/OPENING_BALANCE_2026-09-15.md) e
[ordem oficial](../planos/pendentes/00_EM_ANDAMENTO_PLANO_GERAL_DO_APLICATIVO.md).

## Histórico de versões

### v0.4.0 — 11/09/2026 — implementada, sem tag final

- **Concluído**: Terra com dez fases fixas, scheduler determinístico, inimigos no
  horizonte, sub-boss na fase 5 e boss final na fase 10.
- **Concluído**: Squad Power até 500, compressão visual, HUD por planeta/fase e save
  de campanha v3 com migração.
- **Concluído**: ferramentas de medição da campanha, testes de combate/fases e
  renderização de cenários.
- **Pendente de aceite**: Profile B matou os bosses durante a aproximação nas medições
  históricas. Não houve aprovação final do balanceamento.

### v0.3.6 — histórico anterior

- **Concluído**: alcance de projéteis ligado à câmera, pool sem reciclar tiros vivos,
  colisão por varredura e formação compacta.
- **Concluído**: correção de bundle nativo relacionada ao carregamento do CanvasKit.

### v0.3.5 — histórico anterior

- **Concluído**: câmera e pista aprofundadas, cenário de cidade/horizonte, melhorias
  de leitura a longa distância e sprites de realismo estilizado.

### v0.3.0 a v0.3.4 — histórico anterior

- **Concluído**: tiro reto com mira horizontal manual, formação limitada à pista,
  progressão por fases e campanha persistente.

Detalhes técnicos e checkpoints históricos: [PROJECT_STATE.md](../PROJECT_STATE.md).

## Próximos marcos planejados

Estes itens ainda não são alterações concluídas. O andamento detalhado fica no plano
correspondente.

1. [Produto, contratos e diagnóstico — concluído](../planos/concluidos/01_CONCLUIDO_P01_PRODUTO_E_ARQUITETURA.md)
2. [Reforma gráfica](../planos/concluidos/02_CONCLUIDO_P02_REFORMA_GRAFICA.md)
3. [Jogabilidade, save e Continuar](../planos/pendentes/03_EM_ANDAMENTO_P04_JOGABILIDADE_E_CONTINUAR.md)
4. [Áudio, acessibilidade e fluidez](../planos/pendentes/04_PENDENTE_P12_AUDIO_ACESSIBILIDADE_E_FLUIDEZ.md)
5. [Abertura, Home e menus](../planos/pendentes/05_PENDENTE_P03_ABERTURA_HOME_E_MENUS.md)
6. [Fases, cenários e bosses](../planos/pendentes/06_EM_ANDAMENTO_P05_FASES_CENARIOS_E_BOSSES.md)
7. [Balanceamento](../planos/pendentes/07_EM_ANDAMENTO_P06_BALANCEAMENTO.md)
8. [Contas e sincronização](../planos/pendentes/08_PENDENTE_P07_CONTAS_BACKEND_E_SINCRONIZACAO.md)
9. [Economia e itens](../planos/pendentes/09_PENDENTE_P09_ECONOMIA_E_ITENS.md)
10. [Perfil e conquistas](../planos/pendentes/10_PENDENTE_P08_PERFIL_E_CONQUISTAS.md)
11. [Skins e coleção](../planos/pendentes/11_PENDENTE_P11_SKINS_E_COLECAO.md)
12. [Shop e compras](../planos/pendentes/12_PENDENTE_P10_SHOP_E_COMPRAS.md)
13. [Validação completa](../planos/pendentes/13_PENDENTE_P13_VALIDACAO_END_TO_END.md)
14. [Publicação e operação](../planos/pendentes/14_PENDENTE_P14_PUBLICACAO_E_OPERACAO.md)

## Como atualizar

Ao concluir uma atividade que altera comportamento, dados, arte, testes, build ou
documentação de produto:

1. Atualizar a tarefa correspondente no plano com data e evidência.
2. Adicionar neste changelog uma entrada na data da alteração, com estado e impacto.
3. Registrar o teste executado e qualquer limitação ainda aberta.
4. Só mover o plano para concluidos quando todos os critérios de aceite estiverem
   demonstrados.

Não adicionar preço, estatística, resultado de teste, publicação ou compra como fato sem
uma evidência verificável.
