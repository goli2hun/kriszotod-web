import { createGame, getSession, login, logout, sendMove } from './api.js';
import { playClick, playError, playPlace, playWin, isSoundEnabled, toggleSound } from './audio.js';
import { BOARD_SIZE, findWinningLine, makeEmptyBoard, playerName } from './game.js';

const loginViewEl = document.querySelector('#loginView');
const gameViewEl = document.querySelector('#gameView');
const loginFormEl = document.querySelector('#loginForm');
const usernameInputEl = document.querySelector('#usernameInput');
const passwordInputEl = document.querySelector('#passwordInput');
const loginButtonEl = document.querySelector('#loginButton');
const loginErrorEl = document.querySelector('#loginError');
const currentUsernameEl = document.querySelector('#currentUsername');

const boardEl = document.querySelector('#board');
const columnLabelsEl = document.querySelector('#columnLabels');
const rowLabelsEl = document.querySelector('#rowLabels');
const statusTextEl = document.querySelector('#statusText');
const statusDotEl = document.querySelector('#statusDot');
const redPlayerCardEl = document.querySelector('#redPlayerCard');
const bluePlayerCardEl = document.querySelector('#bluePlayerCard');
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

let board = makeEmptyBoard();
let currentPlayer = 1;
let gameId = null;
let locked = false;
let gameFinished = false;
let gameOverTimer = null;

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

function updateStatus() {
  const isRed = currentPlayer === 1;

  statusTextEl.textContent = playerName(currentPlayer);
  statusDotEl.classList.toggle('red', isRed);
  statusDotEl.classList.toggle('blue', !isRed);

  boardEl.classList.toggle('turn-red', isRed);
  boardEl.classList.toggle('turn-blue', !isRed);

  redPlayerCardEl.classList.toggle('active', isRed);
  bluePlayerCardEl.classList.toggle('active', !isRed);
}

function renderPiece(cell, player) {
  const piece = document.createElement('span');
  piece.className = `piece ${player === 1 ? 'red' : 'blue'}`;
  cell.appendChild(piece);
  cell.classList.add('occupied', 'just-placed');

  window.setTimeout(() => {
    cell.classList.remove('just-placed');
  }, 360);
}

function markInvalidCell(cell) {
  cell.classList.remove('invalid');
  void cell.offsetWidth;
  cell.classList.add('invalid');

  window.setTimeout(() => {
    cell.classList.remove('invalid');
  }, 280);
}

function highlightWinningLine(line) {
  for (const [row, col] of line) {
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell?.classList.add('winning');
  }
}

function showWinner(player) {
  const isRed = player === 1;

  statusTextEl.textContent = `${playerName(player)} NYERT`;
  statusDotEl.classList.toggle('red', isRed);
  statusDotEl.classList.toggle('blue', !isRed);

  boardEl.classList.remove('turn-red', 'turn-blue');
  redPlayerCardEl.classList.toggle('active', isRed);
  bluePlayerCardEl.classList.toggle('active', !isRed);

  winnerTextEl.textContent = `${playerName(player)} NYERT!`;
  winnerDotEl.classList.toggle('red', isRed);
  winnerDotEl.classList.toggle('blue', !isRed);

  playWin();

  gameOverTimer = window.setTimeout(() => {
    gameOverEl.classList.remove('hidden');
  }, 780);
}

async function onCellClick(event) {
  if (locked || gameFinished || !gameId) return;

  const cell = event.currentTarget;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  if (board[row][col] !== 0) {
    markInvalidCell(cell);
    playError();
    return;
  }

  locked = true;

  try {
    const result = await sendMove(gameId, row, col);
    board[row][col] = result.player;
    renderPiece(cell, result.player);
    playPlace(result.player);

    if (result.winner) {
      gameFinished = true;
      const winningLine = findWinningLine(board, row, col, result.player);
      highlightWinningLine(winningLine);
      window.setTimeout(() => showWinner(result.winner), 180);
    } else {
      currentPlayer = result.next_player;
      updateStatus();
    }
  } catch (error) {
    playError();

    if (error.message === 'Bejelentkezés szükséges.') {
      showLogin();
      return;
    }

    alert(error.message);
  } finally {
    locked = false;
  }
}

async function startNewGame() {
  locked = true;
  gameFinished = false;

  if (gameOverTimer !== null) {
    window.clearTimeout(gameOverTimer);
    gameOverTimer = null;
  }

  try {
    const result = await createGame();
    gameId = result.game_id;
    board = makeEmptyBoard();
    currentPlayer = 1;
    gameOverEl.classList.add('hidden');
    buildBoard();
    updateStatus();
  } catch (error) {
    playError();

    if (error.message === 'Bejelentkezés szükséges.') {
      showLogin();
      return;
    }

    alert(error.message);
  } finally {
    locked = false;
  }
}

function showLogin() {
  gameId = null;
  gameFinished = false;
  gameOverEl.classList.add('hidden');
  gameViewEl.classList.add('hidden');
  loginViewEl.classList.remove('hidden');
  passwordInputEl.value = '';
  loginErrorEl.classList.add('hidden');
  window.setTimeout(() => usernameInputEl.focus(), 0);
}

async function showGame(username) {
  currentUsernameEl.textContent = username;
  loginViewEl.classList.add('hidden');
  gameViewEl.classList.remove('hidden');
  await startNewGame();
}

async function onLoginSubmit(event) {
  event.preventDefault();

  loginErrorEl.classList.add('hidden');
  loginButtonEl.disabled = true;
  loginButtonEl.textContent = 'BELÉPÉS...';

  try {
    const result = await login(usernameInputEl.value, passwordInputEl.value);
    playClick();
    await showGame(result.username);
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
  try {
    await logout();
  } catch {
    // Kijelentkezésnél akkor is visszatérünk a login képernyőre,
    // ha a session a szerveren már lejárt.
  }

  showLogin();
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
  updateSoundToggle();
  buildCoordinates();

  try {
    const session = await getSession();

    if (session.authenticated) {
      await showGame(session.username);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');

  if (!button || button.classList.contains('cell') || button === soundToggle || button === loginButtonEl) {
    return;
  }

  playClick();
});

loginFormEl.addEventListener('submit', onLoginSubmit);
newGameButton.addEventListener('click', startNewGame);
modalNewGameButton.addEventListener('click', startNewGame);
logoutButton.addEventListener('click', onLogout);
themeToggle.addEventListener('click', toggleTheme);
soundToggle.addEventListener('click', onSoundToggle);

initialize();
