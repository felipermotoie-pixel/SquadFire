# P03 — Abertura, Home, menus e tutorial

Revisão documental 1.1 · 15/09/2026 · Ordem de execução: 05.
Status: Pendente. CampaignScreen é uma tela pré-partida simples; não equivale ao novo Home, intro ou tutorial.
Dependência de liberação: [P12 — etapa 4](04_PENDENTE_P12_AUDIO_ACESSIBILIDADE_E_FLUIDEZ.md).
Estimativa preliminar: 5–8 dias úteis de trabalho; não é prazo contratado.

## Objetivo

Conectar a abertura a todos os recursos do aplicativo por uma experiência rápida, atraente e compreensível.

## Atividades em ordem

- [ ] **P03-01** — Definir navegação, montagem/pausa/desmontagem da sessão e implementar Boot com logo/assets essenciais. Home não espera rede nem CanvasKit; no web, carregar o renderizador apenas ao entrar na área de jogo.
- [ ] **P03-02** — Entregar intro de 3–4 segundos, Pular, versão breve para reabertura e movimento/áudio respeitados.
- [ ] **P03-03** — Construir Home com Jogar/Continuar, personagem, campanha, Perfil, Shop, Coleção, Menu, Ajuda e Tutorial.
- [ ] **P03-04** — Implementar navegação, retorno Android, safe areas, teclado, foco e estados de vazio/carregamento/erro.
- [ ] **P03-05** — Criar configurações ligadas ao serviço real de P12 e ajuda em português coerente com regras e controles; nenhuma preferência sem efeito.
- [ ] **P03-06** — Implementar tutorial de 30–45 segundos: mover, mirar, portal e P10; treino isolado da campanha e economia.
- [ ] **P03-07** — Auditar abertura, Home, Continuar e tutorial disponíveis; atribuir a P07/P08/P11/P10 a ativação de Conta/Perfil/Coleção/Shop. Reservar a prova de todos os destinos integrados para P13.

## Matriz de interação

| Origem | Ação | Resultado e retorno |
| --- | --- | --- |
| Abertura | Fim/Pular | Home; falha da animação usa logo estático |
| Home | Jogar | Preparação → partida nova com um soldado |
| Home | Continuar | Retomada válida de P04; erro preserva recordes |
| Home | Shop | Catálogo → detalhe → compra → inventário; cancelar sem débito |
| Home | Coleção | Skins → prévia → equipar; seleção persiste |
| Home | Perfil | Estatísticas/conta; voltar não encerra sessão |
| Menu | Som/vibração/gráficos | Efeito imediato e preferência persistida |
| Home/Menu | Ajuda/Tutorial | Conteúdo/treino → origem |
| Partida | Pausar | Retomar preparado ou voltar ao Home conforme save |
| Derrota | RETRY | Partida nova com um soldado |
| Vitória | Continuar | Resumo/Home; recompensa uma única vez |

O Home pode permitir convidado (proposta). Não exibir Continuar como funcional sem save real.
No protótipo, recursos futuros ficam identificados como indisponíveis; na entrega final, nenhum botão do escopo termina em simulação.
Consolida as etapas 01–06 do plano anterior de abertura/Home/contas, sem exigir sua execução duplicada.

## Entrega e aceite

Entregas desta etapa: telas responsivas do núcleo local, tutorial e mapa de navegação; os planos responsáveis integram os destinos de conta/economia/coleção depois.

Aceite: Jogar em até duas ações a partir do Home; intro nunca prende o usuário; treino não concede progresso.

Validação: Primeira abertura, retorno, offline, falha de assets, toque repetido, teclado e aparelho pequeno.

## Liberação e conclusão desta etapa

Entrada: P04 entrega Continuar real; P12 entrega som/preferências; P01/P02 entregam contratos e guia visual.

Saída: Boot, intro, Home, Jogar/Continuar, Menu, Ajuda e Tutorial funcionam. Destinos de conta, perfil, coleção e Shop têm contratos definidos e liberação controlada.

Próxima ação: Implementar navegação e carregamento em P03-01; no web, tirar a Home de trás do carregamento de CanvasKit.

## Impacto sobre os outros planos

Na etapa 05, conta/Shop/coleção ainda não estão disponíveis. P07/P08/P11/P10 são responsáveis por ligar suas entradas reais. P13 rejeita qualquer destino pendente do escopo final.

Antes de encerrar uma atividade, registrar aqui a alteração, a evidência e a data. Marcar `[x]` e riscar
somente o texto realmente concluído; itens parciais permanecem `[ ]` com nota de andamento.
Não há acompanhamento separado. O número inicial do arquivo define a ordem; o ID P03 preserva a referência histórica.
Se uma alteração invalidar contrato ou aceite anterior, reabrir o item afetado e validar antes de avançar.

## Registro da revisão

15/09/2026 — revisão 1.1: dependências, aceite por etapa e responsabilidades corrigidos por inspeção dos planos e do código.
Esta revisão é documental; nenhum teste do jogo foi executado nem funcionalidade nova implementada nesta tarefa.
