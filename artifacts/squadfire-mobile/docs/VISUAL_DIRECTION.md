# SquadFire — Guia de arte P02-01

Status: concluído em 16/09/2026 como contrato de direção para a prova visual de P02.
Este documento substitui o antigo guia de direção visual como referência única de arte até a
decisão técnica de P02-07. Ele define produção e avaliação visual; não altera regras de
combate, geometria, colisão, balanceamento ou a tecnologia de renderização.

**Conceito: "Sunlit Causeway".** Uma rodovia costeira saturada e luminosa cruza água turquesa
até uma megacidade de vidro no horizonte. Concreto limpo, guardrails ciano, aliados azuis e
ameaças quentes criam uma fantasia de combate sci-fi clara. O resultado deve parecer 3D
estilizado premium, legível à distância de uso de um celular e profundo: a ponte chega ao ponto
de fuga e inimigos são vistos antes de se tornarem uma ameaça.

## Princípios não negociáveis

1. **Leitura antes de ornamento.** A ordem da imagem é: perigo iminente e área segura; alvo
   vulnerável; escolha de portal; efeitos decorativos. Nenhuma partícula, brilho ou painel pode
   esconder a trajetória, a silhueta inimiga, o portal, a barra do boss ou o toque de arrasto.
2. **Cor nunca é a única identificação.** Forma, proporção, posição, animação e marcador devem
   distinguir aliado, P10, inimigo e tipo de ameaça mesmo sob baixa saturação, tela pequena ou
   efeitos reduzidos.
3. **O desenho explica a simulação, não a substitui.** Tiros continuam dashes curtos e retos na
   direção `ROAD_FORWARD`; não usar feixe contínuo, curvatura, homing ou impacto visual fora da
   colisão. O corpo aliado permanece voltado ao ponto de fuga.
4. **Profundidade com economia.** Materiais, luz, sombra de contato, névoa e perspectiva devem
   criar profundidade antes de aumentar quantidade de sprites, shaders ou partículas.
5. **Estados futuros são estudos.** Blindagem, suporte, escudo de aproximação e ponto fraco são
   linguagem de conceito para P05; não representam mecânica entregue nesta etapa.

## Câmera e proporções — contrato preservado
Perspectiva elevada e inclinada: a estrada é mais larga na base (formação) e converge em um
único ponto de fuga. Horizonte em 17,5% da altura; linha da formação em 71,5%; distância focal
vinculada a `ROAD_LENGTH` (= 8), para que a linha de spawn seja lida em ~22% de escala (~20 px
de figura). A fileira traseira de 50 soldados permanece acima da borda inferior. A ponte desenhada
continua até `ROAD_FAR` (= 90), poucos pixels abaixo do horizonte; ela nunca termina dentro do quadro.

P02 não muda esses valores nem densidade, seed, distância de spawn, velocidade percebida ou área
jogável. Qualquer proposta que os altere é funcional, deve ser separada do estudo gráfico e exige
revalidação posterior em P06.

## Materiais, iluminação e camadas (fundo → frente)
1. Sky gradient + skyline painting (its sea horizon aligned to the camera horizon); faint mirrored reflection under the horizon.
2. Water: gradient, drifting noise highlights, sun-glitter column right of centre, perspective swell lines tightening toward the horizon.
3. Road: gradient + grain, slab seams and debris to the horizon, converging longitudinal seams, cyan edge guide strips that stay visible after the seams vanish, aerial-perspective fade past 1.5 × `ROAD_LENGTH`.
4. Barriers: detailed 3-face modules to y = 16, then one simplified strip per side to `ROAD_FAR`; light masts every 4 units with warm caps (the shrinking cadence is the main depth cue).
5. Units: contact shadows scale with depth; enemies materialise over 0.5 s at the spawn line and carry a warm ground marker below ~45 % scale so a 20 px silhouette still reads as a threat. Sprite size always equals hitbox scale — no size floor.
6. Haze: strongest right under the horizon, gone by the spawn line, so distant figures stay readable while the far bridge dissolves.

## Paleta e sinais de estado (`components/battlefield/palette.ts`)
- Sky/horizon painted backdrop (`assets/environment/horizon_coastal.jpg`), turquoise water gradient with animated noise.
- Road: warm grey concrete gradient (far → near), slab seams, subtle grain, debris marks.
- Barriers: three-tone modules (lit inner face on the right, shaded on the left, bright top), cyan rail.
- Esquadrão P1: armadura azul-cobalto/aço e contra-luz ciano. P10: armadura vermelha, 12% maior,
  símbolo/chevron claro e halo compacto atrás do corpo. A formação e o símbolo devem confirmar que
  ele é aliado, pois vermelho também aparece nas ameaças.
- Inimigos atuais: carapaça carmesim/gunmetal, visor e núcleo laranja. Boss: carmesim escuro com
  canhão no braço esquerdo. Os quentes inimigos usam silhuetas voltadas para a câmera; aliados
  permanecem vistos por trás em direção ao horizonte.
- Estudos P05: corredor = corpo estreito, avanço rápido e marcador curto; blindado = massa larga,
  baixa e pesada; suporte = silhueta protegida e marcador de ligação. Esses estudos não adicionam
  novos tipos ao motor nesta etapa.
- Portal: ciano para esquadrão, dourado para dano e violeta para cadência, com numeral grande e
  moldura estável. A moldura e o texto devem sobreviver quando os efeitos decorativos forem reduzidos.
- VFX: tracer de rifle é um dash curto âmbar/branco (`tracerCore` #ffd57a sobre `tracerGlow`
  rgba(255,150,60,0.32)), 0,25 u perto / 0,18 u longe, núcleo de 1,6 px perto → 1,0 px longe,
  apagando nos últimos 12% do trajeto. O brilho fica abaixo da névoa e o núcleo acima dela. Nunca
  usar lasers. Muzzle é uma estrela dourada pálida. Impacto é faísca metálica compacta: ponto claro
  e 3–4 faíscas curtas por 0,14 s; o boss usa variante maior. Uma consolidação P10 usa pulso
  curto e concentrado, sem comunicar dano extra.
- Gates: cyan (squad), gold (damage), violet (fire rate) frames with huge numerals.

## Personagens, silhueta e estados futuros
Sprites 2.5D usam realismo estilizado, armadura hard-surface, chave forte superior e alpha aparado.
Âncoras e muzzles permanecem declarados em `game/visuals.ts` (pé, arma, muzzle como frações do
frame). Soldados sempre encaram o ponto de fuga: sprite traseiro, rifle vertical e nenhuma rotação
por estado de gameplay; apenas `baseVisualRotationOffset`, compartilhado com a simulação, pode ser
usado para alinhar a boca do cano.

Estudo visual do boss futuro: o escudo de aproximação deve ter três estados distinguíveis — campo
ativo com impactos bloqueados, desligamento explícito e ponto fraco exposto. Nenhum deles é
implementado ou conectado a dano antes de P05.

## Luz, contraste e acessibilidade visual
Chave de luz no alto à esquerda: elipses de sombra de contato sob cada unidade, topo das barreiras
mais claro e face interna direita iluminada. A névoa leva a ponte distante ao horizonte; a placa da
estrada esfria para a cor do céu com a distância. Textura e sujeira devem ser discretas: não usar
detalhe de baixo contraste como sinal tático.

Todo estado obrigatório deve passar em redução de efeitos: sem depender somente de piscar, ruído,
vibração, áudio ou uma única cor. A avaliação humana de legibilidade em aparelhos-alvo pertence a
P02-05/P02-06; este guia não declara acessibilidade ou desempenho aprovados.

## HUD
Minimal: stage pill (`STAGE 03`), squad count, pause; boss name + bar only while the boss is alive; transient banners for gates/stage start/stage clear/boss events. No counters or debug text in gameplay; the debug overlay is dev-only.

## Referências e produção de assets

- Conceitos, imagens e texturas novos devem ser originais, gerados para o projeto ou usados sob
  licença compatível documentada. Não reproduzir personagens, logos, composição reconhecível ou
  assets de outros jogos.
- Antes de substituir um asset, conservar o original e medir sua âncora, muzzle, alpha e linha de
  horizonte. Seguir [`ASSET_PIPELINE.md`](ASSET_PIPELINE.md) para registro, carregamento e preview.
- Não produzir a biblioteca inteira nesta etapa. P02-02 prepara conceitos; P02-04 prova uma cena;
  P02-06 mede em aparelho; P02-07 escolhe tecnologia e orçamento.

## Checklist de revisão para as próximas atividades

- O quadro preserva horizonte 17,5%, formação 71,5% e a mesma geometria de jogo?
- P1, P10, inimigo, portal, ameaça rápida e área segura são reconhecidos sem depender de cor?
- O tracer segue o muzzle e a linha reta real, sem encobrir alvo, HUD ou dedo?
- Há profundidade por luz, sombra, material e perspectiva antes de novas partículas?
- O conceito foi identificado como estudo se depender de mecânica futura?
- A origem/licença de cada referência nova está registrada?
