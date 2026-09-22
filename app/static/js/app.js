import { createGame, sendMove } from './api.js';
import { BOARD_SIZE, makeEmptyBoard, playerName } from './game.js';

const boardEl = document.querySelector('#board');
const columnLabelsEl = document.querySelector('#columnLabels');
const rowLabelsEl = document.querySelector('#rowLabels');
const statusTextEl = document.querySelector('#statusText');
const statusDotEl = document.querySelector('#statusDot');
const newGameButton = document.querySelector('#newGameButton');
const modalNewGameButton = document.querySelector('#modalNewGameButton');
const exitButton = document.querySelector('#exitButton');
const themeToggle = document.querySelector('#themeToggle');
const themeToggleIcon = document.querySelector('#themeToggleIcon');
const themeToggleText = document.querySelector('#themeToggleText');
const gameOverEl = document.querySelector('#gameOver');
const winnerTextEl = document.querySelector('#winnerText');

let board = makeEmptyBoard();
let currentPlayer = 1;
let gameId = null;
let locked = false;

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
}

function renderPiece(cell, player) {
  const piece = document.createElement('span');
  piece.className = `piece ${player === 1 ? 'red' : 'blue'}`;
  cell.appendChild(piece);
  cell.classList.add('occupied');
}

async function onCellClick(event) {
  if (locked || !gameId) return;

  const cell = event.currentTarget;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  if (board[row][col] !== 0) return;

  locked = true;

  try {
    const result = await sendMove(gameId, row, col);
    board[row][col] = result.player;
    renderPiece(cell, result.player);

    if (result.winner) {
      winnerTextEl.textContent = `${playerName(result.winner)} NYERT!`;
      gameOverEl.classList.remove('hidden');
    } else {
      currentPlayer = result.next_player;
      updateStatus();
    }
  } catch (error) {
    alert(error.message);
  } finally {
    locked = false;
  }
}

async function startNewGame() {
  locked = true;

  try {
    const result = await createGame();
    gameId = result.game_id;
    board = makeEmptyBoard();
    currentPlayer = 1;
    gameOverEl.classList.add('hidden');
    buildBoard();
    updateStatus();
  } catch (error) {
    alert(error.message);
  } finally {
    locked = false;
  }
}

function applyTheme(theme) {
  const isIvory = theme === 'ivory';
  document.documentElement.dataset.theme = isIvory ? 'ivory' : 'midnight';

  // A gomb mindig azt mutatja, hogy mire fog átváltani.
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

newGameButton.addEventListener('click', startNewGame);
modalNewGameButton.addEventListener('click', startNewGame);
themeToggle.addEventListener('click', toggleTheme);
exitButton.addEventListener('click', () => {
  window.location.href = 'about:blank';
});

loadTheme();
buildCoordinates();
startNewGame();
