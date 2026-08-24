# V2.1 — Contexto externo: fontes e gates

Este documento registra as regras de uso para três famílias experimentais adicionais: espacial/lateralidade, clima e consenso pré-jogo. Nenhuma fonte entra no motor oficial sem cobertura suficiente, timestamp pré-jogo e ganho em walk-forward.

## 1. Espacial / lateralidade

Objetivo: medir matchups de corredor, por exemplo ataque adversário concentrado pela direita versus lateral/zagueiro do lado esquerdo com alta capacidade de desarme/interceptação.

Fonte aberta de referência para eventos espaciais: StatsBomb Open Data — https://github.com/statsbomb/open-data

A disponibilidade de dados espaciais para o Brasileirão 2026 precisa ser comprovada antes de qualquer dependência. Se a cobertura não for suficiente, usar apenas proxies reproduzíveis dos próprios dados do Cartola/partidas, como volume ofensivo, cruzamentos/scouts quando disponíveis, desarmes, finalizações e vulnerabilidade por posição.

Gates mínimos:
- dado publicado/licenciado para uso compatível com o projeto;
- cobertura histórica >= 60% das partidas avaliadas;
- timestamp compatível com pré-jogo quando a feature não for puramente histórica;
- ganho fora da amostra em seleção/Top 5 ou pontuação dos times;
- nenhuma regressão relevante em MAE e robustez temporal.

## 2. Clima

Fonte candidata principal: Open-Meteo Historical Weather API — https://open-meteo.com/en/docs/historical-weather-api

A API histórica fornece séries horárias por latitude/longitude, incluindo temperatura, umidade, precipitação/chuva, vento e rajadas. Para uma feature utilizável, cada partida deve ser ligada ao estádio/cidade, coordenadas e horário local.

Features candidatas:
- temperatura no início do jogo;
- temperatura aparente;
- umidade relativa;
- precipitação na hora e acumulado nas horas anteriores;
- vento e rajadas;
- interações por posição e tipo de scout.

Regra: não criar bônus/penalidade manual de chuva ou calor. O efeito precisa ser aprendido/testado e aprovado em walk-forward.

Gates mínimos:
- cobertura de estádio+horário >= 80%;
- histórico meteorológico disponível para todas as rodadas usadas no teste;
- ganho consistente global ou por posição sem overfit de thresholds;
- manter a feature fora de produção se o efeito for instável.

## 3. Consenso pré-jogo

Fonte candidata inicial: série “Palpite ge” do ge, com páginas publicadas antes das rodadas e votos de apresentadores/comentaristas. Exemplos 2026:
- R24: https://ge.globo.com/gato-mestre/noticia/2026/08/22/palpite-ge-2026-veja-as-apostas-de-apresentadores-e-comentaristas-para-a-24a-rodada-do-brasileirao.ghtml
- R23: https://ge.globo.com/gato-mestre/noticia/2026/08/15/palpite-ge-2026-veja-as-apostas-de-apresentadores-e-comentaristas-para-a-23a-rodada-do-brasileirao.ghtml
- R22: https://ge.globo.com/gato-mestre/noticia/2026/08/08/palpite-ge-2026-veja-as-apostas-de-apresentadores-e-comentaristas-para-a-22a-rodada-do-brasileirao.ghtml

Feature proposta: consenso quantitativo de resultado (vitória/empate/derrota) por partida, calculado somente a partir de conteúdo publicado antes do início do jogo/fechamento relevante.

Não transformar opinião em bônus fixo. Testar se consenso melhora:
- projeção média;
- probabilidade de 10+;
- escolha dos 11;
- capitão;
- priorização de jogadores ofensivos/defensivos coerentes com o favorito.

Gates mínimos:
- página com timestamp anterior ao jogo;
- coleta reproduzível e auditável;
- cobertura histórica suficiente para evitar seleção enviesada;
- validação separada por janela temporal;
- descartar se a série histórica for curta, irregular ou exigir scraping frágil.

## Regra geral anti-leakage

Toda feature contextual de uma rodada R deve ser reconstruível com informação disponível antes do início dos jogos da própria R. Dados posteriores, matérias pós-jogo e qualquer resultado da R não podem participar da previsão dessa R.
