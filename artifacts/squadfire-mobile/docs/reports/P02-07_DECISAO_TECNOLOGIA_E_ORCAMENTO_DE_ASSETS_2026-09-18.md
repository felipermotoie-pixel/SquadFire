# P02-07 — Decisão técnica e orçamento de assets

Data: 18/09/2026
Status: concluído para P02; validação final Android/iPhone e stress térmico permanecem em P13.

## Decisão

**Skia/2.5D é a tecnologia de produção aprovada para a campanha inicial.** Não será aberta prova 3D
nesta versão. A decisão não autoriza alterar câmera, mira, dano, colisão, scheduler, balanceamento ou saves.

| Critério | Evidência | Resultado |
| --- | --- | --- |
| Câmera e profundidade | Renderer real entrega estrada em perspectiva, horizonte, sombras e unidades na geometria atual. | Manter Skia/2.5D. |
| Mira, muzzle e tiro | Testes cobrem `ROAD_FORWARD`, arrasto manual e colisão; 3D exigiria recriar esses alinhamentos. | Não assumir esse risco sem benefício demonstrado. |
| Leitura visual | A referência de poder 19 mostra P10, P1, inimigos, portal, sombras e projéteis reais. | Produzir a linguagem visual no renderer atual. |
| iPhone / Expo Go | Prova aceita: 60 FPS normal; stress P500/300 em 45 FPS com geometria de depuração ligada e zero projéteis descartados. | Não há falha que justifique trocar de engine. |
| Custo de uma prova 3D | Recriaria render, assets, câmera e regressões de toque. | Fora do escopo da versão inicial. |

P13 repetirá a matriz física Android/iPhone, memória, temperatura e arte final; o aceite P02-06 não é
certificação multiplataforma.

## Inventário e orçamento de runtime

Inventário medido em 18/09/2026, excluindo `assets/source/`:

| Grupo | Arquivos atuais | Tamanho comprimido atual |
| --- | --- | --- |
| Cena de batalha | `soldier_blue`, `grunt_red`, `boss_crimson`, `horizon_coastal` | 1,04 MiB |
| Ícone/splash/favícone referenciado | `assets/images/icon.png` | 1,13 MiB |
| Runtime total encontrado | Inclui `icon_2.png`, não referenciado no `app.json`, preservado sem exclusão. | 3,31 MiB |

| Limite aprovado | Valor | Regra |
| --- | ---: | --- |
| Cena de batalha carregada | até 4 MiB comprimidos | Inclui sprites, boss e fundo ativos. |
| Texturas decodificadas da cena | até 16 MiB | Carregar somente o cenário e os personagens da Wave atual. |
| Assets de runtime do aplicativo | até 16 MiB comprimidos | `assets/source/` não entra no orçamento de runtime. |
| Fundo ativo | JPEG, até 1024×1024 | Preservar a linha do horizonte medida; substituir exige preview. |
| Sprite com alpha | PNG, altura até 512 px | Boss pode chegar a 1024×1024; preservar âncora, muzzle e alpha aparado. |

Os valores são limites de produção, não medição de APK/IPA. Asset acima do limite requer evidência no
aparelho e aprovação no plano dono.

## Regras de produção

1. Cada asset novo entra com origem/licença, dimensões, tamanho, âncora, muzzle e preview no
   [`ASSET_PIPELINE.md`](../ASSET_PIPELINE.md).
2. `Battlefield` carrega somente o conjunto ativo. Nova família visual não pode entrar no carregamento
   inicial sem revisar o limite de texturas decodificadas.
3. Não criar atlas antecipadamente. Abrir `drawAtlas` somente se a arte final apontar draw calls de
   sprites como gargalo em medição física; P05/P12 são donos dessa alteração e regressão.
4. Não usar partículas, filtros ou resolução para esconder leitura ruim. Ameaça, P1, P10, portal e
   dedo do jogador têm prioridade sobre ornamento.

## Liberação

P02 está liberado para P04. P05 produz conteúdo visual dentro deste orçamento após P03 e P12, na ordem
oficial. Nenhum asset final novo, migração de engine ou alteração de gameplay ocorreu nesta atividade.

## Evidências consultadas

- [P02-03 — comparação técnica](P02-03_SKIA_2_5D_DECISION_2026-09-16.md)
- [P02-05 — validação visual](P02-05_VALIDACAO_VISUAL_2026-09-16.md)
- [P02-06 — protocolo e aceite](P02-06_PROTOCOLO_DE_MEDICAO_2026-09-16.md)
- [Guia de arte](../VISUAL_DIRECTION.md)
- [Pipeline de assets](../ASSET_PIPELINE.md)
