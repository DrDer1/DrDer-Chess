// ================ DrDer Chess - Main Application ================

class DrDerChess {
    constructor() {
        this.game = null;
        this.board = null;
        this.gameMode = null;
        this.playerColor = 'white';
        this.computerLevel = 'medium';
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishThinking = false;
        this.pendingPromotion = null;
        
        this.settings = {
            sound: true,
            coords: true,
            legalMoves: true
        };
        
        this.soundEngine = null;
        this.screens = {};
        this.elements = {};
        
        this.init();
    }
    
    init() {
        this.cacheDomElements();
        this.loadSettings();
        this.initSoundEngine();
        this.initEventListeners();
        this.checkForSavedGame();
        this.registerServiceWorker();
        this.showScreen('mainMenu');
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
        this.elements.playComputerBtn.addEventListener('click', () => this.showScreen('levelSelect'));
        this.elements.twoPlayersBtn.addEventListener('click', () => this.startTwoPlayerGame());
        this.elements.settingsBtn.addEventListener('click', () => this.showScreen('settingsScreen'));
        this.elements.continueGameBtn.addEventListener('click', () => this.loadSavedGame());
        
        this.elements.levelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.currentTarget.dataset.level;
                this.startComputerGame(level);
            });
        });
        
        this.elements.backFromLevelBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        this.elements.backToMenuBtn.addEventListener('click', () => this.confirmLeaveGame());
        this.elements.saveGameBtn.addEventListener('click', () => this.saveGame());
        this.elements.newGameBtn.addEventListener('click', () => this.resetGame());
        this.elements.reviewGameBtn.addEventListener('click', () => this.closeGameOverModal());
        this.elements.backFromSettingsBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        
        this.elements.soundToggle.addEventListener('change', () => {
            this.settings.sound = this.elements.soundToggle.checked;
            this.saveSettings();
        });
        
        this.elements.coordsToggle.addEventListener('change', () => {
            this.settings.coords = this.elements.coordsToggle.checked;
            this.saveSettings();
            if (this.board) this.board.resize();
        });
        
        this.elements.legalMovesToggle.addEventListener('change', () => {
            this.settings.legalMoves = this.elements.legalMovesToggle.checked;
            this.saveSettings();
        });
        
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }
    
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
    }
    
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
                    move: [440, 550], capture: [330, 220],
                    check: [660, 880], gameOver: [440, 330, 220],
                    castle: [550, 660]
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
    
    playSound(type) {
        if (this.settings.sound && this.soundEngine) {
            this.soundEngine.play(type);
        }
    }
    
    initChessGame() {
        this.game = new Chess();
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.stockfishThinking = false;
        this.updateGameStatus();
        this.updateMoveCounter();
        this.clearCapturedPieces();
        this.closePromotionModal();
        this.closeGameOverModal();
    }
    
    createChessboard() {
        if (this.board) this.board.destroy();
        
        this.boardConfig = {
            draggable: true,
            position: 'start',
            orientation: this.playerColor,
            showNotation: this.settings.coords,
            pieceTheme: function(piece) {
                const symbols = {
                    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
                    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
                };
                return symbols[piece] || '';
            },
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSnapEnd: this.onSnapEnd.bind(this)
        };
        
        this.board = Chessboard('chessboard', this.boardConfig);
    }
    
    startComputerGame(level) {
        this.gameMode = 'computer';
        this.playerColor = 'white';
        this.computerLevel = level;
        this.initChessGame();
        this.createChessboard();
        this.initStockfish(level);
        this.elements.whitePlayerName.textContent = 'أنت (أبيض)';
        this.elements.blackPlayerName.textContent = 'الكمبيوتر (أسود)';
        this.showScreen('gameScreen');
    }
    
    startTwoPlayerGame() {
        this.gameMode = 'twoPlayers';
        this.playerColor = 'white';
        this.initChessGame();
        this.createChessboard();
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        this.elements.whitePlayerName.textContent = 'اللاعب 1 (أبيض)';
        this.elements.blackPlayerName.textContent = 'اللاعب 2 (أسود)';
        this.showScreen('gameScreen');
    }
    
    initStockfish(level) {
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
        }
        
        this.stockfishReady = false;
        this.stockfishThinking = false;
        
        try {
            this.stockfish = new Worker('libs/stockfish.js');
            
            this.stockfish.onmessage = (event) => {
                const msg = event.data;
                
                if (msg === 'readyok') {
                    this.stockfishReady = true;
                    this.stockfish.postMessage('ucinewgame');
                    const skillLevels = { easy: 0, medium: 10, hard: 15, expert: 20 };
                    const depths = { easy: 2, medium: 8, hard: 15, expert: 20 };
                    this.stockfish.postMessage('setoption name Skill Level value ' + (skillLevels[level] || 10));
                    this.stockfishDepth = depths[level] || 10;
                }
                
                if (msg.startsWith('bestmove')) {
                    const bestMove = msg.split(' ')[1];
                    if (bestMove && bestMove !== '(none)' && this.stockfishThinking) {
                        this.stockfishThinking = false;
                        const from = bestMove.substring(0, 2);
                        const to = bestMove.substring(2, 4);
                        const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : 'q';
                        this.executeMove({ from, to, promotion });
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
        if (!this.game || this.isGameOver) return;
        
        if (!this.stockfish || !this.stockfishReady) {
            const moves = this.game.moves({ verbose: true });
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                setTimeout(() => this.executeMove(randomMove), 300);
            }
            return;
        }
        
        const fen = this.game.fen();
        this.stockfish.postMessage('position fen ' + fen);
        this.stockfish.postMessage('go depth ' + (this.stockfishDepth || 10));
    }
    
    onDragStart(source, piece, position, orientation) {
        if (this.isGameOver) return false;
        if (this.stockfishThinking) return false;
        
        if (this.gameMode === 'computer') {
            const turn = this.game.turn();
            if ((this.playerColor === 'white' && turn === 'b') ||
                (this.playerColor === 'black' && turn === 'w')) {
                return false;
            }
        }
        
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        return true;
    }
    
    onDrop(source, target) {
        if (source === target) return 'snapback';
        
        const piece = this.game.get(source);
        if (piece && piece.type === 'p') {
            const isPromotion = (
                (piece.color === 'w' && target.charAt(1) === '8') ||
                (piece.color === 'b' && target.charAt(1) === '1')
            );
            
            if (isPromotion) {
                this.pendingPromotion = { from: source, to: target };
                this.showPromotionModal(piece.color);
                return 'snapback';
            }
        }
        
        const move = this.game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        
        this.onMoveMade(move);
    }
    
    onSnapEnd() {
        if (this.board) this.board.position(this.game.fen());
    }
    
    executeMove(move) {
        const result = this.game.move(move);
        if (result) this.onMoveMade(result);
    }
    
    onMoveMade(move) {
        this.moveHistory.push(move);
        
        if (move.captured) {
            const capturedColor = this.game.turn() === 'w' ? 'b' : 'w';
            this.capturedPieces[capturedColor === 'w' ? 'white' : 'black'].push(move.captured);
        }
        
        this.updateBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        if (move.flags && move.flags.includes('c')) {
            this.playSound('capture');
        } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
            this.playSound('castle');
        } else if (this.game.in_check()) {
            this.playSound('check');
        } else {
            this.playSound('move');
        }
        
        this.checkGameStatus();
        this.autoSaveGame();
        
        if (this.gameMode === 'computer' && !this.isGameOver) {
            const turn = this.game.turn();
            const computerColor = this.playerColor === 'white' ? 'b' : 'w';
            
            if ((computerColor === 'w' && turn === 'w') || 
                (computerColor === 'b' && turn === 'b')) {
                this.stockfishThinking = true;
                this.updateGameStatus();
                setTimeout(() => this.makeAIMove(), 300);
            }
        }
    }
    
    executePromotion(piece) {
        if (!this.pendingPromotion) return;
        
        const move = this.game.move({
            from: this.pendingPromotion.from,
            to: this.pendingPromotion.to,
            promotion: piece
        });
        
        this.closePromotionModal();
        this.pendingPromotion = null;
        
        if (move) this.onMoveMade(move);
    }
    
    checkGameStatus() {
        if (!this.game) return;
        
        let title = '', message = '';
        
        if (this.game.in_checkmate()) {
            const winner = this.game.turn() === 'w' ? 'الأسود' : 'الأبيض';
            title = 'كش مات!';
            message = winner + ' فاز بالمباراة';
            this.isGameOver = true;
            this.playSound('gameOver');
        } else if (this.game.in_draw()) {
            title = 'تعادل!';
            if (this.game.in_stalemate()) message = 'تعادل بالجمود';
            else if (this.game.in_threefold_repetition()) message = 'تعادل بالتكرار الثلاثي';
            else if (this.game.insufficient_material()) message = 'تعادل لعدم كفاية القطع';
            else message = 'تعادل بقاعدة الخمسين نقلة';
            this.isGameOver = true;
            this.playSound('gameOver');
        }
        
        if (this.isGameOver) {
            setTimeout(() => this.showGameOverModal(title, message), 500);
        }
    }
    
    updateGameStatus() {
        if (!this.game) return;
        
        const turn = this.game.turn();
        const turnText = turn === 'w' ? 'دور الأبيض' : 'دور الأسود';
        
        if (this.stockfishThinking) {
            this.elements.gameStatusText.textContent = 'الكمبيوتر يفكر...';
        } else if (this.game.in_check()) {
            this.elements.gameStatusText.textContent = turnText + ' - كش!';
        } else {
            this.elements.gameStatusText.textContent = turnText;
        }
    }
    
    updateMoveCounter() {
        if (!this.game) return;
        const moves = this.game.history().length;
        this.elements.moveCounter.textContent = 'النقلة: ' + (Math.floor(moves / 2) + 1);
    }
    
    updateBoard() {
        if (this.board) this.board.position(this.game.fen());
    }
    
    updateCapturedPieces() {
        const whiteCaptured = [], blackCaptured = [];
        
        this.moveHistory.forEach(move => {
            if (move.captured) {
                const symbol = this.getPieceSymbol((move.color === 'w' ? 'b' : 'w') + move.captured.toUpperCase());
                if (move.color === 'w') blackCaptured.push(symbol);
                else whiteCaptured.push(symbol);
            }
        });
        
        this.elements.capturedByWhite.textContent = blackCaptured.join(' ');
        this.elements.capturedByBlack.textContent = whiteCaptured.join(' ');
    }
    
    clearCapturedPieces() {
        this.elements.capturedByWhite.textContent = '';
        this.elements.capturedByBlack.textContent = '';
    }
    
    getPieceSymbol(piece) {
        const symbols = {
            'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
            'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
        };
        return symbols[piece] || '';
    }
    
    showPromotionModal(color) {
        const pieces = ['q', 'r', 'b', 'n'];
        const symbols = {
            'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘',
            'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞'
        };
        
        this.elements.promotionPieces.innerHTML = '';
        pieces.forEach(piece => {
            const pieceKey = color + piece;
            const div = document.createElement('div');
            div.className = 'promotion-piece';
            div.textContent = symbols[pieceKey];
            div.addEventListener('click', () => this.executePromotion(piece));
            this.elements.promotionPieces.appendChild(div);
        });
        
        this.elements.promotionModal.classList.remove('hidden');
    }
    
    closePromotionModal() {
        this.elements.promotionModal.classList.add('hidden');
    }
    
    showGameOverModal(title, message) {
        this.elements.gameOverTitle.textContent = title;
        this.elements.gameOverMessage.textContent = message;
        this.elements.gameOverModal.classList.remove('hidden');
    }
    
    closeGameOverModal() {
        this.elements.gameOverModal.classList.add('hidden');
    }
    
    confirmLeaveGame() {
        if (this.moveHistory.length > 0 && !this.isGameOver) {
            this.autoSaveGame();
        }
        this.leaveGame();
    }
    
    leaveGame() {
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        if (this.board) {
            this.board.destroy();
            this.board = null;
        }
        this.game = null;
        this.isGameOver = false;
        this.stockfishThinking = false;
        this.showScreen('mainMenu');
        this.checkForSavedGame();
    }
    
    resetGame() {
        this.closeGameOverModal();
        if (this.gameMode === 'computer') this.startComputerGame(this.computerLevel);
        else this.startTwoPlayerGame();
    }
    
    saveGame() {
        if (!this.game || this.isGameOver) return;
        
        const saveData = {
            fen: this.game.fen(),
            pgn: this.game.pgn(),
            gameMode: this.gameMode,
            playerColor: this.playerColor,
            computerLevel: this.computerLevel,
            capturedPieces: this.capturedPieces,
            timestamp: Date.now()
        };
        
        localStorage.setItem('drderChessSave', JSON.stringify(saveData));
        this.showToast('✓ تم حفظ المباراة');
    }
    
    autoSaveGame() {
        if (!this.game || this.isGameOver || this.moveHistory.length === 0) return;
        
        const saveData = {
            fen: this.game.fen(),
            pgn: this.game.pgn(),
            gameMode: this.gameMode,
            playerColor: this.playerColor,
            computerLevel: this.computerLevel,
            capturedPieces: this.capturedPieces,
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
            this.capturedPieces = saveData.capturedPieces || { white: [], black: [] };
            
            this.game = new Chess();
            this.game.load_pgn(saveData.pgn);
            this.createChessboard();
            
            if (this.gameMode === 'computer') {
                this.initStockfish(this.computerLevel);
                this.elements.whitePlayerName.textContent = this.playerColor === 'white' ? 'أنت (أبيض)' : 'الكمبيوتر (أبيض)';
                this.elements.blackPlayerName.textContent = this.playerColor === 'black' ? 'أنت (أسود)' : 'الكمبيوتر (أسود)';
                
                const turn = this.game.turn();
                const computerColor = this.playerColor === 'white' ? 'b' : 'w';
                if ((computerColor === 'w' && turn === 'w') || 
                    (computerColor === 'b' && turn === 'b')) {
                    if (!this.isGameOver) {
                        this.stockfishThinking = true;
                        this.updateGameStatus();
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                }
            } else {
                this.elements.whitePlayerName.textContent = 'اللاعب 1 (أبيض)';
                this.elements.blackPlayerName.textContent = 'اللاعب 2 (أسود)';
            }
            
            this.updateBoard();
            this.updateGameStatus();
            this.updateMoveCounter();
            this.updateCapturedPieces();
            this.checkGameStatus();
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
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#66bb6a;color:white;padding:12px 24px;border-radius:8px;z-index:200;font-family:sans-serif;';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2000);
    }
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(() => {});
            });
        }
    }
}

// Start the application
(function() {
    if (typeof Chess === 'undefined') {
        console.error('Chess library not loaded');
        return;
    }
    if (typeof Chessboard === 'undefined') {
        console.error('Chessboard library not loaded');
        return;
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        window.drderChess = new DrDerChess();
    });
})();
