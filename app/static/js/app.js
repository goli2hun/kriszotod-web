import {
  cancelGame,
  createGame,
  getCurrentGame,
  getGame,
  getSession,
  login,
  logout,
  sendMove
} from './api.js';
import {
  playClick,
  playError,
  playPlace,
  playWin,
  isSoundEnabled,
  toggleSound,
  unlockAudio
} from './audio.js';
import { BOARD_SIZE, findWinningLine, makeEmptyBoard, playerName } from './game.js';
import {
  animateDifficulty,
  animateModalIn,
  animatePiecePlacement,
  animateTurnCard,
  animateViewIn,
  animateWinningLine,
  initVisualEffects,
  markLastMove,
  setBotThinkingVisual
} from './visual.js';

const loginViewEl = document.querySelector('#loginView');
const modeViewEl = document.querySelector('#modeView');
const gameViewEl = document.querySelector('#gameView');
const loginFormEl = document.querySelector('#loginForm');
const usernameInputEl = document.querySelector('#usernameInput');
const passwordInputEl = document.querySelector('#passwordInput');
const loginButtonEl = document.querySelector('#loginButton');
const loginErrorEl = document.querySelector('#loginError');
const currentUsernameEl = document.querySelector('#currentUsername');
const modeUsernameEl = document.querySelector('#modeUsername');

const modeChoicesEl = document.querySelector('#modeChoices');
const waitingPanelEl = document.querySelector('#waitingPanel');
const pvpButtonEl = document.querySelector('#pvpButton');
const aiButtonEl = document.querySelector('#aiButton');
const cancelWaitingButtonEl = document.querySelector('#cancelWaitingButton');
const modeLogoutButtonEl = document.querySelector('#modeLogoutButton');
const difficultyButtons = [...document.querySelectorAll('.difficulty-button')];

const boardEl = document.querySelector('#board');
const columnLabelsEl = document.querySelector('#columnLabels');
const rowLabelsEl = document.querySelector('#rowLabels');
const statusTextEl = document.querySelector('#statusText');
const statusDotEl = document.querySelector('#statusDot');
const statusPillEl = document.querySelector('#statusPill');
const redPlayerCardEl = document.querySelector('#redPlayerCard');
const bluePlayerCardEl = document.querySelector('#bluePlayerCard');
const redPlayerNameEl = document.querySelector('#redPlayerName');
const redPlayerRoleEl = document.querySelector('#redPlayerRole');
const bluePlayerNameEl = document.querySelector('#bluePlayerName');
const bluePlayerRoleEl = document.querySelector('#bluePlayerRole');
const gameModeTextEl = document.querySelector('#gameModeText');
const gameHintEl = document.querySelector('#gameHint');
const newGameButton = document.querySelector('#newGameButton');
const modalNewGameButton = document.querySelector('#modalNewGameButton');
const logoutButton = document.querySelector('#logoutButton');

const themeToggle = document.querySelector('#themeToggle');
const themeToggleIcon = document.querySelector('#themeToggleIcon');
const themeToggleText = document.querySelector('#themeToggleText');
const soundToggle = document.querySelector('#soundToggle');
const soundToggleIcon = document.querySelector('#soundToggleIcon');
const soundToggleText = document.querySelector('#soundToggleText');

const gameOverEl = document.querySelector('#gameOver');
const winnerTextEl = document.querySelector('#winnerText');
const winnerDotEl = document.querySelector('#winnerDot');
const winnerSubtitleEl = document.querySelector('#winnerSubtitle');

const POLL_MS = 850;
const BOT_THINK_MS = 520;

let board = makeEmptyBoard();
let currentPlayer = 1;
let currentUsername = null;
let gameId = null;
let gameMode = null;
let gameDifficulty = 'normal';
let selectedDifficulty = localStorage.getItem('otodolo-ai-difficulty') || 'normal';
let playerNumber = null;
let player1Name = 'PIROS';
let player2Name = 'KÉK';
let currentStatus = null;
let knownMoveCount = 0;
let locked = false;
let gameFinished = false;
let gameOverTimer = null;
let pollTimer = null;
let pollBusy = false;
let lastTurnPlayer = null;

function buildCoordinates() {
  columnLabelsEl.innerHTML = '';
  rowLabelsEl.innerHTML = '';

  for (let i = 0; i < BOARD_SIZE; i++) {
    columnLabelsEl.insertAdjacentHTML('beforeend', `<span>${String.fromCharCode(65 + i)}</span>`);
    rowLabelsEl.insertAdjacentHTML('beforeend', `<span>${i + 1}</span>`);
  }
}

function buildBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute('aria-label', `${String.fromCharCode(65 + col)}${row + 1}`);
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }
}

function resetBoard() {
  board = makeEmptyBoard();
  knownMoveCount = 0;
  buildBoard();
}

function playerDisplayName(player) {
  return player === 1 ? player1Name : player2Name;
}

function updatePlayerCards() {
  redPlayerNameEl.textContent = player1Name.toUpperCase();
  bluePlayerNameEl.textContent = player2Name.toUpperCase();

  redPlayerRoleEl.textContent = playerNumber === 1 ? 'Piros • Te' : 'Piros • Ellenfél';
  if (gameMode === 'ai') {
    bluePlayerRoleEl.textContent = 'Kék • Bot';
  } else {
    bluePlayerRoleEl.textContent = playerNumber === 2 ? 'Kék • Te' : 'Kék • Ellenfél';
  }

  gameModeTextEl.textContent = gameMode === 'ai'
    ? `BOT • ${difficultyLabel(gameDifficulty)}`
    : 'KÉT JÁTÉKOS';
}

function updateStatus() {
  if (currentStatus !== 'active' || !currentPlayer) return;

  setBotThinkingVisual(false, statusPillEl, bluePlayerCardEl);

  const isRed = currentPlayer === 1;
  const myTurn = playerNumber === currentPlayer && !locked;

  statusTextEl.textContent = playerDisplayName(currentPlayer).toUpperCase();
  statusDotEl.classList.toggle('red', isRed);
  statusDotEl.classList.toggle('blue', !isRed);

  boardEl.classList.toggle('turn-red', isRed);
  boardEl.classList.toggle('turn-blue', !isRed);
  boardEl.classList.toggle('not-your-turn', !myTurn);

  redPlayerCardEl.classList.toggle('active', isRed);
  bluePlayerCardEl.classList.toggle('active', !isRed);

  if (lastTurnPlayer !== currentPlayer) {
    animateTurnCard(isRed ? redPlayerCardEl : bluePlayerCardEl);
    lastTurnPlayer = currentPlayer;
  }

  if (gameMode === 'ai') {
    gameHintEl.textContent = myTurn
      ? `Te következel • Bot nehézség: ${difficultyLabel(gameDifficulty)}`
      : 'A bot gondolkodik…';
  } else {
    gameHintEl.textContent = myTurn
      ? 'Te következel.'
      : `Várakozás ${playerDisplayName(currentPlayer)} lépésére…`;
  }

  newGameButton.disabled = gameMode === 'pvp' && !gameFinished;
}

function showBotThinking() {
  currentPlayer = 2;
  statusTextEl.textContent = 'BOT GONDOLKODIK…';
  statusDotEl.classList.remove('red');
  statusDotEl.classList.add('blue');
  boardEl.classList.remove('turn-red');
  boardEl.classList.add('turn-blue', 'not-your-turn');
  redPlayerCardEl.classList.remove('active');
  bluePlayerCardEl.classList.add('active');
  setBotThinkingVisual(true, statusPillEl, bluePlayerCardEl);
  gameHintEl.textContent = 'A bot gondolkodik…';
}

function renderPiece(cell, player, animate = true) {
  const piece = document.createElement('span');
  piece.className = `piece ${player === 1 ? 'red' : 'blue'}`;
  if (!animate) piece.classList.add('no-animation');
  cell.appendChild(piece);
  cell.classList.add('occupied');

  if (animate) {
    cell.classList.add('just-placed');
    animatePiecePlacement(cell, player);
    window.setTimeout(() => cell.classList.remove('just-placed'), 700);
  }
}

function renderMove(move, animate = true) {
  const row = Number(move.row_idx);
  const col = Number(move.col_idx);
  const player = Number(move.player);

  if (board[row][col] !== 0) return;

  board[row][col] = player;
  const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    renderPiece(cell, player, animate);
    markLastMove(cell, animate);
  }
  if (animate) playPlace(player);
}

async function syncMoves(moves, animateNew = true) {
  const start = knownMoveCount;

  for (let i = start; i < moves.length; i++) {
    const move = moves[i];

    if (animateNew && gameMode === 'ai' && Number(move.player) === 2 && i > start) {
      showBotThinking();
      await sleep(BOT_THINK_MS);
    }

    renderMove(move, animateNew);
    knownMoveCount = i + 1;
  }
}

function markInvalidCell(cell) {
  cell.classList.remove('invalid');
  void cell.offsetWidth;
  cell.classList.add('invalid');
  window.setTimeout(() => cell.classList.remove('invalid'), 280);
}

function highlightWinningLine(line) {
  const cells = [];

  for (const [row, col] of line) {
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add('winning');
      cells.push(cell);
    }
  }

  animateWinningLine(cells, boardEl);
}

function clearGameOverTimer() {
  if (gameOverTimer !== null) {
    window.clearTimeout(gameOverTimer);
    gameOverTimer = null;
  }
}

function showGameResult(winner) {
  gameFinished = true;
  currentPlayer = null;
  boardEl.classList.remove('turn-red', 'turn-blue');
  boardEl.classList.add('not-your-turn');
  redPlayerCardEl.classList.remove('active');
  bluePlayerCardEl.classList.remove('active');
  setBotThinkingVisual(false, statusPillEl, bluePlayerCardEl);
  newGameButton.disabled = false;

  if (winner) {
    const isRed = winner === 1;
    const name = playerDisplayName(winner).toUpperCase();

    statusTextEl.textContent = `${name} NYERT`;
    statusDotEl.classList.toggle('red', isRed);
    statusDotEl.classList.toggle('blue', !isRed);
    winnerTextEl.textContent = `${name} NYERT!`;
    winnerDotEl.classList.remove('hidden');
    winnerDotEl.classList.toggle('red', isRed);
    winnerDotEl.classList.toggle('blue', !isRed);
    winnerSubtitleEl.textContent = 'ÖT EGYMÁS MELLETT';
    playWin();
  } else {
    statusTextEl.textContent = 'DÖNTETLEN';
    winnerTextEl.textContent = 'DÖNTETLEN';
    winnerDotEl.classList.add('hidden');
    winnerSubtitleEl.textContent = 'BETELT A TÁBLA';
  }

  gameHintEl.textContent = 'A parti véget ért. Indíthatsz új játékot.';
  clearGameOverTimer();
  gameOverTimer = window.setTimeout(() => {
    gameOverEl.classList.remove('hidden');
    animateModalIn(gameOverEl);
  }, 780);
}

async function applyGameState(state, { initial = false, animateNew = true } = {}) {
  const changedGame = gameId !== state.game_id;
  gameId = state.game_id;
  gameMode = state.mode;
  gameDifficulty = state.difficulty || 'normal';
  playerNumber = state.player_number;
  player1Name = state.player1_name;
  player2Name = state.player2_name;
  currentStatus = state.status;

  updatePlayerCards();

  if (initial || changedGame) {
    resetBoard();
    for (const move of state.moves) renderMove(move, false);
    knownMoveCount = state.moves.length;
  } else {
    await syncMoves(state.moves, animateNew);
  }

  if (state.status === 'finished') {
    if (!gameFinished) {
      gameFinished = true;
      if (state.winner && state.moves.length) {
        const lastMove = [...state.moves].reverse().find(move => Number(move.player) === Number(state.winner));
        if (lastMove) {
          const line = findWinningLine(
            board,
            Number(lastMove.row_idx),
            Number(lastMove.col_idx),
            Number(state.winner)
          );
          highlightWinningLine(line);
        }
      }
      window.setTimeout(() => showGameResult(state.winner), 180);
    }
    return;
  }

  gameFinished = false;
  currentPlayer = state.next_player;
  updateStatus();
}

async function onCellClick(event) {
  if (
    locked ||
    gameFinished ||
    !gameId ||
    currentStatus !== 'active' ||
    playerNumber !== currentPlayer
  ) return;

  unlockAudio();

  const cell = event.currentTarget;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  if (board[row][col] !== 0) {
    markInvalidCell(cell);
    playError();
    return;
  }

  locked = true;
  updateStatus();

  try {
    const result = await sendMove(gameId, row, col);
    await applyGameState(result, { animateNew: true });
  } catch (error) {
    playError();

    if (isAuthError(error)) {
      showLogin();
      return;
    }

    alert(error.message);
    await refreshGameSilently();
  } finally {
    locked = false;
    if (!gameFinished && currentStatus === 'active') updateStatus();
  }
}

async function startPvpGame() {
  unlockAudio();
  setModeBusy(true);

  try {
    const state = await createGame('pvp', 'normal');
    if (state.status === 'waiting') {
      showWaiting(state);
    } else {
      await enterGame(state);
    }
  } catch (error) {
    handleModeError(error);
  } finally {
    setModeBusy(false);
  }
}

async function startAiGame() {
  unlockAudio();
  setModeBusy(true);

  try {
    const state = await createGame('ai', selectedDifficulty);
    await enterGame(state);
  } catch (error) {
    handleModeError(error);
  } finally {
    setModeBusy(false);
  }
}

async function startNewGame() {
  clearGameOverTimer();
  gameOverEl.classList.add('hidden');

  if (gameMode === 'ai') {
    const state = await createGame('ai', gameDifficulty);
    await enterGame(state);
    return;
  }

  if (gameMode === 'pvp' && gameFinished) {
    showMode(currentUsername);
    await startPvpGame();
  }
}

function showWaiting(state) {
  stopPolling();
  gameId = state.game_id;
  gameMode = 'pvp';
  currentStatus = 'waiting';
  playerNumber = state.player_number;
  gameFinished = false;

  loginViewEl.classList.add('hidden');
  gameViewEl.classList.add('hidden');
  modeViewEl.classList.remove('hidden');
  modeChoicesEl.classList.add('hidden');
  waitingPanelEl.classList.remove('hidden');
  animateViewIn(modeViewEl);
  startPolling();
}

async function cancelWaiting() {
  if (!gameId || currentStatus !== 'waiting') {
    showMode(currentUsername);
    return;
  }

  cancelWaitingButtonEl.disabled = true;
  try {
    await cancelGame(gameId);
    showMode(currentUsername);
  } catch (error) {
    // If the other player joined just before the cancel click, continue the game.
    if (error.message.includes('már csatlakozott')) {
      const state = await getGame(gameId);
      await enterGame(state);
    } else if (isAuthError(error)) {
      showLogin();
    } else {
      alert(error.message);
    }
  } finally {
    cancelWaitingButtonEl.disabled = false;
  }
}

async function enterGame(state) {
  stopPolling();
  clearGameOverTimer();
  gameOverEl.classList.add('hidden');
  loginViewEl.classList.add('hidden');
  modeViewEl.classList.add('hidden');
  gameViewEl.classList.remove('hidden');
  currentUsernameEl.textContent = currentUsername || '—';
  locked = false;
  gameFinished = false;
  lastTurnPlayer = null;

  await applyGameState(state, { initial: true, animateNew: false });
  animateViewIn(gameViewEl);

  if (state.mode === 'pvp' && state.status === 'active') startPolling();
}

function showMode(username) {
  stopPolling();
  clearGameOverTimer();
  gameOverEl.classList.add('hidden');
  gameViewEl.classList.add('hidden');
  loginViewEl.classList.add('hidden');
  modeViewEl.classList.remove('hidden');
  modeChoicesEl.classList.remove('hidden');
  waitingPanelEl.classList.add('hidden');
  modeUsernameEl.textContent = username || '—';
  gameId = null;
  gameMode = null;
  currentStatus = null;
  playerNumber = null;
  gameFinished = false;
  lastTurnPlayer = null;
  setModeBusy(false);
  animateViewIn(modeViewEl);
}

function showLogin() {
  stopPolling();
  clearGameOverTimer();
  gameId = null;
  gameMode = null;
  currentStatus = null;
  playerNumber = null;
  gameFinished = false;
  gameOverEl.classList.add('hidden');
  gameViewEl.classList.add('hidden');
  modeViewEl.classList.add('hidden');
  loginViewEl.classList.remove('hidden');
  passwordInputEl.value = '';
  loginErrorEl.classList.add('hidden');
  animateViewIn(loginViewEl);
  window.setTimeout(() => usernameInputEl.focus(), 0);
}

async function resumeOrShowMode() {
  try {
    const result = await getCurrentGame();
    if (!result.game) {
      showMode(currentUsername);
      return;
    }

    if (result.game.status === 'waiting') {
      showWaiting(result.game);
    } else {
      await enterGame(result.game);
    }
  } catch (error) {
    if (isAuthError(error)) showLogin();
    else showMode(currentUsername);
  }
}

async function onLoginSubmit(event) {
  event.preventDefault();
  unlockAudio();

  loginErrorEl.classList.add('hidden');
  loginButtonEl.disabled = true;
  loginButtonEl.textContent = 'BELÉPÉS...';

  try {
    const result = await login(usernameInputEl.value, passwordInputEl.value);
    currentUsername = result.username;
    playClick();
    await resumeOrShowMode();
  } catch (error) {
    playError();
    loginErrorEl.textContent = error.message;
    loginErrorEl.classList.remove('hidden');
    passwordInputEl.select();
  } finally {
    loginButtonEl.disabled = false;
    loginButtonEl.textContent = 'BELÉPÉS';
  }
}

async function onLogout() {
  stopPolling();

  if (currentStatus === 'waiting' && gameId) {
    try {
      await cancelGame(gameId);
    } catch {
      // A másik játékos közben beléphetett; kijelentkezéskor ezt nem blokkoljuk.
    }
  }

  try {
    await logout();
  } catch {
    // Akkor is visszatérünk a login képernyőre, ha a session már lejárt.
  }

  currentUsername = null;
  showLogin();
}

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(pollGame, POLL_MS);
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  pollBusy = false;
}

async function pollGame() {
  if (!gameId || pollBusy || locked) return;
  pollBusy = true;

  try {
    const state = await getGame(gameId);

    if (currentStatus === 'waiting' && state.status === 'active') {
      await enterGame(state);
      return;
    }

    if (gameViewEl.classList.contains('hidden')) return;
    await applyGameState(state, { animateNew: true });

    if (state.status === 'finished') stopPolling();
  } catch (error) {
    if (isAuthError(error)) showLogin();
  } finally {
    pollBusy = false;
  }
}

async function refreshGameSilently() {
  if (!gameId) return;
  try {
    const state = await getGame(gameId);
    await applyGameState(state, { animateNew: false });
  } catch {
    // Az eredeti hibaüzenet fontosabb, a háttérfrissítés csak korrekció.
  }
}

function setModeBusy(busy) {
  pvpButtonEl.disabled = busy;
  aiButtonEl.disabled = busy;
  difficultyButtons.forEach(button => { button.disabled = busy; });
}

function handleModeError(error) {
  playError();
  if (isAuthError(error)) showLogin();
  else alert(error.message);
}

function selectDifficulty(difficulty) {
  selectedDifficulty = ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal';
  localStorage.setItem('otodolo-ai-difficulty', selectedDifficulty);
  difficultyButtons.forEach(button => {
    const active = button.dataset.difficulty === selectedDifficulty;
    button.classList.toggle('active', active);
    if (active) animateDifficulty(button);
  });
}

function difficultyLabel(difficulty) {
  return ({ easy: 'Könnyű', normal: 'Normál', hard: 'Nehéz' })[difficulty] || 'Normál';
}

function isAuthError(error) {
  return error?.message === 'Bejelentkezés szükséges.';
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function applyTheme(theme) {
  const isIvory = theme === 'ivory';
  document.documentElement.dataset.theme = isIvory ? 'ivory' : 'midnight';
  themeToggleIcon.textContent = isIvory ? '☾' : '☀';
  themeToggleText.textContent = isIvory ? 'SÖTÉT' : 'VILÁGOS';
  themeToggle.setAttribute('aria-label', isIvory ? 'Váltás sötét designra' : 'Váltás világos designra');
  themeToggle.title = isIvory ? 'Midnight design' : 'Ivory design';
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'midnight' ? 'ivory' : 'midnight';
  applyTheme(next);
  localStorage.setItem('otodolo-theme', next);
}

function loadTheme() {
  const saved = localStorage.getItem('otodolo-theme');
  applyTheme(saved === 'ivory' ? 'ivory' : 'midnight');
}

function updateSoundToggle() {
  const enabled = isSoundEnabled();
  soundToggleIcon.textContent = enabled ? '🔊' : '🔇';
  soundToggleText.textContent = enabled ? 'HANG' : 'NÉMA';
  soundToggle.classList.toggle('muted', !enabled);
  soundToggle.setAttribute('aria-pressed', enabled ? 'false' : 'true');
  soundToggle.setAttribute('aria-label', enabled ? 'Hang kikapcsolása' : 'Hang bekapcsolása');
  soundToggle.title = enabled ? 'Hang kikapcsolása' : 'Hang bekapcsolása';
}

function onSoundToggle() {
  const enabled = toggleSound();
  updateSoundToggle();
  if (enabled) playClick();
}

async function initialize() {
  loadTheme();
  initVisualEffects();
  updateSoundToggle();
  selectDifficulty(selectedDifficulty);
  buildCoordinates();

  try {
    const session = await getSession();
    if (session.authenticated) {
      currentUsername = session.username;
      await resumeOrShowMode();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.classList.contains('cell') || button === soundToggle || button === loginButtonEl) return;
  playClick();
});

loginFormEl.addEventListener('submit', onLoginSubmit);
pvpButtonEl.addEventListener('click', startPvpGame);
aiButtonEl.addEventListener('click', startAiGame);
cancelWaitingButtonEl.addEventListener('click', cancelWaiting);
modeLogoutButtonEl.addEventListener('click', onLogout);
difficultyButtons.forEach(button => {
  button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
});
newGameButton.addEventListener('click', () => startNewGame().catch(error => handleModeError(error)));
modalNewGameButton.addEventListener('click', () => startNewGame().catch(error => handleModeError(error)));
logoutButton.addEventListener('click', onLogout);
themeToggle.addEventListener('click', toggleTheme);
soundToggle.addEventListener('click', onSoundToggle);

initialize();
