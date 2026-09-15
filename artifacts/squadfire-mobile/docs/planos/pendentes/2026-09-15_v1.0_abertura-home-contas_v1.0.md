# SquadFire — plano de abertura, Home, continuidade e contas

Data: 15/09/2026. Versão do plano: 1.0.
Projeto: `C:\SquadFire\SquadFire`.
Status: planejamento concluído; implementação das etapas abaixo ainda não iniciada.

## 1. Objetivo

Entregar uma abertura rápida e atraente: logo SquadFire → breve introdução → Home principal.
No Home, o jogador encontra Jogar/Continuar, acesso à conta, Menu, Ajuda e Tutorial.
O desenvolvimento será sequencial, com uma entrega verificável por etapa e registro dos resultados.

## 2. Base real inspecionada

| Área | Existe hoje | Trabalho necessário |
| --- | --- | --- |
| Abertura | Splash configurado com ícone; carregamento de fontes em `app/_layout.tsx` | Identidade visual de abertura, intro e transição suave |
| Navegação | Entradas nativa/web carregam `CampaignScreen` | Fluxo de abertura, Home e telas auxiliares |
| Campanha | Card Earth, PLAY, partida e resumo | Integrar ao novo Home sem duplicar a progressão |
| Progresso | Schema v3 salva fases concluídas em AsyncStorage | Salvamento da partida para Continuar |
| Partida nova | Fase 1 com um soldado azul | Preservar esse requisito em Jogar e Nova partida |
| Contas | Nenhum fluxo de autenticação encontrado nas áreas inspecionadas; API tem rota de saúde | Identidade, cadastro, sessão e integração dos provedores |
| Web | Entrada depende de carregar CanvasKit antes da campanha | Home deve abrir sem depender do renderizador do combate |

Arquivos principais: `components/CampaignScreen.tsx`, `components/GameScreen.tsx`,
`game/campaign.ts`, `game/campaign-progress.ts`, `game/engine.ts`, `app/index.tsx`,
`app/index.web.tsx`, `app/_layout.tsx` e `app.json`, dentro de `artifacts/squadfire-mobile`.
Servidor existente: `artifacts/api-server`; infraestrutura de dados: `lib/db`.

O histórico importado é referência. Para esta entrega prevalecem os pedidos recentes:
um soldado inicial, agrupamento de dez em uma unidade vermelha e balanceamento local atual.
Este plano não propõe novos ajustes de combate.

## 3. Experiência proposta

### Abertura

Direção visual proposta: tecnologia militar futurista, fundo azul profundo, luz ciano,
acentos quentes discretos, personagens e cenário coerentes com o jogo.

Roteiro de 3–4 segundos de animação, além do tempo inevitável de inicialização do dispositivo:

1. Logo aparece com iluminação rápida e som curto, respeitando a preferência de áudio.
2. Breve cena de um soldado avançando, disparos e formação do esquadrão; sem texto longo.
3. Transição direta para o Home, mantendo cenário/paleta para evitar sensação de troca brusca.

Botão Pular acessível assim que a introdução começa. Nas aberturas seguintes, usar uma versão
abreviada; voltar do segundo plano não repete a introdução. Com movimento reduzido, oferecer
logo estático e transição discreta. O Home não espera login, rede ou vídeo remoto.
Usar assets locais leves; se a animação falhar, mostrar o logo e seguir para o Home.

### Home

- Topo: logo compacto e botão de perfil/Entrar.
- Centro: cenário com movimento discreto, soldado e contexto da campanha Terra.
- Ação principal: Jogar quando não houver partida salva; Continuar quando houver retomada válida.
- Com retomada disponível, Nova partida fica como ação secundária e explica que substituirá a partida atual.
- Acessos sempre visíveis: Menu, Ajuda e Tutorial.
- Jogar inicia a campanha com um soldado azul. Tutorial é apresentado como convite na primeira vez.
- Textos inicialmente em português; nomes e estados dos botões precisam ser consistentes.

Proposta de acesso: permitir jogar como convidado, com conta oferecida para guardar o progresso
entre dispositivos. Assim, a abertura leva diretamente ao Home. Login obrigatório permanece
uma alternativa de produto, ainda não solicitada explicitamente.

### Continuar — decisão em aberto

Foi apresentada ao usuário a escolha entre retomar no começo da fase ou no ponto exato do combate.
Enquanto não houver resposta, a proposta de trabalho é **retomar no início da fase em andamento**,
com os soldados e as melhorias registrados na entrada dessa fase. Isso não está aprovado como decisão final.

Proposta de regras para retomada por fase:

- Novo jogo: fase 1, poder 1, modificadores iniciais.
- Ao entrar em uma fase, gravar checkpoint com planeta, fase, poder, melhorias, semente,
  identificador da partida, versão de dados e estado necessário à continuidade.
- Fechar no meio da fase e reabrir: repetir essa fase desde o checkpoint; não conceder novamente
  recompensas persistentes já registradas. Validar idempotência por partida/fase.
- Derrota e vitória encerram a retomada; RETRY inicia uma nova partida com um soldado.
- Não converter fases concluídas do save v3 em uma partida inventada. Saves antigos mantêm os recordes,
  mas só exibem Continuar depois de um checkpoint real da nova versão.

Se a escolha for ponto exato, a etapa 07 deverá serializar também inimigos, projéteis, portais,
timers, estado do gerador aleatório, chefes e efeitos relevantes. O retorno acontece pausado,
com contagem de preparação. Essa opção aumenta o trabalho de persistência e regressão.

## 4. Sequência de execução

Cada etapa depende da conclusão da anterior. Encerrar uma etapa significa código/arte integrado,
checagens pertinentes concluídas e registro do que ainda depende de teste em dispositivo.
Na execução, avançar automaticamente entre etapas liberadas; pedir somente decisões realmente
ausentes ou acesso externo indispensável. Não abrir um ciclo de aprovação para cada arquivo.

| Ordem | Atividade | Entrega | Critério de conclusão |
| --- | --- | --- | --- |
| 01 | Estruturar navegação e contratos de estado | Fluxo Boot → Intro → Home → Partida; estados de convidado/conta/retomada | Home abre sem criar motor de combate; voltar e reabrir não duplicam telas |
| 02 | Criar identidade visual da abertura e Home | Logo utilizável, storyboard, composição do Home e assets otimizados | Legibilidade em celular pequeno, coerência com o jogo e variações necessárias exportadas |
| 03 | Implementar splash e introdução | Logo, animação curta, Pular, áudio e fallback | Sem tela vazia, avanço único ao Home, retorno do segundo plano sem repetir intro |
| 04 | Implementar Home e entrada no jogo | Home funcional com Jogar, perfil e acessos auxiliares | Nova partida começa com 1 soldado; layout correto em Android, iPhone e web |
| 05 | Implementar Menu e Ajuda | Ajustes, preferências persistentes e ajuda contextual | Controles têm efeito real; Ajuda pode abrir e voltar sem alterar a partida |
| 06 | Implementar Tutorial interativo | Treino guiado reutilizando controles e renderização do jogo | Jogador pratica mira, portais e agrupamento; treino não altera campanha nem moedas |
| 07 | Implementar salvamento e Continuar | Retomada local, migração, validação e recuperação | Fechar/reabrir funciona; save inválido é tratado; Nova partida não apaga recordes |
| 08 | Preparar identidade e ambientes de autenticação | Provedor definido, modelo de conta, contratos de API e builds de teste | Integração compatível com Expo atual e três plataformas, ambientes de teste separados |
| 09 | Implementar Conta SquadFire | Cadastro por e-mail/senha, confirmação, entrada, recuperação e sessão | Fluxos reais de sucesso, erro, cancelamento e expiração verificados |
| 10 | Integrar Google e Apple | Login social e vinculação segura à mesma conta SquadFire | Login validado em dispositivos/builds apropriados; não criar contas duplicadas indevidamente |
| 11 | Sincronizar progresso e finalizar gestão da conta | Saves por usuário, conversão de convidado, logout e exclusão | Dois aparelhos, modo offline e troca de conta não causam perda nem vazamento de progresso |
| 12 | Validar a experiência completa | Checklist final, evidências visuais e pacote de teste | Abrir → Home → Jogar/Continuar → sair → voltar validado nas plataformas-alvo |

### 01 — Estrutura de navegação

Separar estado do aplicativo, estado de autenticação e estado do combate. Evitar um único booleano
para decidir todas as telas. Reaproveitar a campanha como fonte de progressão. Carregar Skia e assets
pesados quando o jogador entrar em Partida/Tutorial; o Home e os menus devem funcionar por conta própria.
Na web, manter a apresentação vertical já adotada e tratar falha de carregamento do renderizador com retry.

### 02–04 — Visual, introdução e Home

Produzir uma composição principal antes das variações. Avaliar logo sobre fundo claro/escuro,
contraste dos botões e áreas de toque de pelo menos 48 unidades de layout como meta do projeto.
Animação decorativa não intercepta gestos. Áudio não bloqueia a abertura; no navegador, iniciar
som após interação quando necessário. Botões futuros não devem simular funcionalidades concluídas.
Até a etapa 07, mostrar Jogar e só habilitar Continuar quando houver restauração real.

### 05 — Menu e Ajuda

Menu: efeitos sonoros, música se implementada, vibração, intensidade de efeitos/movimento,
conta, versão e informações do jogo. Preferências são persistidas e respeitadas também na intro.
Ajuda: como mirar arrastando, disparo automático, escolhas nos portais, significado do contador,
unidade vermelha equivalente a dez soldados, pausa e retomada. A Ajuda deve refletir o código atual.
Os controles de áudio só são considerados concluídos junto da reprodução funcional correspondente.

### 06 — Tutorial

Meta proposta: 30–45 segundos, pulável e repetível pelo Home. Sequência: mover lateralmente → alinhar
com um alvo → observar disparo automático → escolher um portal → demonstrar dez soldados formando
uma unidade vermelha → retornar ao Home ou iniciar o jogo com um soldado.
Usar uma sessão de treino explicitamente isolada, inelegível para progresso; não alterar o balanceamento
da campanha para atender ao tutorial. Registrar conclusão por perfil, sem obrigar repetição a cada abertura.

### 07 — Persistência

Separar recordes da campanha, preferências e retomada de partida. Definir schema versionado e validação
de limites antes de restaurar. Gravações serializadas, estado anterior recuperável e indicação de falha
de salvamento; não declarar sucesso quando a escrita falhar. Testar fechamento durante uma escrita.
Ao pausar e retornar do segundo plano, preservar sessão; quando o processo tiver sido encerrado,
usar a política de retomada escolhida. Saves de treino/dev nunca são promovidos a progresso real.

### 08–10 — Contas e login

Nomes para o jogador: **Continuar com Apple**, **Continuar com Google** e **Conta SquadFire**.
“iOS” e “Android” são plataformas; não serão botões adicionais duplicando Apple/Google.

Proposta técnica: adotar um serviço de autenticação gerenciado, selecionado na etapa 08 após verificar
compatibilidade, custos, vinculação de contas e suporte a Apple/Google/e-mail. Conta SquadFire é a
identidade do jogador na plataforma, mesmo quando o serviço gerenciado realiza a autenticação.
Evitar criar infraestrutura própria de senhas sem necessidade.

O backend valida a sessão e autoriza o acesso aos dados pelo identificador do usuário. Credenciais
administrativas permanecem no servidor. No aplicativo, usar armazenamento seguro apropriado para sessão;
não guardar senha ou segredo de provedor no AsyncStorage ou no código distribuído.
Vincular provedores exige autenticação válida; coincidência de e-mail sozinha não basta.

Dependências externas a resolver na etapa 08: projeto do provedor, ambiente de backend,
identificadores definitivos do app, URLs de retorno, projeto Google e configuração Apple.
Os identificadores Android/iOS ainda precisam ser definidos no projeto inspecionado.
Inventariar acessos existentes antes de pedir credenciais ao usuário. Nunca solicitar segredos no chat;
usar configuração local segura. Não há contratação nem publicação incluída nesta entrega de planejamento.

Login Google nativo requer um build de desenvolvimento com os módulos necessários; Expo Go não basta
para esse teste. Planejar configuração e testes específicos para web e app instalado.
Fonte: [Google no Expo](https://docs.expo.dev/guides/google-authentication/).

O módulo `expo-apple-authentication` atende iOS; Apple no navegador/Android exige outro fluxo do provedor,
se incluído. Não apresentar botões sem implementação na plataforma correspondente.
Fonte: [Apple no Expo](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

Cadastro próprio inclui confirmação de e-mail, recuperação de senha, sessão expirada e proteção contra
tentativas repetidas. Incluir exclusão de conta na gestão do perfil e revisar os requisitos de publicação
quando houver distribuição. Fonte: [Exclusão de conta — Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app).

### 11 — Conta e sincronização

Jogar offline como convidado deve continuar funcionando conforme a proposta de acesso. Ao entrar em
uma conta, detectar progresso local e remoto antes de substituir qualquer dado. Recordes podem ser
combinados por regra monotônica; checkpoints de partidas diferentes não devem ser somados.
Quando houver duas partidas, mostrar fase/data e permitir escolher qual retomar, preservando recuperação.
Sincronização usa revisões e operações idempotentes para não duplicar recompensas nem sobrescrever
um save recente com upload atrasado. Falhas de rede mantêm o estado local e tentam novamente depois.
Logout e troca de conta separam dados por usuário. Exclusão de conta remove dados associados e encerra
sessões; validar a extensão da remoção no provedor e no backend.

### 12 — Validação integrada

Verificar: primeira abertura, abertura recorrente, intro pulada, movimento reduzido, áudio desligado,
rede ausente, carregamento lento, Home, Android Back, teclado de cadastro, telas pequenas, login cancelado,
recuperação de senha, partida nova, continuar, derrota, vitória, tutorial, app encerrado, save inválido,
troca de usuário, conflito entre dispositivos e exclusão de conta.
Testar lógica de estados/persistência com testes automatizados e aparência/gestos/login real em dispositivo.
Compilação web ou renderização offline não substituem teste no iPhone/Android.

## 5. Marcos e acompanhamento

| Marco | Etapas | Resultado demonstrável |
| --- | --- | --- |
| A | 01–04 | Abrir, ver logo/intro e chegar ao Home com Jogar funcional |
| B | 05–07 | Menu, Ajuda, Tutorial e Continuar local |
| C | 08–11 | Conta própria, Apple/Google e sincronização |
| D | 12 | Experiência integrada validada |

Checklist de execução:

- [ ] 01 — Navegação e contratos
- [ ] 02 — Logo, storyboard e visual
- [ ] 03 — Splash e introdução
- [ ] 04 — Home e Jogar
- [ ] 05 — Menu e Ajuda
- [ ] 06 — Tutorial
- [ ] 07 — Continuar e salvamento
- [ ] 08 — Infraestrutura de identidade
- [ ] 09 — Conta SquadFire
- [ ] 10 — Apple e Google
- [ ] 11 — Sincronização e gestão de conta
- [ ] 12 — Validação final

Em cada etapa registrar: arquivos alterados, evidência visual quando aplicável, testes executados,
limitações, próximo passo e checkpoint de Git quando criado. Preservar mudanças locais existentes e tags.
Não marcar login concluído com uma tela simulada, nem Continuar concluído sem restaurar uma partida.
Estimativas de prazo deverão ser definidas após a política de retomada e a disponibilidade dos ambientes
de conta; não há prazo prometido para integrações externas neste plano.

Próximo passo da execução: etapa 01, seguida da composição visual da etapa 02.
