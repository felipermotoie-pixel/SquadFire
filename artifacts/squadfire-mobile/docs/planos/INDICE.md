# SquadFire — histórico de planos

Esta pasta contém cópias versionadas e imutáveis dos planos formais do SquadFire.
Ela registra a intenção e as decisões de cada momento; não prova, por si só, que uma
funcionalidade foi implementada. Para o estado do código, consultar `PROJECT_STATE.md`,
os relatórios de teste e o Git.

## Pastas

- [Concluídos](concluidos/): planos cujas entregas principais estão no código; cada um pode
  manter ressalvas ou validações posteriores em seu acompanhamento.
- [Pendentes](pendentes/): planos que ainda possuem atividades a executar. Um plano misto
  permanece aqui até que todas as atividades pendentes sejam fechadas.

## Registro de versões

| Ordem | Data | Documento arquivado | Versão | Situação | Origem | SHA-256 |
| ---: | --- | --- | --- | --- | --- | --- |
| 01 | 2026-09-10 | [Alinhamento, introdução e menu](pendentes/2026-09-10_v0.3.0_alinhamento-introducao-menu_v1.0.md) | 1.0 | Pendente; a parte de combate foi concluída, abertura/menu permanecem pendentes | Exportação histórica do Replit | `679887A2C056D5398B5CC794AC4D867D6C90E4B8AB24628AA781F2F43661496B` |
| 02 | 2026-09-11 | [Planetas, fases e compressão](concluidos/2026-09-11_v0.4.0_planetas-fases-compressao_v1.0.md) | 1.0 | Concluído historicamente; balanceamento teve alterações posteriores | Exportação histórica do Replit | `08F949D9699F4EE31A4ACDE8A4448FDFC8EAC1BF9B45EA95F974EE22D60BE527` |
| 03 | 2026-09-11 | [Plano principal de engenharia v0.4.0](concluidos/2026-09-11_v0.4.0_plano-engenharia-principal_v1.0.md) | 1.0 | Concluído com ressalva: validação final de bosses pendente | Exportação histórica do Replit | `6D69BF2A41EBD12269AEF8F118DBE89E6A2340CE25433BD16D853FAED9B52495` |
| 04 | 2026-09-15 | [Abertura, Home e contas](pendentes/2026-09-15_v1.0_abertura-home-contas_v1.0.md) | 1.0 | Pendente; planejamento concluído, implementação não iniciada | Plano local atual | `116AFD854672BEEB47483CA23C3B73781E680A6058CC809E2B9E8A4A3CDBB3F6` |

## Convenção para próximos planos

1. Nunca editar um arquivo já arquivado nesta pasta. Atualizar somente o arquivo
   `ACOMPANHAMENTO.md` que fica ao lado dele.
2. Uma mudança substancial recebe um novo arquivo: `AAAA-MM-DD_vX.Y_assunto_vN.N.md`.
3. Atualizar esta tabela e o acompanhamento com data, status, origem, relação com a versão anterior e SHA-256.
4. O plano em elaboração pode ficar fora desta pasta; quando for aceito como uma versão,
   copiar seu conteúdo para cá e preservar a cópia anterior.
5. Commits de documentação devem mencionar o nome da versão adicionada. O Git preserva
   o histórico de alterações; o hash identifica o conteúdo exato da cópia arquivada.

## Leitura dos acompanhamentos

- `[x]` significa concluído e riscado em Markdown.
- `[ ]` significa pendente.
- `[~]` significa entregue em parte ou com validação ainda pendente; o texto informa a razão.

Os acompanhamentos registram apenas fatos confirmados no código, testes e relatórios atuais.
Não tratam uma proposta histórica como se fosse implementação.

## Escopo deste primeiro inventário

Foram incluídos todos os documentos identificados como planos formais no projeto e nos
artefatos históricos importados. Relatórios, contexto consolidado, registros cronológicos,
documentação de arquitetura e checkpoints de balanceamento permanecem em suas pastas
originais, porque não são planos de trabalho. Eles podem ser relacionados aqui quando um
novo plano depender deles.
