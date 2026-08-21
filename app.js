// ================ app.js - Main Application ================

class DrDerChessApp {
    constructor() {
        this.game = new ChessGame();
        this.gameMode = null; // 'computer' or 'twoPlayers'
        this.playerColor = 'white';
        this.computerLevel = 'expert';
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishThinking = false;
        this.stockfishDepth = 20;
        this.aiTimeout = null;
        
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
        this.dragPiece = null;
        this.dragSource = null;
        this.dragTarget = null;
        
        this.init();
    }
    
    init() {
        this.cacheDomElements();
        this.loadSettings();
        this.initSoundEngine();
        this.initEventListeners();
        this.buildBoard();
        this.checkForSavedGame();
        this.registerServiceWorker();
        this.showScreen('mainMenu');
        console.log('DrDer Chess initialized successfully');
    }
    
    cacheDomElements() {
        this.screens = {
            mainMenu: document.getElementById('mainMenu'),
            levelSelect: document.getElementById('levelSelect'),
            gameScreen: document.getElementById('gameScreen'),
            settingsScreen: document.getElementById('settingsScreen')
        };
        
        this.elements = {
            playComputerBtn: document.getElementById('playComputerBtn'),
            twoPlayersBtn: document.getElementById('twoPlayersBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            continueGameBtn: document.getElementById('continueGameBtn'),
            continueGameContainer: document.getElementById('continueGameContainer'),
            levelButtons: document.querySelectorAll('.level-btn'),
            backFromLevelBtn: document.getElementById('backFromLevelBtn'),
            chessboard: document.getElementById('chessboard'),
            gameStatusText: document.getElementById('gameStatusText'),
            moveCounter: document.getElementById('moveCounter'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            saveGameBtn: document.getElementById('saveGameBtn'),
            whitePlayerName: document.getElementById('whitePlayerName'),
            blackPlayerName: document.getElementById('blackPlayerName'),
            capturedByWhite: document.getElementById('capturedByWhite'),
            capturedByBlack: document.getElementById('capturedByBlack'),
            promotionModal: document.getElementById('promotionModal'),
            promotionPieces: document.getElementById('promotionPieces'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            newGameBtn: document.getElementById('newGameBtn'),
            reviewGameBtn: document.getElementById('reviewGameBtn'),
            backFromSettingsBtn: document.getElementById('backFromSettingsBtn'),
            soundToggle: document.getElementById('soundToggle'),
            coordsToggle: document.getElementById('coordsToggle'),
            legalMovesToggle: document.getElementById('legalMovesToggle'),
            resetSettingsBtn: document.getElementById('resetSettingsBtn')
        };
    }
    
    initEventListeners() {
        // Main menu buttons
        this.elements.playComputerBtn.addEventListener('click', () => this.showScreen('levelSelect'));
        this.elements.twoPlayersBtn.addEventListener('click', () => this.startTwoPlayerGame());
        this.elements.settingsBtn.addEventListener('click', () => this.showScreen('settingsScreen'));
        this.elements.continueGameBtn.addEventListener('click', () => this.loadSavedGame());
        
        // Level selection
        this.elements.levelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.currentTarget.dataset.level;
                this.startComputerGame(level);
            });
        });
        this.elements.backFromLevelBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        
        // Game screen
        this.elements.backToMenuBtn.addEventListener('click', () => this.confirmLeaveGame());
        this.elements.saveGameBtn.addEventListener('click', () => this.saveGame());
        
        // Modals
        this.elements.newGameBtn.addEventListener('click', () => this.resetGame());
        this.elements.reviewGameBtn.addEventListener('click', () => this.closeGameOverModal());
        
        // Settings
        this.elements.backFromSettingsBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        this.elements.soundToggle.addEventListener('change', () => {
            this.settings.sound = this.elements.soundToggle.checked;
            this.saveSettings();
        });
        this.elements.coordsToggle.addEventListener('change', () => {
            this.settings.coords = this.elements.coordsToggle.checked;
            this.saveSettings();
            this.buildBoard();
        });
        this.elements.legalMovesToggle.addEventListener('change', () => {
            this.settings.legalMoves = this.elements.legalMovesToggle.checked;
            this.saveSettings();
            this.buildBoard();
        });
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }
    
    // ================ Board Rendering ================
    buildBoard() {
        const boardContainer = this.elements.chessboard;
        if (!boardContainer) return;
        
        boardContainer.innerHTML = '';
        boardContainer.style.cssText = 'position:relative;width:100%;height:100%;border:4px solid #2a2a4a;border-radius:8px;overflow:hidden;';
        
        const boardInner = document.createElement('div');
        boardInner.style.cssText = 'position:relative;width:100%;height:100%;';
        boardContainer.appendChild(boardInner);
        
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
                
                // Hover effect
                square.addEventListener('mouseenter', () => {
                    if (!this.isDragging) {
                        square.style.backgroundColor = isLight ? '#e8d5a3' : '#a07050';
                    }
                });
                square.addEventListener('mouseleave', () => {
                    if (!this.isDragging) {
                        square.style.backgroundColor = isLight ? '#f0d9b5' : '#b58863';
                    }
                });
                
                // Click event
                square.addEventListener('click', () => this.handleSquareClick(squareName));
                
                boardInner.appendChild(square);
                this.boardElements[squareName] = square;
            }
        }
        
        // Add notation
        if (this.settings.coords) {
            this.addNotation(boardInner);
        }
        
        // Add pieces container
        const piecesContainer = document.createElement('div');
        piecesContainer.id = 'pieces-container';
        piecesContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none;';
        boardInner.appendChild(piecesContainer);
        
        // Render pieces
        this.renderPieces();
    }
    
    addNotation(boardInner) {
        // File labels (a-h)
        for (let i = 0; i < 8; i++) {
            const col = this.playerColor === 'white' ? i : 7 - i;
            const label = document.createElement('div');
            label.textContent = String.fromCharCode(97 + col);
            label.style.cssText = 
                'position:absolute;bottom:2px;' +
                'left:' + (i * 12.5 + 6.25) + '%;' +
                'transform:translateX(-50%);' +
                'font-size:10px;font-weight:bold;' +
                'color:' + (i % 2 === 0 ? '#b58863' : '#f0d9b5') + ';' +
                'pointer-events:none;z-index:1;';
            boardInner.appendChild(label);
        }
        
        // Rank labels (1-8)
        for (let i = 0; i < 8; i++) {
            const row = this.playerColor === 'white' ? 7 - i : i;
            const label = document.createElement('div');
            label.textContent = row + 1;
            label.style.cssText = 
                'position:absolute;top:' + (i * 12.5 + 6.25) + '%;' +
                'right:2px;' +
                'transform:translateY(-50%);' +
                'font-size:10px;font-weight:bold;' +
                'color:' + (i % 2 === 0 ? '#f0d9b5' : '#b58863') + ';' +
                'pointer-events:none;z-index:1;';
            boardInner.appendChild(label);
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
                    'font-size:' + (this.elements.chessboard.offsetWidth * 0.08) + 'px;' +
                    'cursor:pointer;' +
                    'user-select:none;' +
                    'pointer-events:all;' +
                    'z-index:3;' +
                    'transition:top 0.1s, left 0.1s;';
                
                // Drag events
                pieceEl.addEventListener('mousedown', (e) => this.startDrag(e, squareName, pieceKey));
                pieceEl.addEventListener('touchstart', (e) => this.startDrag(e, squareName, pieceKey), { passive: false });
                
                piecesContainer.appendChild(pieceEl);
            }
        }
        
        // Highlight legal moves if square selected
        if (this.game.selectedSquare && this.settings.legalMoves) {
            this.highlightLegalMoves();
        }
        
        // Highlight last move
        if (this.game.getLastMove()) {
            this.highlightLastMove();
        }
    }
    
    highlightLegalMoves() {
        const selected = this.game.selectedSquare;
        if (!selected) return;
        
        const moves = this.game.legalMovesForSelected;
        moves.forEach(move => {
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
        
        // Highlight selected square
        const selectedEl = this.boardElements[selected];
        if (selectedEl) {
            selectedEl.style.backgroundColor = '#ffff00';
        }
    }
    
    highlightLastMove() {
        const lastMove = this.game.getLastMove();
        if (!lastMove) return;
        
        const fromEl = this.boardElements[lastMove.from];
        const toEl = this.boardElements[lastMove.to];
        
        if (fromEl) fromEl.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
        if (toEl) toEl.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
    }
    
    handleSquareClick(squareName) {
        if (this.game.isGameFinished()) return;
        
        // In computer mode, only allow player clicks
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
            // Try to select a piece
            if (this.game.isSquareSelectable(squareName)) {
                this.game.selectSquare(squareName);
                this.buildBoard();
            }
        } else {
            // Check if clicking on same square (deselect)
            if (selected === squareName) {
                this.game.deselectSquare();
                this.buildBoard();
                return;
            }
            
            // Check if clicking on another own piece (reselect)
            if (this.game.isSquareSelectable(squareName)) {
                this.game.selectSquare(squareName);
                this.buildBoard();
                return;
            }
            
            // Try to make move
            if (this.game.isLegalMove(selected, squareName)) {
                const moveDetails = this.game.getMoveDetails(selected, squareName);
                
                // Check if promotion needed
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
        
        // Play sound
        this.playMoveSound(result);
        
        // Update UI
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        // Auto save
        this.autoSaveGame();
        
        // Check game over
        if (this.game.isGameFinished()) {
            this.showGameOverModal();
            return;
        }
        
        // AI move
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
    initStockfish(level) {
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
                    // Set maximum strength
                    this.stockfish.postMessage('setoption name Skill Level value 20');
                    this.stockfish.postMessage('setoption name Threads value 4');
                    this.stockfish.postMessage('setoption name Hash value 128');
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
                
                // Log Stockfish info for debugging
                if (msg.startsWith('info depth')) {
                    // Could parse and display thinking info
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
            // Fallback: random move
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
    startComputerGame(level) {
        this.gameMode = 'computer';
        this.playerColor = 'white';
        this.computerLevel = level;
        
        this.game.newGame();
        this.initStockfish(level);
        
        this.elements.whitePlayerName.textContent = 'أنت (أبيض)';
        this.elements.blackPlayerName.textContent = 'الكمبيوتر (أسود)';
        
        this.buildBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        this.showScreen('gameScreen');
    }
    
    startTwoPlayerGame() {
        this.gameMode = 'twoPlayers';
        this.playerColor = 'white';
        
        this.game.newGame();
        
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        
        this.elements.whitePlayerName.textContent = 'اللاعب 1 (أبيض)';
        this.elements.blackPlayerName.textContent = 'اللاعب 2 (أسود)';
        
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
            if (result) {
                this.elements.gameStatusText.textContent = result.message;
            }
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
        const fullMoves = Math.floor(moves / 2) + 1;
        this.elements.moveCounter.textContent = 'النقلة: ' + fullMoves;
    }
    
    updateCapturedPieces() {
        const captured = this.game.getCapturedPieces();
        const symbols = {
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };
        
        const whiteCaptured = captured.white.map(p => symbols[p] || p).join(' ');
        const blackCaptured = captured.black.map(p => symbols[p] || p).join(' ');
        
        this.elements.capturedByWhite.textContent = whiteCaptured;
        this.elements.capturedByBlack.textContent = blackCaptured;
    }
    
    // ================ Sound ================
    initSoundEngine() {
        this.soundEngine = {
            audioContext: null,
            
            init() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Web Audio API not supported');
                }
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
    
    // ================ Settings ================
    loadSettings() {
        try {
            const saved = localStorage.getItem('drderChessSettings');
            if (saved) this.settings = JSON.parse(saved);
        } catch (e) {}
        this.applySettings();
    }
    
    saveSettings() {
        localStorage.setItem('drderChessSettings', JSON.stringify(this.settings));
    }
    
    applySettings() {
        if (this.elements.soundToggle) this.elements.soundToggle.checked = this.settings.sound;
        if (this.elements.coordsToggle) this.elements.coordsToggle.checked = this.settings.coords;
        if (this.elements.legalMovesToggle) this.elements.legalMovesToggle.checked = this.settings.legalMoves;
    }
    
    resetSettings() {
        this.settings = { sound: true, coords: true, legalMoves: true };
        this.saveSettings();
        this.applySettings();
        this.buildBoard();
    }
    
    // ================ Save/Load ================
    saveGame() {
        if (this.game.isGameFinished()) return;
        
        const saveData = {
            fen: this.game.getFen(),
            pgn: this.game.getPgn(),
            gameMode: this.gameMode,
            playerColor: this.playerColor,
            computerLevel: this.computerLevel,
            timestamp: Date.now()
        };
        
        localStorage.setItem('drderChessSave', JSON.stringify(saveData));
        this.showToast('✓ تم حفظ المباراة');
    }
    
    autoSaveGame() {
        if (this.game.isGameFinished()) return;
        if (this.game.getMoveHistory().length === 0) return;
        
        const saveData = {
            fen: this.game.getFen(),
            pgn: this.game.getPgn(),
            gameMode: this.gameMode,
            playerColor: this.playerColor,
            computerLevel: this.computerLevel,
            timestamp: Date.now()
        };
        
        localStorage.setItem('drderChessSave', JSON.stringify(saveData));
    }
    
    loadSavedGame() {
        const saved = localStorage.getItem('drderChessSave');
        if (!saved) return;
        
        try {
            const saveData = JSON.parse(saved);
            this.gameMode = saveData.gameMode;
            this.playerColor = saveData.playerColor;
            this.computerLevel = saveData.computerLevel;
            
            this.game.newGame();
            this.game.loadPgn(saveData.pgn);
            
            if (this.gameMode === 'computer') {
                this.initStockfish(this.computerLevel);
                this.elements.whitePlayerName.textContent = this.playerColor === 'white' ? 'أنت (أبيض)' : 'الكمبيوتر (أبيض)';
                this.elements.blackPlayerName.textContent = this.playerColor === 'black' ? 'أنت (أسود)' : 'الكمبيوتر (أسود)';
                
                const turn = this.game.getTurn();
                const computerColor = this.playerColor === 'white' ? 'b' : 'w';
                if ((computerColor === 'w' && turn === 'w') || 
                    (computerColor === 'b' && turn === 'b')) {
                    if (!this.game.isGameFinished()) {
                        this.stockfishThinking = true;
                        setTimeout(() => {
                            this.makeAIMove();
                            this.stockfishThinking = false;
                            this.updateGameStatus();
                        }, 500);
                    }
                }
            } else {
                this.elements.whitePlayerName.textContent = 'اللاعب 1 (أبيض)';
                this.elements.blackPlayerName.textContent = 'اللاعب 2 (أسود)';
            }
            
            this.buildBoard();
            this.updateGameStatus();
            this.updateMoveCounter();
            this.updateCapturedPieces();
            this.showScreen('gameScreen');
            
            localStorage.removeItem('drderChessSave');
            this.elements.continueGameContainer.classList.add('hidden');
        } catch (error) {
            console.error('Failed to load saved game:', error);
            localStorage.removeItem('drderChessSave');
        }
    }
    
    checkForSavedGame() {
        const saved = localStorage.getItem('drderChessSave');
        if (saved) {
            this.elements.continueGameContainer.classList.remove('hidden');
        } else {
            this.elements.continueGameContainer.classList.add('hidden');
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
    confirmLeaveGame() {
        if (this.game.getMoveHistory().length > 0 && !this.game.isGameFinished()) {
            this.autoSaveGame();
        }
        this.leaveGame();
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
        this.checkForSavedGame();
    }
    
    resetGame() {
        this.closeGameOverModal();
        
        if (this.gameMode === 'computer') {
            this.startComputerGame(this.computerLevel);
        } else {
            this.startTwoPlayerGame();
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#66bb6a;color:white;padding:12px 24px;border-radius:8px;z-index:200;font-family:sans-serif;';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
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

// Initialize application
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
