/* =========================================================
   ANÁLISE RESUMIDA DO JOGADOR
   ========================================================= */

.player-main-reason {
  margin: 16px 20px 0;
  padding: 13px 14px;

  border:
    1px solid
    color-mix(
      in srgb,
      var(--success) 20%,
      var(--border)
    );

  border-radius: 13px;

  display: flex;
  align-items: flex-start;
  gap: 10px;

  background:
    color-mix(
      in srgb,
      var(--success-light) 72%,
      var(--surface)
    );
}

.player-main-reason-icon {
  width: 25px;
  height: 25px;

  flex-shrink: 0;

  border-radius: 50%;

  display: grid;
  place-items: center;

  color: #ffffff;
  background: var(--success);

  font-size: 0.72rem;
  font-weight: 900;
}

.player-main-reason strong {
  display: block;

  margin-bottom: 4px;

  color: var(--text);

  font-size: 0.73rem;
}

.player-main-reason p {
  margin: 0;

  color: var(--text-soft);

  font-size: 0.7rem;
  line-height: 1.48;
}


/* =========================================================
   BOTÃO VER ANÁLISE COMPLETA
   ========================================================= */

.player-details-button {
  width:
    calc(
      100% - 40px
    );

  margin: 15px 20px 20px;
  padding: 11px 13px;

  border:
    1px solid
    color-mix(
      in srgb,
      var(--primary) 28%,
      var(--border)
    );

  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  color: var(--primary);
  background: var(--primary-light);

  font-size: 0.74rem;
  font-weight: 850;

  transition:
    color var(--transition),
    background-color var(--transition),
    border-color var(--transition);
}

.player-details-button:hover,
.player-details-button.open {
  color: #ffffff;
  border-color: var(--primary);
  background: var(--primary);
}

.player-details-arrow {
  width: 24px;
  height: 24px;

  border-radius: 50%;

  display: grid;
  place-items: center;

  color: inherit;
  background:
    color-mix(
      in srgb,
      currentColor 10%,
      transparent
    );

  font-size: 1rem;
  line-height: 1;
}


/* =========================================================
   CONTEÚDO EXPANDIDO
   ========================================================= */

.player-complete-analysis {
  padding-bottom: 1px;

  border-top:
    1px solid var(--border);

  background:
    color-mix(
      in srgb,
      var(--surface-soft-2) 55%,
      var(--surface)
    );

  animation:
    completeAnalysisFade
    0.25s ease;
}

.player-complete-analysis[hidden] {
  display: none;
}

.player-complete-analysis
.player-secondary-metrics {
  margin-top: 17px;
}

@keyframes completeAnalysisFade {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}


/* =========================================================
   AJUSTES PARA CELULAR
   ========================================================= */

@media (max-width: 680px) {
  .player-main-reason {
    margin-left: 17px;
    margin-right: 17px;
  }

  .player-details-button {
    width:
      calc(
        100% - 34px
      );

    margin-left: 17px;
    margin-right: 17px;
  }
}

@media (max-width: 390px) {
  .player-main-reason {
    margin-left: 14px;
    margin-right: 14px;
  }

  .player-details-button {
    width:
      calc(
        100% - 28px
      );

    margin-left: 14px;
    margin-right: 14px;
  }
}
