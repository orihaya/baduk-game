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
    
    const maxWidth = Math.min(window.innerWidth - 40, 600);
    const cellSize = Math.min(Math.floor(maxWidth / boardSize), 30);
    canvas.width = cellSize * boardSize;
    canvas.height = cellSize * boardSize;
    
    currentPlayerSpan.textContent = 'Чёрные';
    currentPlayerSpan.style.color = 'black';
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
    
    // Стратегии для разных уровней сложности
    const strategies = [
        // Уровень 1 (легкий) - случайные ходы
        () => {
            const emptyCells = [];
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === null) {
                        emptyCells.push([x, y]);
                    }
                }
            }
            if (emptyCells.length > 0) {
                return emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }
            return null;
        },
        
        // Уровень 2 (средний) - предпочитает центр и ответы на ходы игрока
        () => {
            const center = Math.floor(boardSize / 2);
            const emptyCells = [];
            
            // Сначала проверяем клетки рядом с последним ходом игрока
            if (lastMove) {
                const [lx, ly] = lastMove;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const x = lx + dx;
                        const y = ly + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && boardState[y][x] === null) {
                            emptyCells.push([x, y]);
                        }
                    }
                }
            }
            
            // Если нет подходящих ходов рядом, выбираем из центра
            if (emptyCells.length === 0) {
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const x = center + dx;
                        const y = center + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && boardState[y][x] === null) {
                            emptyCells.push([x, y]);
                        }
                    }
                }
            }
            
            // Если все еще нет ходов, выбираем случайный
            if (emptyCells.length === 0) {
                for (let y = 0; y < boardSize; y++) {
                    for (let x = 0; x < boardSize; x++) {
                        if (boardState[y][x] === null) {
                            emptyCells.push([x, y]);
                        }
                    }
                }
            }
            
            return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : null;
        },
        
        // Уровень 3 (сложный) - стратегические ходы
        () => {
            // 1. Попытка захвата камней
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === null) {
                        boardState[y][x] = 'white';
                        const removed = removeCapturedStones(x, y);
                        boardState[y][x] = null;
                        
                        if (removed.length > 0) {
                            return [x, y];
                        }
                    }
                }
            }
            
            // 2. Защита своих групп
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === 'white') {
                        const group = findGroup(x, y, 'white');
                        let liberties = 0;
                        let libertyPos = null;
                        
                        for (const [gx, gy] of group) {
                            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                            for (const [dx, dy] of directions) {
                                const nx = gx + dx;
                                const ny = gy + dy;
                                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === null) {
                                    liberties++;
                                    libertyPos = [nx, ny];
                                }
                            }
                        }
                        
                        if (liberties === 1 && libertyPos) {
                            return libertyPos;
                        }
                    }
                }
            }
            
            // 3. Стратегические точки (углы, стороны)
            const strategicPoints = [];
            if (boardSize === 19) {
                strategicPoints.push([3, 3], [3, 15], [15, 3], [15, 15],
                                  [3, 9], [9, 3], [15, 9], [9, 15]);
            } else if (boardSize === 13) {
                strategicPoints.push([3, 3], [3, 9], [9, 3], [9, 9]);
            } else {
                strategicPoints.push([2, 2], [2, 6], [6, 2], [6, 6]);
            }
            
            for (const [x, y] of strategicPoints) {
                if (boardState[y][x] === null) {
                    return [x, y];
                }
            }
            
            // 4. Вернуться к стратегии среднего уровня
            return strategies[1]();
        },
        
        // Уровень 4 (эксперт) - расширенная стратегия
        () => {
            // 1. Попытка захвата (как в уровне 3)
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === null) {
                        boardState[y][x] = 'white';
                        const removed = removeCapturedStones(x, y);
                        boardState[y][x] = null;
                        
                        if (removed.length > 0) {
                            return [x, y];
                        }
                    }
                }
            }
            
            // 2. Создание глаз для своих групп
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === 'white') {
                        const group = findGroup(x, y, 'white');
                        const eyeSpots = [];
                        
                        for (const [gx, gy] of group) {
                            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                            for (const [dx, dy] of directions) {
                                const nx = gx + dx;
                                const ny = gy + dy;
                                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === null) {
                                    // Проверяем, может ли это быть глазом
                                    let isEye = true;
                                    const eyeDirections = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                                    for (const [edx, edy] of eyeDirections) {
                                        const ex = nx + edx;
                                        const ey = ny + edy;
                                        if (ex >= 0 && ex < boardSize && ey >= 0 && ey < boardSize && 
                                            boardState[ey][ex] !== 'white') {
                                            isEye = false;
                                            break;
                                        }
                                    }
                                    
                                    if (isEye) {
                                        eyeSpots.push([nx, ny]);
                                    }
                                }
                            }
                        }
                        
                        if (eyeSpots.length > 0) {
                            return eyeSpots[0];
                        }
                    }
                }
            }
            
            // 3. Атака слабых групп противника
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    if (boardState[y][x] === 'black') {
                        const group = findGroup(x, y, 'black');
                        let liberties = 0;
                        let libertyPos = null;
                        
                        for (const [gx, gy] of group) {
                            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                            for (const [dx, dy] of directions) {
                                const nx = gx + dx;
                                const ny = gy + dy;
                                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === null) {
                                    liberties++;
                                    libertyPos = [nx, ny];
                                }
                            }
                        }
                        
                        if (liberties === 1 && libertyPos) {
                            return libertyPos;
                        } else if (liberties === 2) {
                            // Попытка уменьшить дыхания группы
                            for (const [gx, gy] of group) {
                                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                                for (const [dx, dy] of directions) {
                                    const nx = gx + dx;
                                    const ny = gy + dy;
                                    if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && boardState[ny][nx] === null) {
                                        return [nx, ny];
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // 4. Вернуться к стратегии сложного уровня
            return strategies[2]();
        }
    ];
    
    // Выбираем стратегию в зависимости от уровня сложности
    const strategy = strategies[Math.min(botLevel - 1, strategies.length - 1)];
    const move = strategy();
    
    if (move) {
        const [x, y] = move;
        makeMove(x, y);
    } else {
        pass();
    }
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

// Адаптация к изменению размера окна
window.addEventListener('resize', () => {
    if (gameStarted) {
        const maxWidth = Math.min(window.innerWidth - 40, 600);
        const cellSize = Math.min(Math.floor(maxWidth / boardSize), 30);
        canvas.width = cellSize * boardSize;
        canvas.height = cellSize * boardSize;
        drawBoard();
    }
});
