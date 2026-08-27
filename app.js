// ================ app.js - Main Application ================

class DrDerChessApp {
    constructor() {
        this.game = null;
        this.gameMode = null;
        this.playerColor = 'white';
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishThinking = false;
        this.stockfishDepth = 25;
        this.aiTimeout = null;
        this.pendingPromotion = null;
        
        this.settings = {
            sound: true,
            coords: true,
            legalMoves: true
        };
        
        this.audioElements = {};
        this.screens = {};
        this.elements = {};
        this.boardElements = {};
        this.pieceElements = {};
        
        this.init();
    }
    
    init() {
        this.cacheDomElements();
        this.initAudio();
        this.initEventListeners();
        this.forceMainMenu();
        this.registerServiceWorker();
    }
    
    forceMainMenu() {
        if (this.screens.mainMenu && this.screens.gameScreen) {
            this.screens.mainMenu.classList.add('active');
            this.screens.gameScreen.classList.remove('active');
            this.screens.mainMenu.style.display = 'flex';
            this.screens.gameScreen.style.display = 'none';
        }
    }
    
    cacheDomElements() {
        this.screens = {
            mainMenu: document.getElementById('mainMenu'),
            gameScreen: document.getElementById('gameScreen')
        };
        
        this.elements = {
            playComputerBtn: document.getElementById('playComputerBtn'),
            twoPlayersBtn: document.getElementById('twoPlayersBtn'),
            chessboard: document.getElementById('chessboard'),
            gameStatusText: document.getElementById('gameStatusText'),
            moveCounter: document.getElementById('moveCounter'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            opponentName: document.getElementById('opponentName'),
            playerNameBottom: document.getElementById('playerNameBottom'),
            capturedByWhite: document.getElementById('capturedByWhite'),
            capturedByBlack: document.getElementById('capturedByBlack'),
            promotionModal: document.getElementById('promotionModal'),
            promotionPieces: document.getElementById('promotionPieces'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            newGameBtn: document.getElementById('newGameBtn'),
            reviewGameBtn: document.getElementById('reviewGameBtn')
        };
    }
    
    initEventListeners() {
        this.elements.playComputerBtn.addEventListener('click', () => this.startComputerGame());
        this.elements.twoPlayersBtn.addEventListener('click', () => this.startTwoPlayerGame());
        this.elements.backToMenuBtn.addEventListener('click', () => this.leaveGame());
        this.elements.newGameBtn.addEventListener('click', () => this.resetGame());
        this.elements.reviewGameBtn.addEventListener('click', () => this.closeGameOverModal());
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.screens[screenName].style.display = 'flex';
        }
    }
    
    getRandomColor() {
        return Math.random() < 0.5 ? 'white' : 'black';
    }
    
    initAudio() {
        this.audioElements = {
            move: new Audio('move.mp3'),
            capture: new Audio('capture.mp3'),
            check: new Audio('check.mp3'),
            gameOver: new Audio('checkmate.mp3'),
            promote: new Audio('promote.mp3')
        };
    }
    
    playSound(type) {
        if (!this.settings.sound) return;
        const audio = this.audioElements[type];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }
    
    // ================ Board - بناء مرة واحدة فقط ================
    buildBoard() {
        const boardContainer = this.elements.chessboard;
        if (!boardContainer) return;
        
        boardContainer.innerHTML = '';
        boardContainer.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);';
        this.boardElements = {};
        this.pieceElements = {};
        
        // إنشاء المربعات مرة واحدة
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                const squareName = this.getSquareName(row, col);
                
                square.className = 'chess-square';
                square.setAttribute('data-square', squareName);
                square.style.cssText = 
                    'display:flex;align-items:center;justify-content:center;position:relative;' +
                    'background-color:' + (isLight ? '#d4a574' : '#6b4423') + ';' +
                    'cursor:pointer;';
                
                square.addEventListener('click', () => this.handleSquareClick(squareName));
                boardContainer.appendChild(square);
                this.boardElements[squareName] = square;
            }
        }
        
        // إنشاء القطع مرة واحدة
        this.renderPieces();
    }
    
    getSquareName(row, col) {
        const file = this.playerColor === 'white' ? col : 7 - col;
        const rank = this.playerColor === 'white' ? 8 - row : row + 1;
        return String.fromCharCode(97 + file) + rank;
    }
    
    // ================ تحديث القطع فقط بدون إعادة بناء ================
    renderPieces() {
        if (!this.game) return;
        
        const board = this.game.getBoard();
        if (!board) return;
        
        const symbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        const boardContainer = this.elements.chessboard;
        const containerSize = boardContainer.offsetWidth || 400;
        const pieceFontSize = containerSize / 8 * 0.8;
        
        // إزالة القطع القديمة
        Object.values(this.pieceElements).forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        this.pieceElements = {};
        
        // وضع القطع في مواضعها
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                
                const squareName = this.getSquareName(row, col);
                const pieceKey = piece.color + piece.type.toUpperCase();
                const squareEl = this.boardElements[squareName];
                
                if (!squareEl) continue;
                
                const pieceEl = document.createElement('div');
                pieceEl.className = 'chess-piece';
                pieceEl.setAttribute('data-piece', pieceKey);
                pieceEl.setAttribute('data-square', squareName);
                pieceEl.textContent = symbols[pieceKey] || '';
                pieceEl.style.cssText = 
                    'display:flex;align-items:center;justify-content:center;' +
                    'width:100%;height:100%;' +
                    'font-size:' + pieceFontSize + 'px;' +
                    'font-weight:bold;cursor:pointer;' +
                    'pointer-events:all;z-index:3;';
                
                pieceEl.addEventListener('click', () => this.handleSquareClick(squareName));
                squareEl.appendChild(pieceEl);
                this.pieceElements[squareName] = pieceEl;
            }
        }
    }
    
    // ================ تحريك قطعة فقط ================
    updateBoardPosition() {
        if (!this.game) return;
        
        const board = this.game.getBoard();
        if (!board) return;
        
        const symbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        // إزالة كل القطع القديمة
        Object.values(this.pieceElements).forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        this.pieceElements = {};
        
        const boardContainer = this.elements.chessboard;
        const containerSize = boardContainer.offsetWidth || 400;
        const pieceFontSize = containerSize / 8 * 0.8;
        
        // وضع القطع
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                
                const squareName = this.getSquareName(row, col);
                const pieceKey = piece.color + piece.type.toUpperCase();
                const squareEl = this.boardElements[squareName];
                
                if (!squareEl) continue;
                
                const pieceEl = document.createElement('div');
                pieceEl.className = 'chess-piece';
                pieceEl.setAttribute('data-piece', pieceKey);
                pieceEl.textContent = symbols[pieceKey] || '';
                pieceEl.style.cssText = 
                    'display:flex;align-items:center;justify-content:center;' +
                    'width:100%;height:100%;' +
                    'font-size:' + pieceFontSize + 'px;' +
                    'font-weight:bold;cursor:pointer;' +
                    'pointer-events:all;z-index:3;';
                
                pieceEl.addEventListener('click', () => this.handleSquareClick(squareName));
                squareEl.appendChild(pieceEl);
                this.pieceElements[squareName] = pieceEl;
            }
        }
        
        // إزالة التحديد القديم
        this.clearHighlights();
        
        // إظهار التحديد إذا وجد
        if (this.game.selectedSquare) {
            this.highlightSelectedAndMoves();
        }
    }
    
    clearHighlights() {
        Object.values(this.boardElements).forEach(square => {
            const isLight = square.style.backgroundColor === 'rgb(212, 165, 116)' || 
                           square.style.backgroundColor === '#d4a574';
            square.style.backgroundColor = isLight ? '#d4a574' : '#6b4423';
        });
    }
    
    highlightSelectedAndMoves() {
        const selected = this.game.selectedSquare;
        if (!selected) return;
        
        const selectedEl = this.boardElements[selected];
        if (selectedEl) {
            selectedEl.style.backgroundColor = '#f1c40f';
        }
        
        if (this.settings.legalMoves) {
            this.game.legalMovesForSelected.forEach(move => {
                const squareEl = this.boardElements[move.to];
                if (squareEl) {
                    const dot = document.createElement('div');
                    dot.style.cssText = 
                        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                        'width:30%;height:30%;border-radius:50%;' +
                        'background-color:rgba(0,0,0,0.3);pointer-events:none;z-index:2;';
                    squareEl.appendChild(dot);
                }
            });
        }
    }
    
    handleSquareClick(squareName) {
        if (!this.game || this.game.isGameFinished()) return;
        if (this.gameMode === 'computer' && this.stockfishThinking) return;
        
        if (this.gameMode === 'computer') {
            const turn = this.game.getTurn();
            if ((this.playerColor === 'white' && turn === 'b') ||
                (this.playerColor === 'black' && turn === 'w')) {
                return;
            }
        }
        
        const selected = this.game.selectedSquare;
        
        if (!selected) {
            if (this.game.isSquareSelectable(squareName)) {
                this.game.selectSquare(squareName);
                this.updateBoardPosition();
            }
        } else {
            if (selected === squareName) {
                this.game.deselectSquare();
                this.updateBoardPosition();
                return;
            }
            
            if (this.game.isSquareSelectable(squareName)) {
                this.game.selectSquare(squareName);
                this.updateBoardPosition();
                return;
            }
            
            if (this.game.isLegalMove(selected, squareName)) {
                const moveDetails = this.game.getMoveDetails(selected, squareName);
                
                if (moveDetails && moveDetails.promotion) {
                    this.pendingPromotion = { from: selected, to: squareName, color: this.game.getTurn() };
                    this.showPromotionModal(this.game.getTurn());
                    return;
                }
                
                this.makeMoveAndUpdate(selected, squareName);
            } else {
                this.game.deselectSquare();
                this.updateBoardPosition();
            }
        }
    }
    
    makeMoveAndUpdate(from, to, promotion = 'q') {
        if (!this.game) return;
        
        const result = this.game.makeMove(from, to, promotion);
        if (!result) return;
        
        // تحديث القطع فقط
        this.updateBoardPosition();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        if (this.game.isGameFinished()) {
            this.playSound('gameOver');
            this.showGameOverModal();
            return;
        }
        
        if (result.captured) {
            this.playSound('capture');
        } else if (result.promotion) {
            this.playSound('promote');
        } else if (this.game.isInCheck()) {
            this.playSound('check');
        } else {
            this.playSound('move');
        }
        
        if (this.gameMode === 'computer') {
            const turn = this.game.getTurn();
            const computerColor = this.playerColor === 'white' ? 'b' : 'w';
            
            if ((computerColor === 'w' && turn === 'w') || 
                (computerColor === 'b' && turn === 'b')) {
                this.stockfishThinking = true;
                this.updateGameStatus();
                this.aiTimeout = setTimeout(() => this.makeAIMove(), 300);
            }
        }
    }
    
    initStockfish() {
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
        }
        
        this.stockfishReady = false;
        this.stockfishThinking = false;
        
        try {
            this.stockfish = new Worker('stockfish.js');
            
            this.stockfish.onmessage = (event) => {
                const msg = event.data;
                
                if (msg === 'readyok') {
                    this.stockfishReady = true;
                    this.stockfish.postMessage('ucinewgame');
                    this.stockfish.postMessage('setoption name Skill Level value 20');
                    this.stockfish.postMessage('setoption name Threads value 4');
                    this.stockfish.postMessage('setoption name Hash value 256');
                    this.stockfishDepth = 25;
                }
                
                if (msg.startsWith('bestmove')) {
                    const bestMove = msg.split(' ')[1];
                    if (bestMove && bestMove !== '(none)' && this.stockfishThinking) {
                        this.stockfishThinking = false;
                        const from = bestMove.substring(0, 2);
                        const to = bestMove.substring(2, 4);
                        const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : 'q';
                        this.makeMoveAndUpdate(from, to, promotion);
                    }
                }
            };
            
            this.stockfish.postMessage('uci');
            this.stockfish.postMessage('isready');
        } catch (error) {
            this.stockfish = null;
        }
    }
    
    makeAIMove() {
        if (!this.game || this.game.isGameFinished()) return;
        
        if (!this.stockfish || !this.stockfishReady) {
            const moves = this.game.getLegalMoves();
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                setTimeout(() => this.makeMoveAndUpdate(randomMove.from, randomMove.to, randomMove.promotion || 'q'), 300);
            }
            return;
        }
        
        const fen = this.game.getFen();
        this.stockfish.postMessage('position fen ' + fen);
        this.stockfish.postMessage('go depth ' + this.stockfishDepth + ' movetime 3000');
    }
    
    startComputerGame() {
        this.gameMode = 'computer';
        this.playerColor = this.getRandomColor();
        this.game = new ChessGame();
        
        this.initStockfish();
        
        this.elements.opponentName.textContent = 'الكمبيوتر';
        this.elements.playerNameBottom.textContent = 'DrDer';
        
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        this.showScreen('gameScreen');
        
        if (this.playerColor === 'black') {
            this.stockfishThinking = true;
            this.updateGameStatus();
            this.aiTimeout = setTimeout(() => this.makeAIMove(), 500);
        }
    }
    
    startTwoPlayerGame() {
        this.gameMode = 'twoPlayers';
        this.playerColor = this.getRandomColor();
        this.game = new ChessGame();
        
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        
        this.elements.opponentName.textContent = 'اللاعب 2';
        this.elements.playerNameBottom.textContent = 'DrDer';
        
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        this.showScreen('gameScreen');
    }
    
    updateGameStatus() {
        if (!this.elements.gameStatusText || !this.game) return;
        
        if (this.game.isGameFinished()) {
            const result = this.game.getGameResult();
            if (result) this.elements.gameStatusText.textContent = result.message;
            return;
        }
        
        if (this.stockfishThinking) {
            this.elements.gameStatusText.textContent = 'الكمبيوتر يفكر...';
            return;
        }
        
        const turn = this.game.getTurn();
        const turnText = turn === 'w' ? 'دور الأبيض' : 'دور الأسود';
        
        if (this.game.isInCheck()) {
            this.elements.gameStatusText.textContent = turnText + ' - كش!';
        } else {
            this.elements.gameStatusText.textContent = turnText;
        }
    }
    
    updateMoveCounter() {
        if (!this.elements.moveCounter || !this.game) return;
        const moves = this.game.getMoveHistory().length;
        this.elements.moveCounter.textContent = 'النقلة: ' + (Math.floor(moves / 2) + 1);
    }
    
    updateCapturedPieces() {
        if (!this.game) return;
        const captured = this.game.getCapturedPieces();
        const symbols = {
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛'
        };
        
        this.elements.capturedByWhite.textContent = captured.white.map(p => symbols[p] || '').join(' ');
        this.elements.capturedByBlack.textContent = captured.black.map(p => symbols[p] || '').join(' ');
    }
    
    showPromotionModal(color) {
        const symbols = {
            'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘',
            'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞'
        };
        
        this.elements.promotionPieces.innerHTML = '';
        
        ['q', 'r', 'b', 'n'].forEach(piece => {
            const div = document.createElement('div');
            div.className = 'promotion-piece';
            div.textContent = symbols[color + piece];
            div.addEventListener('click', () => {
                this.closePromotionModal();
                if (this.pendingPromotion) {
                    this.makeMoveAndUpdate(this.pendingPromotion.from, this.pendingPromotion.to, piece);
                    this.pendingPromotion = null;
                }
            });
            this.elements.promotionPieces.appendChild(div);
        });
        
        this.elements.promotionModal.classList.remove('hidden');
    }
    
    closePromotionModal() {
        this.elements.promotionModal.classList.add('hidden');
    }
    
    showGameOverModal() {
        const result = this.game.getGameResult();
        if (!result) return;
        
        this.elements.gameOverTitle.textContent = result.type === 'checkmate' ? 'كش مات!' : 'تعادل!';
        this.elements.gameOverMessage.textContent = result.message;
        this.elements.gameOverModal.classList.remove('hidden');
    }
    
    closeGameOverModal() {
        this.elements.gameOverModal.classList.add('hidden');
    }
    
    leaveGame() {
        if (this.aiTimeout) {
            clearTimeout(this.aiTimeout);
            this.aiTimeout = null;
        }
        
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        
        this.stockfishThinking = false;
        this.showScreen('mainMenu');
    }
    
    resetGame() {
        this.closeGameOverModal();
        
        if (this.gameMode === 'computer') {
            this.startComputerGame();
        } else {
            this.startTwoPlayerGame();
        }
    }
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then(function(registrations) {
                    registrations.forEach(function(registration) {
                        registration.unregister();
                    });
                })
                .then(function() {
                    return navigator.serviceWorker.register('sw.js');
                })
                .catch(function() {});
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chess === 'undefined') {
        console.error('Chess library not loaded');
        return;
    }
    
    if (typeof ChessGame === 'undefined') {
        console.error('ChessGame not loaded');
        return;
    }
    
    window.drderChess = new DrDerChessApp();
});
