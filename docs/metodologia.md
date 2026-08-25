# Metodologia — Cartola Estatístico V2.1

## Objetivo

O Cartola Estatístico transforma dados oficiais e histórico de desempenho em recomendações, projeções e escalações para a rodada atual. A prioridade é reduzir erro, evitar vazamento de informação futura e mostrar ao usuário conclusões úteis sem excesso de números.

## Modelo oficial em produção

- **V2 RandomForest** é o motor oficial de projeção individual.
- A **V1 permanece preservada como fallback/rollback**.
- O treinamento é feito em **walk-forward verdadeiro**: para projetar uma rodada, o modelo usa somente dados disponíveis antes dela.
- A camada de produção exige **anti-leakage**, quantidade mínima de atletas projetados e distribuição de previsões não degenerada antes de publicar.

## Dados e elegibilidade

A coleta automática usa a API oficial do Cartola e mantém snapshots por rodada. O universo de seleção considera apenas atletas de clubes com partida válida naquela rodada. A auditoria histórica encontrou poucos registros inelegíveis no universo bruto e nenhum deles havia chegado aos XI selecionados, mas o filtro passou a ser obrigatório.

Quando uma rodada termina e os dados pós-rodada ficam completos, ela é incorporada ao retrospectivo. A rodada-alvo atual permanece fora do treinamento até o fechamento oficial, preservando o caráter fora da amostra.

## Projeção e seleção

A projeção V2 é combinada com regras de viabilidade e seleção para montar recomendações e times. Entre os fatores auxiliares estão forma recente, regularidade, risco, confiança, titularidade provável, confronto, mando, preço e adequação à rodada.

A interface usa **Índice de escolha** para ordenar opções quando necessário. Esse índice não representa pontos do Cartola e não deve ser confundido com a projeção de pontuação.

## Perfis de escalação

O site mantém três perfis:

- **Conservador**: prioriza regularidade, piso, confiança e menor risco.
- **Equilibrado**: combina segurança, projeção e teto.
- **Agressivo**: aceita mais volatilidade em busca de teto.

A calibração histórica é aplicada somente quando melhora o erro em walk-forward. No fechamento da V2.1, o Conservador permanece sem ajuste adicional, enquanto Equilibrado e Agressivo recebem calibração aprovada no histórico para corrigir superestimação observada.

## Formações, orçamento e concentração

O otimizador testa **7 formações** sem favorecer artificialmente 4-3-3. O orçamento é configurável até **C$ 200**, respeitando o patrimônio informado pelo usuário. Também são aplicados limite de concentração por clube, titularidade provável, técnico e demais restrições de elegibilidade.

## Capitão, banco e Reserva de Luxo

A reconstrução histórica passou a seguir as regras reais usadas pelo projeto para avaliação:

- capitão com multiplicador **1,5x**;
- banco acionado quando o titular não atua e a substituição é válida;
- Reserva de Luxo tratada separadamente quando identificável;
- pontuação dos titulares originais e pontuação final efetiva ficam separadas para auditoria.

Resultados com atuação apenas inferida não podem promover uma nova estratégia. O gate final exige atuação explícita suficiente para permitir ranking científico.

## Histórico público

O Histórico foi redesenhado para responder perguntas simples:

1. quanto o time projetava;
2. quanto pontuou de fato;
3. quais jogadores foram sugeridos;
4. onde houve maior superestimação ou subestimação;
5. qual foi o impacto de capitão, banco e Reserva de Luxo quando disponível.

A leitura jogador por jogador separa o que era conhecido **antes da rodada** do que ocorreu **depois do jogo**, evitando explicações retrospectivas falsas.

## Time Recomendado

O quarto perfil **Recomendado** foi testado com políticas adaptativas em walk-forward. No teste aprovado da V2.1 ele **não superou o melhor perfil fixo**, portanto não foi promovido para produção. Ele permanece oculto/indisponível até provar ganho real e consistente.

## Explosão 10+

O classificador de explosão 10+ apresentou sinal útil como camada experimental/auxiliar, mas não substitui a projeção principal. Qualquer uso em produção continua condicionado aos gates de ganho fora da amostra e estabilidade recente.

## Expected scouts

A camada de expected scouts foi testada apenas como explicabilidade auxiliar, sem decompor artificialmente a previsão do RandomForest. O ganho global ficou abaixo do gate definido e poucos scouts passaram individualmente. Por isso **não foi promovida para o frontend** na V2.1.

## Clima

A cobertura histórica de clima observado é alta e útil para diagnóstico. Porém a fonte disponível contém o clima que efetivamente ocorreu no jogo, não a previsão meteorológica conhecida antes do fechamento do mercado. Por esse motivo:

- clima observado é tratado somente como **diagnóstico/upper-bound**;
- `antiLeakagePredicao` permanece falso para essa fonte;
- clima **não entra no RandomForest de produção** até existir previsão histórica reproduzível e timestamped antes do fechamento.

## Lateralidade, mapa espacial e consenso

Proxies espaciais tiveram cobertura suficiente para experimentação, mas heatmaps/lateralidade real ainda não possuem fonte histórica sustentável no projeto. Consenso pré-jogo de comentaristas/especialistas também permanece experimental por falta de cobertura histórica reproduzível e timestamp anterior à rodada.

Nenhuma dessas famílias é apresentada como ativa quando não passou gate de produção.

## Análise da Rodada

A aba de Análise da Rodada deve priorizar linguagem simples: cenário ofensivo, segurança defensiva, jogo mais aberto, posição favorecida e confrontos relevantes. Índices internos podem existir para cálculo, mas não devem dominar a interface. Quando não houver probabilidade calibrada, o site deve usar termos qualitativos em vez de exibir porcentagens com falsa precisão.

## Critério de promoção

Uma melhoria só entra na produção quando:

- usa informação disponível antes da rodada;
- melhora o baseline fora da amostra;
- não apresenta regressão recente relevante;
- mantém cobertura suficiente;
- passa os gates automáticos do projeto;
- não piora a clareza da experiência do usuário.

Se qualquer condição falhar, o experimento permanece no laboratório e a V2 oficial é preservada.

## Limitações atuais

O modelo não prevê eventos imprevisíveis como lesões de última hora, mudanças de escalação sem sinal prévio, expulsões, pênaltis ou eventos raros de jogo. Projeções representam expectativa estatística, não garantia de pontuação.

Algumas fontes externas desejáveis ainda não têm histórico pré-jogo reproduzível suficiente. Nesses casos, o projeto prefere **não usar a variável** a introduzir leakage ou falsa precisão.

## Atualização automática por rodada

O pipeline automático reconstrói histórico, coleta a rodada atual, consolida a base, gera a matriz científica e publica as projeções V2. Quando a API oficial muda de rodada, a projeção corrente acompanha essa rodada; a rodada encerrada passa ao histórico somente após os dados pós-jogo estarem completos.
