// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы интерфейса
const settingsDiv = document.getElementById('settings');
const boardContainer = document.getElementById('board-container');
const boardSizeSelect = document.getElementById('board-size');
const botLevelSelect = document.getElementById('bot-level');
const startGameBtn = document.getElementById('start-game');
const canvas = document.getElementById('go-board');
const ctx = canvas.getContext('2d');
const currentPlayerSpan = document.getElementById('current-player');
const passButton = document.getElementById('pass-button');
const resignButton = document.getElementById('resign-button');
const newGameButton = document.getElementById('new-game-button');

// Параметры игры
let boardSize = 19;
let botLevel = 2;
let gameStarted = false;
let currentPlayer = 'black';
let boardState = [];
let lastMove = null;
let passes = 0;

// Инициализация игры
function initGame() {
    boardSize = parseInt(boardSizeSelect.value);
    botLevel = parseInt(botLevelSelect.value);
    
    boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    currentPlayer = 'black';
    passes = 0;
    lastMove = null;
    
    const cellSize = Math.min(400 / boardSize, 30);
    canvas.width = cellSize * boardSize;
    canvas.height = cellSize * boardSize;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    
    currentPlayerSpan.textContent = currentPlayer === 'black' ? 'Чёрные' : 'Белые';
    currentPlayerSpan.style.color = currentPlayer === 'black' ? 'black' : 'white';
    currentPlayerSpan.style.fontWeight = 'bold';
    
    settingsDiv.style.display = 'none';
    boardContainer.style.display = 'block';
    
    gameStarted = true;
    drawBoard();
    
    if (currentPlayer === 'white') {
        setTimeout(makeBotMove, 500);
    }
}

// Отрисовка доски
function drawBoard() {
    const cellSize = canvas.width / boardSize;
    
    ctx.fillStyle = '#dcb35c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < boardSize; i++) {
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, i * cellSize + cellSize / 2);
        ctx.lineTo(canvas.width - cellSize / 2, i * cellSize + cellSize / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(i * cellSize + cellSize / 2, cellSize / 2);
        ctx.lineTo(i * cellSize + cellSize / 2, canvas.height - cellSize / 2);
        ctx.stroke();
    }
    
    // Рисуем точки (хоси) на пересечениях
    if (boardSize === 19) {
        const points = [3, 9, 15];
        ctx.fillStyle = '#000';
        points.forEach(x => {
            points.forEach(y => {
                ctx.beginPath();
                ctx.arc(
                    (x + 0.5) * cellSize,
                    (y + 0.5) * cellSize, 
                    cellSize / 8, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            });
        });
    } else if (boardSize === 13) {
        const points = [3, 6, 9];
        ctx.fillStyle = '#000';
        points.forEach(x => {
            points.forEach(y => {
                ctx.beginPath();
                ctx.arc(
                    (x + 0.5) * cellSize,
                    (y + 0.5) * cellSize, 
                    cellSize / 8, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            });
        });
    } else if (boardSize === 9) {
        const points = [2, 4, 6];
        ctx.fillStyle = '#000';
        points.forEach(x => {
            points.forEach(y => {
                ctx.beginPath();
                ctx.arc(
                    (x + 0.5) * cellSize,
                    (y + 0.5) * cellSize, 
                    cellSize / 8, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            });
        });
    }
    
    // Рисуем камни
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (boardState[y][x]) {
                drawStone(x, y, boardState[y][x]);
            }
        }
    }
    
    // Подсвечиваем последний ход
    if (lastMove) {
        const [x, y] = lastMove;
        const cellSize = canvas.width / boardSize;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            (x + 0.5) * cellSize,
            (y + 0.5) * cellSize,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }
}

function drawStone(x, y, color) {
    const cellSize = canvas.width / boardSize;
    const stoneX = (x + 0.5) * cellSize;
    const stoneY = (y + 0.5) * cellSize;
    const radius = cellSize / 2 - 2;
    
    const gradient = ctx.createRadialGradient(
        stoneX - radius / 3,
        stoneY - radius / 3,
        radius / 10,
        stoneX,
        stoneY,
        radius
    );
    
    if (color === 'black') {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ddd');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(stoneX, stoneY, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Поиск группы камней
function findGroup(x, y, color, group = [], visited = new Set()) {
    const key = `${x},${y}`;
    if (visited.has(key)) return group;
    visited.add(key);
    
    if (boardState[y][x] !== color) return group;
    
    group.push([x, y]);
    
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            findGroup(nx, ny, color, group, visited);
        }
    }
    
    return group;
}

// Проверка, есть ли у камня/группы дыхания
function hasLiberties(x, y, color = null, visited = new Set()) {
    if (!color) color = boardState[y][x];
    const key = `${x},${y}`;
    
    if (visited.has(key)) return false;
    visited.add(key);
    
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            if (boardState[ny][nx] === null) return true;
            if (boardState[ny][nx] === color && hasLiberties(nx, ny, color, visited)) {
                return true;
            }
        }
    }
    
    return false;
}

// Удаление захваченных камней
function removeCapturedStones(x, y) {
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const removedStones = [];
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === opponent) {
            const group = findGroup(nx, ny, opponent);
            let groupHasLiberties = false;
            
            for (const [gx, gy] of group) {
                if (hasLiberties(gx, gy, opponent, new Set())) {
                    groupHasLiberties = true;
                    break;
                }
            }
            
            if (!groupHasLiberties) {
                for (const [gx, gy] of group) {
                    boardState[gy][gx] = null;
                    removedStones.push([gx, gy]);
                }
            }
        }
    }
    
    return removedStones;
}

// Сделать ход
function makeMove(x, y) {
    if (boardState[y][x] !== null) return false;
    
    if (lastMove && JSON.stringify(lastMove) === JSON.stringify([x, y])) {
        return false;
    }
    
    boardState[y][x] = currentPlayer;
    const removedStones = removeCapturedStones(x, y);
    
    // Проверка на самоубийство
    if (!hasLiberties(x, y) && removedStones.length === 0) {
        boardState[y][x] = null;
        return false;
    }
    
    lastMove = [x, y];
    passes = 0;
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    currentPlayerSpan.textContent = currentPlayer === 'black' ? 'Чёрные' : 'Белые';
    currentPlayerSpan.style.color = currentPlayer === 'black' ? 'black' : 'white';
    
    drawBoard();
    
    if (currentPlayer === 'white') {
        setTimeout(makeBotMove, 500);
    }
    
    return true;
}

// Ход бота
function makeBotMove() {
    if (!gameStarted || currentPlayer !== 'white') return;
    
    let x, y;
    const attempts = 100;
    
    for (let i = 0; i < attempts; i++) {
        if (botLevel === 3 && i < 50 && lastMove) {
            x = lastMove[0] + Math.floor(Math.random() * 5) - 2;
            y = lastMove[1] + Math.floor(Math.random() * 5) - 2;
        } else if (botLevel >= 2 && i < 30) {
            const center = Math.floor(boardSize / 2);
            x = center + Math.floor(Math.random() * 3) - 1;
            y = center + Math.floor(Math.random() * 3) - 1;
        } else {
            x = Math.floor(Math.random() * boardSize);
            y = Math.floor(Math.random() * boardSize);
        }
        
        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && boardState[y][x] === null) {
            boardState[y][x] = 'white';
            const removedStones = removeCapturedStones(x, y);
            
            if (hasLiberties(x, y) || removedStones.length > 0) {
                boardState[y][x] = null;
                if (makeMove(x, y)) return;
            } else {
                boardState[y][x] = null;
            }
        }
    }
    
    pass();
}

// Пас
function pass() {
    passes++;
    lastMove = null;
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    currentPlayerSpan.textContent = currentPlayer === 'black' ? 'Чёрные' : 'Белые';
    currentPlayerSpan.style.color = currentPlayer === 'black' ? 'black' : 'white';
    
    if (passes >= 2) {
        endGame();
    } else if (currentPlayer === 'white') {
        setTimeout(makeBotMove, 500);
    }
}

// Сдаться
function resign() {
    const winner = currentPlayer === 'black' ? 'Белые' : 'Чёрные';
    alert(`Игра окончена. ${winner} побеждают!`);
    newGame();
}

// Завершение игры
function endGame() {
    let blackScore = 0;
    let whiteScore = 6.5; // коми
    
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (boardState[y][x] === 'black') blackScore++;
            else if (boardState[y][x] === 'white') whiteScore++;
            else {
                const visited = new Set();
                const owner = determineTerritoryOwner(x, y, visited);
                if (owner === 'black') blackScore++;
                else if (owner === 'white') whiteScore++;
            }
        }
    }
    
    let resultMessage;
    if (blackScore > whiteScore) {
        resultMessage = `Игра окончена. Чёрные побеждают ${blackScore.toFixed(1)} : ${whiteScore.toFixed(1)}`;
    } else {
        resultMessage = `Игра окончена. Белые побеждают ${whiteScore.toFixed(1)} : ${blackScore.toFixed(1)}`;
    }
    
    alert(resultMessage);
    newGame();
}

// Определение владельца территории
function determineTerritoryOwner(x, y, visited) {
    const key = `${x},${y}`;
    if (visited.has(key)) return null;
    visited.add(key);
    
    if (boardState[y][x] === 'black') return 'black';
    if (boardState[y][x] === 'white') return 'white';
    
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let owner = null;
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            const cellOwner = determineTerritoryOwner(nx, ny, visited);
            if (cellOwner) {
                if (owner && owner !== cellOwner) return null;
                owner = cellOwner;
            }
        }
    }
    
    return owner;
}

// Новая игра
function newGame() {
    settingsDiv.style.display = 'block';
    boardContainer.style.display = 'none';
    gameStarted = false;
}

// Обработка клика по доске
canvas.addEventListener('click', (e) => {
    if (!gameStarted || currentPlayer === 'white') return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellSize = canvas.width / boardSize;
    const boardX = Math.floor(x / cellSize);
    const boardY = Math.floor(y / cellSize);
    
    if (boardX >= 0 && boardX < boardSize && boardY >= 0 && boardY < boardSize) {
        makeMove(boardX, boardY);
    }
});

// Обработчики кнопок
startGameBtn.addEventListener('click', initGame);
passButton.addEventListener('click', pass);
resignButton.addEventListener('click', resign);
newGameButton.addEventListener('click', newGame);
