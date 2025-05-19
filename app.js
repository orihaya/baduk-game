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
let koPoint = null;

// Инициализация игры
function initGame() {
    boardSize = parseInt(boardSizeSelect.value);
    botLevel = parseInt(botLevelSelect.value);
    
    boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    currentPlayer = 'black';
    passes = 0;
    lastMove = null;
    koPoint = null;
    
    updateBoardSize();
    
    currentPlayerSpan.textContent = 'Чёрные';
    currentPlayerSpan.style.color = 'black';
    
    settingsDiv.style.display = 'none';
    boardContainer.style.display = 'block';
    
    gameStarted = true;
    drawBoard();
    
    if (currentPlayer === 'white') {
        setTimeout(makeBotMove, 500);
    }
}

// Обновление размера доски
function updateBoardSize() {
    const availableWidth = Math.min(window.innerWidth - 30, 600);
    const availableHeight = window.innerHeight - 200;
    const maxCellSize = Math.min(Math.floor(availableWidth / boardSize), Math.floor(availableHeight / boardSize));
    const cellSize = Math.min(maxCellSize, 30);
    
    canvas.width = cellSize * boardSize;
    canvas.height = cellSize * boardSize;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
}

// Отрисовка доски
function drawBoard() {
    const cellSize = canvas.width / boardSize;
    
    // Очистка canvas
    ctx.fillStyle = '#dcb35c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < boardSize; i++) {
        // Горизонтальные линии
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, i * cellSize + cellSize / 2);
        ctx.lineTo(canvas.width - cellSize / 2, i * cellSize + cellSize / 2);
        ctx.stroke();
        
        // Вертикальные линии
        ctx.beginPath();
        ctx.moveTo(i * cellSize + cellSize / 2, cellSize / 2);
        ctx.lineTo(i * cellSize + cellSize / 2, canvas.height - cellSize / 2);
        ctx.stroke();
    }
    
    // Рисуем точки (хоси)
    const drawHoshi = (points) => {
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
    };

    if (boardSize === 19) drawHoshi([3, 9, 15]);
    else if (boardSize === 13) drawHoshi([3, 6, 9]);
    else if (boardSize === 9) drawHoshi([2, 4, 6]);
    
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

// Рисование камня
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

// Проверка на дыхания
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
    
    // Проверка на ко (если захвачен ровно один камень)
    if (removedStones.length === 1) {
        koPoint = removedStones[0];
    } else {
        koPoint = null;
    }
    
    return removedStones;
}

// Сделать ход
function makeMove(x, y) {
    // Проверка на ко
    if (koPoint && koPoint[0] === x && koPoint[1] === y) {
        return false;
    }
    
    if (boardState[y][x] !== null) return false;
    
    // Временная установка камня
    boardState[y][x] = currentPlayer;
    const removedStones = removeCapturedStones(x, y);
    
    // Проверка на самоубийство
    if (!hasLiberties(x, y) && removedStones.length === 0) {
        boardState[y][x] = null;
        return false;
    }
    
    // Ход valid
    lastMove = [x, y];
    passes = 0;
    
    // Смена игрока
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    currentPlayerSpan.textContent = currentPlayer === 'black' ? 'Чёрные' : 'Белые';
    currentPlayerSpan.style.color = currentPlayer === 'black' ? 'black' : 'white';
    
    drawBoard();
    
    // Если следующий ход бота
    if (currentPlayer === 'white') {
        setTimeout(makeBotMove, 500);
    }
    
    return true;
}

// Ход бота (улучшенный ИИ)
function makeBotMove() {
    if (!gameStarted || currentPlayer !== 'white') return;

    const emptyCells = [];
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (boardState[y][x] === null && (!koPoint || koPoint[0] !== x || koPoint[1] !== y)) {
                emptyCells.push([x, y]);
            }
        }
    }

    if (emptyCells.length === 0) {
        pass();
        return;
    }

    // Выбор стратегии в зависимости от уровня сложности
    let move;
    switch(botLevel) {
        case 1: // Легкий - случайные ходы
            move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            break;
            
        case 2: // Средний - предпочитает центр и ответы на ходы
            move = getMediumBotMove(emptyCells);
            break;
            
        case 3: // Сложный - стратегические ходы
            move = getHardBotMove(emptyCells) || getMediumBotMove(emptyCells);
            break;
            
        case 4: // Эксперт - продвинутая стратегия
            move = getExpertBotMove(emptyCells) || getHardBotMove(emptyCells) || getMediumBotMove(emptyCells);
            break;
            
        default:
            move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    if (move) {
        setTimeout(() => makeMove(move[0], move[1]), 500);
    } else {
        pass();
    }
}

function getMediumBotMove(emptyCells) {
    // Предпочитаем центр и ответы на ходы игрока
    const center = Math.floor(boardSize / 2);
    const centerWeight = 3;
    const responseWeight = 2;
    
    const weightedCells = emptyCells.map(([x, y]) => {
        let weight = 1;
        
        // Бонус за центр
        const distToCenter = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
        weight += centerWeight / (distToCenter + 1);
        
        // Бонус за ответ на последний ход
        if (lastMove) {
            const distToLast = Math.sqrt(Math.pow(x - lastMove[0], 2) + Math.pow(y - lastMove[1], 2));
            weight += responseWeight / (distToLast + 1);
        }
        
        return { x, y, weight };
    });
    
    // Выбираем ход с наибольшим весом
    weightedCells.sort((a, b) => b.weight - a.weight);
    return [weightedCells[0].x, weightedCells[0].y];
}

function getHardBotMove(emptyCells) {
    // 1. Попытка захвата камней
    for (const [x, y] of emptyCells) {
        boardState[y][x] = 'white';
        const removed = removeCapturedStones(x, y);
        boardState[y][x] = null;
        
        if (removed.length > 0) {
            return [x, y];
        }
    }
    
    // 2. Защита своих групп с 1 дыханием
    for (const [x, y] of emptyCells) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === 'white') {
                const group = findGroup(nx, ny, 'white');
                let liberties = 0;
                
                for (const [gx, gy] of group) {
                    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                    for (const [dxx, dyy] of dirs) {
                        const tx = gx + dxx;
                        const ty = gy + dyy;
                        if (tx >= 0 && tx < boardSize && ty >= 0 && ty < boardSize && boardState[ty][tx] === null) {
                            liberties++;
                        }
                    }
                }
                
                if (liberties === 1) {
                    return [x, y];
                }
            }
        }
    }
    
    // 3. Стратегические точки (углы, стороны, звездные точки)
    const strategicPoints = [];
    if (boardSize === 19) strategicPoints.push([3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]);
    else if (boardSize === 13) strategicPoints.push([3,3],[3,6],[3,9],[6,3],[6,6],[6,9],[9,3],[9,6],[9,9]);
    else strategicPoints.push([2,2],[2,4],[2,6],[4,2],[4,4],[4,6],[6,2],[6,4],[6,6]);
    
    for (const [x, y] of strategicPoints) {
        if (boardState[y][x] === null && emptyCells.some(c => c[0] === x && c[1] === y)) {
            return [x, y];
        }
    }
    
    return null;
}

function getExpertBotMove(emptyCells) {
    // 1. Попытка создать два глаза для своей группы
    for (const [x, y] of emptyCells) {
        boardState[y][x] = 'white';
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === 'white') {
                const group = findGroup(nx, ny, 'white');
                let eyeCount = 0;
                
                for (const [gx, gy] of group) {
                    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                    let isPotentialEye = true;
                    
                    for (const [dxx, dyy] of dirs) {
                        const tx = gx + dxx;
                        const ty = gy + dyy;
                        
                        if (tx >= 0 && tx < boardSize && ty >= 0 && ty < boardSize && 
                            boardState[ty][tx] !== 'white' && boardState[ty][tx] !== null) {
                            isPotentialEye = false;
                            break;
                        }
                    }
                    
                    if (isPotentialEye) eyeCount++;
                    if (eyeCount >= 2) break;
                }
                
                if (eyeCount >= 2) {
                    boardState[y][x] = null;
                    return [x, y];
                }
            }
        }
        
        boardState[y][x] = null;
    }
    
    // 2. Атака групп противника с малым количеством дыханий
    for (const [x, y] of emptyCells) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === 'black') {
                const group = findGroup(nx, ny, 'black');
                let liberties = 0;
                
                for (const [gx, gy] of group) {
                    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                    for (const [dxx, dyy] of dirs) {
                        const tx = gx + dxx;
                        const ty = gy + dyy;
                        if (tx >= 0 && tx < boardSize && ty >= 0 && ty < boardSize && boardState[ty][tx] === null) {
                            liberties++;
                        }
                    }
                }
                
                if (liberties <= 2) {
                    return [x, y];
                }
            }
        }
    }
    
    return null;
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
function handleCanvasClick(e) {
    if (!gameStarted || currentPlayer === 'white') return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    const cellSize = canvas.width / boardSize;
    const boardX = Math.floor(canvasX / cellSize);
    const boardY = Math.floor(canvasY / cellSize);
    
    if (boardX >= 0 && boardX < boardSize && boardY >= 0 && boardY < boardSize) {
        makeMove(boardX, boardY);
    }
}

// Обработка касания на мобильных устройствах
function handleCanvasTouch(e) {
    if (!gameStarted || currentPlayer === 'white') return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;
    
    const cellSize = canvas.width / boardSize;
    const boardX = Math.floor(canvasX / cellSize);
    const boardY = Math.floor(canvasY / cellSize);
    
    if (boardX >= 0 && boardX < boardSize && boardY >= 0 && boardY < boardSize) {
        makeMove(boardX, boardY);
    }
}

// Инициализация обработчиков событий
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchstart', handleCanvasTouch);
startGameBtn.addEventListener('click', initGame);
passButton.addEventListener('click', pass);
resignButton.addEventListener('click', resign);
newGameButton.addEventListener('click', newGame);

// Адаптация к изменению размера окна
window.addEventListener('resize', () => {
    if (gameStarted) {
        updateBoardSize();
        drawBoard();
    }
});
