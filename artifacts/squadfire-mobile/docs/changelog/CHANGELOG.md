# SquadFire — Changelog

Registro cronológico único das alterações do produto. Atualizado em 15/09/2026.

Este arquivo diferencia fatos concluídos de trabalho em andamento e planejado:

- **Concluído**: código, documento ou configuração alterado e evidência registrada.
- **Validado**: verificação executada e resultado documentado.
- **Em andamento**: implementação iniciada, ainda sem aceite final.
- **Planejado**: escopo aprovado para execução futura; não é funcionalidade entregue.

Os planos detalham tarefas, dependências e critérios de aceite. O changelog registra o
resultado após cada marco relevante; não deve ser usado para declarar uma funcionalidade
como concluída sem evidência.

## Em andamento

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

Evidências: [plano P01](../planos/pendentes/01_EM_ANDAMENTO_P01_PRODUTO_E_ARQUITETURA.md) e
[medição Earth](../reports/EARTH_BALANCE_v0.4.0.md).

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
- **Em andamento**: P01 — produto, contratos e diagnóstico da base com um soldado.
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

1. [Produto, contratos e diagnóstico](../planos/pendentes/01_EM_ANDAMENTO_P01_PRODUTO_E_ARQUITETURA.md)
2. [Reforma gráfica](../planos/pendentes/02_PENDENTE_P02_REFORMA_GRAFICA.md)
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
