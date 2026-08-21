// ================ app.js - Main Application ================

class DrDerChessApp {
    constructor() {
        this.game = new ChessGame();
        this.gameMode = null;
        this.playerColor = 'white';
        this.computerLevel = 'expert';
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
        
        this.soundEngine = null;
        this.screens = {};
        this.elements = {};
        this.boardElements = {};
        this.isDragging = false;
        
        this.init();
    }
    
    init() {
        this.cacheDomElements();
        this.initSoundEngine();
        this.initEventListeners();
        this.buildBoard();
        this.registerServiceWorker();
        this.showScreen('mainMenu');
        console.log('DrDer Chess initialized');
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
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }
    
    // ================ Random Color Selection ================
    getRandomColor() {
        return Math.random() < 0.5 ? 'white' : 'black';
    }
    
    // ================ Board Rendering ================
    buildBoard() {
        const boardContainer = this.elements.chessboard;
        if (!boardContainer) return;
        
        boardContainer.innerHTML = '';
        boardContainer.style.cssText = 'position:relative;width:100%;height:100%;border:3px solid #2a2a4a;border-radius:4px;overflow:hidden;';
        
        // Create squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                const squareName = this.getSquareName(row, col);
                
                square.className = 'chess-square';
                square.setAttribute('data-square', squareName);
                square.style.cssText = 
                    'position:absolute;' +
                    'width:12.5%;height:12.5%;' +
                    'top:' + (row * 12.5) + '%;' +
                    'left:' + (col * 12.5) + '%;' +
                    'background-color:' + (isLight ? '#f0d9b5' : '#b58863') + ';' +
                    'cursor:pointer;' +
                    'transition:background-color 0.15s;' +
                    'z-index:1;';
                
                square.addEventListener('click', () => this.handleSquareClick(squareName));
                
                boardContainer.appendChild(square);
                this.boardElements[squareName] = square;
            }
        }
        
        // Add notation
        if (this.settings.coords) {
            this.addNotation(boardContainer);
        }
        
        // Pieces container
        const piecesContainer = document.createElement('div');
        piecesContainer.id = 'pieces-container';
        piecesContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none;';
        boardContainer.appendChild(piecesContainer);
        
        this.renderPieces();
    }
    
    addNotation(boardInner) {
        for (let i = 0; i < 8; i++) {
            const col = this.playerColor === 'white' ? i : 7 - i;
            const fileLabel = document.createElement('div');
            fileLabel.textContent = String.fromCharCode(97 + col);
            fileLabel.style.cssText = 
                'position:absolute;bottom:2px;' +
                'left:' + (i * 12.5 + 6.25) + '%;' +
                'transform:translateX(-50%);' +
                'font-size:10px;font-weight:bold;' +
                'color:' + (i % 2 === 0 ? '#b58863' : '#f0d9b5') + ';' +
                'pointer-events:none;z-index:1;';
            boardInner.appendChild(fileLabel);
            
            const row = this.playerColor === 'white' ? 7 - i : i;
            const rankLabel = document.createElement('div');
            rankLabel.textContent = row + 1;
            rankLabel.style.cssText = 
                'position:absolute;top:' + (i * 12.5 + 6.25) + '%;' +
                'right:2px;' +
                'transform:translateY(-50%);' +
                'font-size:10px;font-weight:bold;' +
                'color:' + (i % 2 === 0 ? '#f0d9b5' : '#b58863') + ';' +
                'pointer-events:none;z-index:1;';
            boardInner.appendChild(rankLabel);
        }
    }
    
    getSquareName(row, col) {
        const file = this.playerColor === 'white' ? col : 7 - col;
        const rank = this.playerColor === 'white' ? 8 - row : row + 1;
        return String.fromCharCode(97 + file) + rank;
    }
    
    renderPieces() {
        const piecesContainer = document.getElementById('pieces-container');
        if (!piecesContainer) return;
        
        piecesContainer.innerHTML = '';
        
        const board = this.game.getBoard();
        if (!board) return;
        
        const symbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        const containerSize = this.elements.chessboard.offsetWidth || 400;
        const pieceFontSize = containerSize * 0.08;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                
                const squareName = this.getSquareName(row, col);
                const pieceKey = piece.color + piece.type.toUpperCase();
                
                const pieceEl = document.createElement('div');
                pieceEl.className = 'chess-piece';
                pieceEl.setAttribute('data-piece', pieceKey);
                pieceEl.setAttribute('data-square', squareName);
                pieceEl.textContent = symbols[pieceKey] || '';
                pieceEl.style.cssText = 
                    'position:absolute;' +
                    'width:12.5%;height:12.5%;' +
                    'top:' + (row * 12.5) + '%;' +
                    'left:' + (col * 12.5) + '%;' +
                    'display:flex;align-items:center;justify-content:center;' +
                    'font-size:' + pieceFontSize + 'px;' +
                    'cursor:pointer;' +
                    'user-select:none;' +
                    'pointer-events:all;' +
                    'z-index:3;';
                
                pieceEl.addEventListener('click', () => this.handleSquareClick(squareName));
                
                piecesContainer.appendChild(pieceEl);
            }
        }
        
        // Highlight selected square
        if (this.game.selectedSquare) {
            this.highlightSelectedAndMoves();
        }
    }
    
    highlightSelectedAndMoves() {
        const selected = this.game.selectedSquare;
        if (!selected) return;
        
        // Highlight selected
        const selectedEl = this.boardElements[selected];
        if (selectedEl) {
            selectedEl.style.backgroundColor = '#ffff00';
        }
        
        // Highlight legal moves
        if (this.settings.legalMoves) {
            this.game.legalMovesForSelected.forEach(move => {
                const squareEl = this.boardElements[move.to];
                if (squareEl) {
                    const dot = document.createElement('div');
                    dot.style.cssText = 
                        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                        'width:30%;height:30%;border-radius:50%;' +
                        'background-color:rgba(0,0,0,0.3);' +
                        'pointer-events:none;z-index:2;';
                    squareEl.appendChild(dot);
                }
            });
        }
    }
    
    handleSquareClick(squareName) {
        if (this.game.isGameFinished()) return;
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
                this.buildBoard();
            }
        } else {
            if (selected === squareName) {
                this.game.deselectSquare();
                this.buildBoard();
                return;
            }
            
            if (this.game.isSquareSelectable(squareName)) {
                this.game.selectSquare(squareName);
                this.buildBoard();
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
                this.buildBoard();
            }
        }
    }
    
    makeMoveAndUpdate(from, to, promotion = 'q') {
        const result = this.game.makeMove(from, to, promotion);
        if (!result) return;
        
        this.playMoveSound(result);
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        if (this.game.isGameFinished()) {
            this.showGameOverModal();
            return;
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
    
    // ================ Stockfish AI ================
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
            console.error('Failed to load Stockfish:', error);
            this.stockfish = null;
        }
    }
    
    makeAIMove() {
        if (this.game.isGameFinished()) return;
        
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
    
    // ================ Game Modes ================
    startComputerGame() {
        this.gameMode = 'computer';
        this.playerColor = this.getRandomColor();
        
        this.game.newGame();
        this.initStockfish();
        
        this.elements.opponentName.textContent = 'الكمبيوتر';
        this.elements.playerNameBottom.textContent = 'DrDer';
        
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        this.showScreen('gameScreen');
        
        // If computer is white, make first move
        if (this.playerColor === 'black') {
            this.stockfishThinking = true;
            this.updateGameStatus();
            this.aiTimeout = setTimeout(() => this.makeAIMove(), 500);
        }
    }
    
    startTwoPlayerGame() {
        this.gameMode = 'twoPlayers';
        this.playerColor = this.getRandomColor();
        
        this.game.newGame();
        
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
    
    // ================ UI Updates ================
    updateGameStatus() {
        if (!this.elements.gameStatusText) return;
        
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
        if (!this.elements.moveCounter) return;
        const moves = this.game.getMoveHistory().length;
        this.elements.moveCounter.textContent = 'النقلة: ' + (Math.floor(moves / 2) + 1);
    }
    
    updateCapturedPieces() {
        const captured = this.game.getCapturedPieces();
        const symbols = {
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛'
        };
        
        this.elements.capturedByWhite.textContent = captured.white.map(p => symbols[p] || '').join(' ');
        this.elements.capturedByBlack.textContent = captured.black.map(p => symbols[p] || '').join(' ');
    }
    
    // ================ Sound ================
    initSoundEngine() {
        this.soundEngine = {
            audioContext: null,
            
            init() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {}
            },
            
            play(type) {
                if (!this.audioContext) return;
                const frequencies = {
                    move: [440, 550],
                    capture: [330, 220],
                    check: [660, 880],
                    gameOver: [440, 330, 220],
                    castle: [550, 660],
                    promote: [550, 660, 770]
                };
                const freq = frequencies[type] || frequencies.move;
                this.playTones(freq, type === 'gameOver' ? 0.3 : 0.1);
            },
            
            playTones(frequencies, duration) {
                if (!this.audioContext) return;
                const ctx = this.audioContext;
                const now = ctx.currentTime;
                frequencies.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    const startTime = now + (index * duration * 0.5);
                    gain.gain.setValueAtTime(0.3, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                });
            }
        };
        
        this.soundEngine.init();
    }
    
    playMoveSound(move) {
        if (!this.settings.sound) return;
        
        if (move.captured) {
            this.soundEngine.play('capture');
        } else if (move.promotion) {
            this.soundEngine.play('promote');
        } else if (move.san && move.san.includes('+')) {
            this.soundEngine.play('check');
        } else if (move.san && (move.san.includes('O-O') || move.san.includes('0-0'))) {
            this.soundEngine.play('castle');
        } else {
            this.soundEngine.play('move');
        }
    }
    
    // ================ Modals ================
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
    
    // ================ Navigation ================
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
    
    // ================ Service Worker ================
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(() => {});
            });
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
