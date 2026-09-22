const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function gsapInstance() {
  return window.gsap || null;
}

function canAnimate() {
  return Boolean(gsapInstance()) && !reducedMotion.matches;
}

export function initVisualEffects() {
  const gsap = gsapInstance();

  if (gsap) {
    document.documentElement.classList.add('gsap-ready');
  }

  if (!canAnimate()) return;

  gsap.to('.ambient-orb-a', {
    x: 34,
    y: 22,
    scale: 1.08,
    duration: 10,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });

  gsap.to('.ambient-orb-b', {
    x: -28,
    y: -18,
    scale: 1.1,
    duration: 12,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
}

export function animateViewIn(root) {
  if (!root || !canAnimate()) return;

  const gsap = gsapInstance();
  const card = root.matches('.app-shell') ? root : root.querySelector('.login-card');

  if (card) {
    gsap.fromTo(
      card,
      { opacity: 0, y: 16, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out', clearProps: 'transform' }
    );
  }

  const children = root.querySelectorAll('.mode-choice, .player-card, .board-panel');
  if (children.length) {
    gsap.fromTo(
      children,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.34, stagger: 0.055, delay: 0.06, ease: 'power2.out', clearProps: 'transform' }
    );
  }
}

export function animateDifficulty(button) {
  if (!button || !canAnimate()) return;

  gsapInstance().fromTo(
    button,
    { scale: 0.94 },
    { scale: 1, duration: 0.28, ease: 'back.out(2)', clearProps: 'transform' }
  );
}

export function animateTurnCard(card) {
  if (!card || !canAnimate()) return;

  const gsap = gsapInstance();
  gsap.killTweensOf(card);
  gsap.fromTo(
    card,
    { y: -2, scale: 0.985 },
    { y: -4, scale: 1, duration: 0.34, ease: 'back.out(1.8)', clearProps: 'transform' }
  );

  const portrait = card.querySelector('.portrait-frame');
  if (portrait) {
    gsap.fromTo(
      portrait,
      { filter: 'brightness(1.18)' },
      { filter: 'brightness(1)', duration: 0.55, ease: 'power2.out', clearProps: 'filter' }
    );
  }
}

export function animatePiecePlacement(cell, player) {
  if (!cell) return;

  const piece = cell.querySelector('.piece:last-child');
  if (!piece) return;

  if (canAnimate()) {
    const gsap = gsapInstance();
    gsap.fromTo(
      piece,
      { y: -16, scale: 0.5, opacity: 0.1, filter: 'brightness(1.35)' },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        filter: 'brightness(1)',
        duration: 0.34,
        ease: 'back.out(2.1)',
        clearProps: 'transform,filter'
      }
    );

    gsap.fromTo(
      cell,
      { '--move-ring-opacity': 0.85 },
      { '--move-ring-opacity': 0, duration: 0.7, ease: 'power2.out' }
    );
  }

  createParticles(cell, player === 1 ? 'red' : 'blue', 5);
}

export function markLastMove(cell) {
  if (!cell) return;

  const board = cell.closest('.board');
  board?.querySelectorAll('.last-move').forEach(item => item.classList.remove('last-move'));
  cell.classList.add('last-move');

  if (canAnimate()) {
    gsapInstance().fromTo(
      cell,
      { '--last-move-scale': 0.6, '--last-move-opacity': 0 },
      {
        '--last-move-scale': 1,
        '--last-move-opacity': 1,
        duration: 0.45,
        ease: 'back.out(1.7)'
      }
    );
  }
}

export function setBotThinkingVisual(enabled, statusPill, botCard) {
  statusPill?.classList.toggle('bot-thinking', enabled);
  botCard?.classList.toggle('thinking', enabled);

  if (!canAnimate() || !botCard) return;

  const gsap = gsapInstance();
  gsap.killTweensOf(botCard);

  if (enabled) {
    gsap.to(botCard, {
      y: -5,
      duration: 0.7,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  } else {
    gsap.to(botCard, {
      y: 0,
      duration: 0.22,
      ease: 'power2.out',
      clearProps: 'transform'
    });
  }
}

export function animateWinningLine(cells, board) {
  if (!cells?.length) return;

  if (canAnimate()) {
    const gsap = gsapInstance();
    const pieces = cells.map(cell => cell.querySelector('.piece')).filter(Boolean);

    gsap.timeline()
      .fromTo(
        cells,
        { '--win-flash': 0 },
        { '--win-flash': 1, duration: 0.18, stagger: 0.08, ease: 'power2.out' }
      )
      .fromTo(
        pieces,
        { scale: 1 },
        { scale: 1.13, duration: 0.2, stagger: 0.06, yoyo: true, repeat: 1, ease: 'power1.inOut', clearProps: 'transform' },
        '<'
      );
  }

  createVictoryBurst(board, 24);
}

export function animateModalIn(modal) {
  if (!modal || !canAnimate()) return;

  const card = modal.querySelector('.modal-card');
  if (!card) return;

  gsapInstance().fromTo(
    card,
    { opacity: 0, y: 18, scale: 0.94 },
    { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.7)', clearProps: 'transform' }
  );
}

function createParticles(cell, tone, count) {
  if (reducedMotion.matches) return;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = `move-particle ${tone}`;
    cell.appendChild(particle);

    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const distance = 14 + Math.random() * 14;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    if (canAnimate()) {
      gsapInstance().fromTo(
        particle,
        { x: 0, y: 0, scale: 0.8, opacity: 0.9 },
        {
          x,
          y,
          scale: 0,
          opacity: 0,
          duration: 0.42 + Math.random() * 0.18,
          ease: 'power2.out',
          onComplete: () => particle.remove()
        }
      );
    } else {
      particle.style.setProperty('--particle-x', `${x}px`);
      particle.style.setProperty('--particle-y', `${y}px`);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }
}

function createVictoryBurst(board, count) {
  if (!board || reducedMotion.matches) return;

  const layer = document.createElement('div');
  layer.className = 'victory-particles';
  board.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'victory-particle';
    layer.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 130;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    if (canAnimate()) {
      gsapInstance().fromTo(
        particle,
        { x: 0, y: 0, scale: 0.6 + Math.random() * 0.8, opacity: 0.95 },
        {
          x,
          y,
          rotation: Math.random() * 300 - 150,
          scale: 0,
          opacity: 0,
          duration: 0.8 + Math.random() * 0.45,
          delay: Math.random() * 0.14,
          ease: 'power2.out'
        }
      );
    }
  }

  window.setTimeout(() => layer.remove(), 1500);
}
