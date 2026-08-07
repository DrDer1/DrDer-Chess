// ================ DrDer Chess - Main Application ================

class DrDerChess {
    constructor() {
        // Game state
        this.game = null;
        this.board = null;
        this.gameMode = null; // 'computer' or 'twoPlayers'
        this.playerColor = 'white';
        this.computerLevel = 'medium';
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        
        // Stockfish engine
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishThinking = false;
        
        // Settings
        this.settings = {
            sound: true,
            coords: true,
            legalMoves: true
        };
        
        // Sound engine
        this.soundEngine = null;
        
        // DOM Elements
        this.screens = {};
        this.elements = {};
        
        // Initialize
        this.init();
    }
    
    // ================ Initialization ================
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
            // Menu buttons
            playComputerBtn: document.getElementById('playComputerBtn'),
            twoPlayersBtn: document.getElementById('twoPlayersBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            continueGameBtn: document.getElementById('continueGameBtn'),
            continueGameContainer: document.getElementById('continueGameContainer'),
            
            // Level buttons
            levelButtons: document.querySelectorAll('.level-btn'),
            backFromLevelBtn: document.getElementById('backFromLevelBtn'),
            
            // Game screen
            chessboard: document.getElementById('chessboard'),
            gameStatusText: document.getElementById('gameStatusText'),
            moveCounter: document.getElementById('moveCounter'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            saveGameBtn: document.getElementById('saveGameBtn'),
            whitePlayerName: document.getElementById('whitePlayerName'),
            blackPlayerName: document.getElementById('blackPlayerName'),
            capturedByWhite: document.getElementById('capturedByWhite'),
            capturedByBlack: document.getElementById('capturedByBlack'),
            
            // Modals
            promotionModal: document.getElementById('promotionModal'),
            promotionPieces: document.getElementById('promotionPieces'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            newGameBtn: document.getElementById('newGameBtn'),
            reviewGameBtn: document.getElementById('reviewGameBtn'),
            
            // Settings
            backFromSettingsBtn: document.getElementById('backFromSettingsBtn'),
            soundToggle: document.getElementById('soundToggle'),
            coordsToggle: document.getElementById('coordsToggle'),
            legalMovesToggle: document.getElementById('legalMovesToggle'),
            resetSettingsBtn: document.getElementById('resetSettingsBtn')
        };
    }
    
    initEventListeners() {
        // Menu
        this.elements.playComputerBtn.addEventListener('click', () => this.showScreen('levelSelect'));
        this.elements.twoPlayersBtn.addEventListener('click', () => this.startTwoPlayerGame());
        this.elements.settingsBtn.addEventListener('click', () => this.showScreen('settingsScreen'));
        this.elements.continueGameBtn.addEventListener('click', () => this.loadSavedGame());
        
        // Level select
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
        this.elements.soundToggle.addEventListener('change', () => this.toggleSetting('sound'));
        this.elements.coordsToggle.addEventListener('change', () => this.toggleSetting('coords'));
        this.elements.legalMovesToggle.addEventListener('change', () => this.toggleSetting('legalMoves'));
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }
    
    // ================ Screen Management ================
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }
    
    // ================ Settings Management ================
    loadSettings() {
        const saved = localStorage.getItem('drderChessSettings');
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
            } catch (e) {
                this.settings = { sound: true, coords: true, legalMoves: true };
            }
        }
        this.applySettings();
    }
    
    saveSettings() {
        localStorage.setItem('drderChessSettings', JSON.stringify(this.settings));
    }
    
    applySettings() {
        this.elements.soundToggle.checked = this.settings.sound;
        this.elements.coordsToggle.checked = this.settings.coords;
        this.elements.legalMovesToggle.checked = this.settings.legalMoves;
    }
    
    toggleSetting(setting) {
        this.settings[setting] = !this.settings[setting];
        this.saveSettings();
        
        if (setting === 'coords' && this.board) {
            this.boardConfig.showNotation = this.settings.coords;
            this.board.resize();
        }
    }
    
    resetSettings() {
        this.settings = { sound: true, coords: true, legalMoves: true };
        this.saveSettings();
        this.applySettings();
        if (this.board) {
            this.boardConfig.showNotation = true;
            this.board.resize();
        }
    }
    
    // ================ Sound Engine ================
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
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    
                    oscillator.frequency.value = freq;
                    oscillator.type = 'sine';
                    
                    const startTime = now + (index * duration * 0.5);
                    gainNode.gain.setValueAtTime(0.3, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + duration);
                });
            }
        };
        
        this.soundEngine.init();
    }
    
    playSound(type) {
        if (this.settings.sound) {
            this.soundEngine.play(type);
        }
    }
    
    // ================ Chess Initialization ================
    initChessGame() {
        // Initialize chess.js game
        this.game = new Chess();
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.stockfishThinking = false;
        
        // Update display
        this.updateGameStatus();
        this.updateMoveCounter();
        this.clearCapturedPieces();
        this.closePromotionModal();
        this.closeGameOverModal();
    }
    
    createChessboard() {
        // Destroy existing board if any
        if (this.board) {
            this.board.destroy();
        }
        
        // Board configuration
        this.boardConfig = {
            draggable: true,
            position: 'start',
            orientation: this.playerColor,
            showNotation: this.settings.coords,
            pieceTheme: this.getPieceTheme(),
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSnapEnd: this.onSnapEnd.bind(this),
            onMouseoutSquare: this.onMouseoutSquare.bind(this),
            onMouseoverSquare: this.onMouseoverSquare.bind(this)
        };
        
        // Create board
        this.board = Chessboard('chessboard', this.boardConfig);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.board) {
                this.board.resize();
            }
        });
    }
    
    getPieceTheme() {
        // Unicode chess pieces - using classic symbols
        const pieces = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        return function(piece) {
            return pieces[piece];
        };
    }
    
    // ================ Game Modes ================
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
    
    // ================ Stockfish AI ================
    initStockfish(level) {
        // Terminate existing engine if any
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
        }
        
        this.stockfishReady = false;
        this.stockfishThinking = false;
        
        // Create Stockfish worker
        try {
            this.stockfish = new Worker('libs/stockfish.js');
            
            this.stockfish.onmessage = (event) => {
                this.handleStockfishMessage(event.data);
            };
            
            // Initialize Stockfish
            this.stockfish.postMessage('uci');
            this.stockfish.postMessage('isready');
            
            // Set skill level based on difficulty
            const skillLevels = {
                'easy': 0,
                'medium': 10,
                'hard': 15,
                'expert': 20
            };
            
            const skill = skillLevels[level] || 10;
            this.stockfish.postMessage(`setoption name Skill Level value ${skill}`);
            
            // Set lower depth for easier levels
            const depths = {
                'easy': 1,
                'medium': 8,
                'hard': 15,
                'expert': 20
            };
            
            this.stockfishDepth = depths[level] || 10;
            
        } catch (error) {
            console.error('Failed to load Stockfish:', error);
            // Fallback: use simple random moves if Stockfish fails
            this.stockfish = null;
            this.stockfishReady = false;
        }
    }
    
    handleStockfishMessage(message) {
        if (message === 'readyok') {
            this.stockfishReady = true;
            this.stockfish.postMessage('ucinewgame');
            return;
        }
        
        if (message.startsWith('bestmove')) {
            const bestMove = message.split(' ')[1];
            
            if (bestMove && bestMove !== '(none)' && this.stockfishThinking) {
                this.stockfishThinking = false;
                this.makeAIMove(bestMove);
            }
            return;
        }
        
        // Handle Stockfish errors gracefully
        if (message.includes('Unknown command') || message.includes('error')) {
            console.warn('Stockfish message:', message);
        }
    }
    
    makeAIMove() {
        if (!this.game || this.isGameOver) return;
        
        // Fallback: random move if Stockfish is not available
        if (!this.stockfish || !this.stockfishReady) {
            const moves = this.game.moves({ verbose: true });
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                this.executeMove(randomMove);
            }
            return;
        }
        
        // Get current position in FEN format
        const fen = this.game.fen();
        this.stockfish.postMessage(`position fen ${fen}`);
        this.stockfish.postMessage(`go depth ${this.stockfishDepth}`);
    }
    
    executeComputerMove(moveString) {
        // Parse UCI move and execute it
        const from = moveString.substring(0, 2);
        const to = moveString.substring(2, 4);
        const promotion = moveString.length > 4 ? moveString.substring(4, 5) : undefined;
        
        const moveObj = {
            from: from,
            to: to,
            promotion: promotion || 'q'
        };
        
        this.executeMove(moveObj);
    }
    
    // ================ Move Handling ================
    onDragStart(source, piece, position, orientation) {
        // Don't allow moves if game is over
        if (this.isGameOver) return false;
        
        // Don't allow moves during AI thinking
        if (this.stockfishThinking) return false;
        
        // In computer mode, only allow player moves
        if (this.gameMode === 'computer') {
            const turn = this.game.turn(); // 'w' or 'b'
            if ((this.playerColor === 'white' && turn === 'b') ||
                (this.playerColor === 'black' && turn === 'w')) {
                return false;
            }
        }
        
        // Only allow dragging own pieces
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        // Highlight legal moves
        if (this.settings.legalMoves) {
            this.highlightLegalMoves(source);
        }
        
        return true;
    }
    
    onDrop(source, target) {
        // Clear highlights
        this.clearHighlights();
        
        // Check if it's a promotion move
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
        
        // Try to make the move
        const move = this.game.move({
            from: source,
            to: target,
            promotion: 'q' // Default promotion
        });
        
        // Illegal move
        if (move === null) return 'snapback';
        
        // Successful move
        this.onMoveMade(move);
    }
    
    onSnapEnd() {
        // Update board position
        if (this.board) {
            this.board.position(this.game.fen());
        }
    }
    
    onMouseoverSquare(square, piece) {
        // Can be used for additional highlights
    }
    
    onMouseoutSquare(square, piece) {
        // Can be used to clear highlights
    }
    
    executeMove(move) {
        const result = this.game.move(move);
        
        if (result) {
            this.onMoveMade(result);
        }
    }
    
    onMoveMade(move) {
        // Add to history
        this.moveHistory.push(move);
        
        // Track captured pieces
        if (move.captured) {
            const capturedPiece = move.captured;
            const capturedColor = this.game.turn() === 'w' ? 'b' : 'w';
            this.capturedPieces[capturedColor === 'w' ? 'white' : 'black'].push(capturedPiece);
            
            if (capturedPiece === 'q') {
                this.capturedPieces[capturedColor === 'w' ? 'white' : 'black'].push('queen');
            }
        }
        
        // Update display
        this.updateBoard();
        this.updateGameStatus();
        this.updateMoveCounter();
        this.updateCapturedPieces();
        
        // Play appropriate sound
        if (move.flags.includes('c') || move.captured) {
            this.playSound('capture');
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
            this.playSound('castle');
        } else if (this.game.in_check()) {
            this.playSound('check');
        } else {
            this.playSound('move');
        }
        
        // Check game status
        this.checkGameStatus();
        
        // Auto-save game
        this.autoSaveGame();
        
        // If playing against computer, trigger AI move
        if (this.gameMode === 'computer' && !this.isGameOver) {
            const turn = this.game.turn();
            const computerColor = this.playerColor === 'white' ? 'b' : 'w';
            
            if ((computerColor === 'w' && turn === 'w') || 
                (computerColor === 'b' && turn === 'b')) {
                this.stockfishThinking = true;
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
        
        if (move) {
            this.onMoveMade(move);
        }
    }
    
    // ================ Highlighting ================
    highlightLegalMoves(square) {
        // Get legal moves for this square
        const moves = this.game.moves({
            square: square,
            verbose: true
        });
        
        // Highlight the source square
        document.querySelectorAll(`.square-${square}`).forEach(el => {
            el.classList.add('highlight-source');
        });
        
        // Highlight target squares
        moves.forEach(move => {
            document.querySelectorAll(`.square-${move.to}`).forEach(el => {
                if (move.captured) {
                    el.classList.add('highlight-capture');
                } else {
                    el.classList.add('highlight-move');
                }
            });
        });
    }
    
    clearHighlights() {
        document.querySelectorAll('.highlight-source, .highlight-move, .highlight-capture').forEach(el => {
            el.classList.remove('highlight-source', 'highlight-move', 'highlight-capture');
        });
    }
    
    // ================ Game Status ================
    checkGameStatus() {
        if (!this.game) return;
        
        let status = '';
        let title = '';
        let message = '';
        
        if (this.game.in_checkmate()) {
            const winner = this.game.turn() === 'w' ? 'الأسود' : 'الأبيض';
            title = 'كش مات!';
            message = `${winner} فاز بالمباراة`;
            this.isGameOver = true;
            this.playSound('gameOver');
        } else if (this.game.in_draw()) {
            title = 'تعادل!';
            if (this.game.in_stalemate()) {
                message = 'تعادل بالجمود';
            } else if (this.game.in_threefold_repetition()) {
                message = 'تعادل بالتكرار الثلاثي';
            } else if (this.game.insufficient_material()) {
                message = 'تعادل لعدم كفاية القطع';
            } else {
                message = 'تعادل بقاعدة الخمسين نقلة';
            }
            this.isGameOver = true;
            this.playSound('gameOver');
        } else if (this.game.in_check()) {
            status = 'كش!';
        }
        
        if (this.isGameOver) {
            setTimeout(() => this.showGameOverModal(title, message), 500);
        }
        
        return status;
    }
    
    updateGameStatus() {
        if (!this.game) return;
        
        let status = '';
        const turn = this.game.turn();
        
        if (this.isGameOver) {
            if (this.game.in_checkmate()) {
                status = 'كش مات!';
            } else {
                status = 'تعادل';
            }
        } else if (this.game.in_check()) {
            status = 'كش!';
        }
        
        const turnText = turn === 'w' ? 'دور الأبيض' : 'دور الأسود';
        
        if (this.stockfishThinking) {
            this.elements.gameStatusText.textContent = 'الكمبيوتر يفكر...';
        } else if (status) {
            this.elements.gameStatusText.textContent = `${turnText} - ${status}`;
        } else {
            this.elements.gameStatusText.textContent = turnText;
        }
    }
    
    updateMoveCounter() {
        if (!this.game) return;
        const moves = this.game.history().length;
        const fullMoves = Math.floor(moves / 2) + 1;
        this.elements.moveCounter.textContent = `النقلة: ${fullMoves}`;
    }
    
    // ================ Display Updates ================
    updateBoard() {
        if (this.board) {
            this.board.position(this.game.fen());
        }
    }
    
    updateCapturedPieces() {
        if (!this.game) return;
        
        const whiteCaptured = [];
        const blackCaptured = [];
        
        this.moveHistory.forEach(move => {
            if (move.captured) {
                const capturer = move.color;
                if (capturer === 'w') {
                    blackCaptured.push(this.getPieceSymbol('b' + move.captured.toUpperCase()));
                } else {
                    whiteCaptured.push(this.getPieceSymbol('w' + move.captured.toUpperCase()));
                }
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
        return symbols[piece] || piece;
    }
    
    // ================ Modals ================
    showPromotionModal(color) {
        const pieces = color === 'w' ? ['q', 'r', 'b', 'n'] : ['q', 'r', 'b', 'n'];
        const symbols = {
            'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘',
            'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞'
        };
        
        this.elements.promotionPieces.innerHTML = '';
        
        pieces.forEach(piece => {
            const pieceKey = color + piece;
            const symbol = symbols[pieceKey];
            
            const div = document.createElement('div');
            div.className = 'promotion-piece';
            div.textContent = symbol;
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
    
    // ================ Game Actions ================
    confirmLeaveGame() {
        if (this.moveHistory.length > 0 && !this.isGameOver) {
            if (confirm('هل تريد الخروج؟ سيتم حفظ المباراة تلقائياً.')) {
                this.autoSaveGame();
                this.leaveGame();
            }
        } else {
            this.leaveGame();
        }
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
        
        if (this.gameMode === 'computer') {
            this.startComputerGame(this.computerLevel);
        } else {
            this.startTwoPlayerGame();
        }
    }
    
    // ================ Save/Load ================
    saveGame() {
        if (!this.game || this.isGameOver) return;
        
        const saveData = {
            fen: this.game.fen(),
            pgn: this.game.pgn(),
            history: this.moveHistory,
            gameMode: this.gameMode,
            playerColor: this.playerColor,
            computerLevel: this.computerLevel,
            capturedPieces: this.capturedPieces,
            timestamp: Date.now()
        };
        
        localStorage.setItem('drderChessSave', JSON.stringify(saveData));
        
        // Show brief confirmation
        this.showSaveConfirmation();
    }
    
    autoSaveGame() {
        if (!this.game || this.isGameOver || this.moveHistory.length === 0) return;
        
        const saveData = {
            fen: this.game.fen(),
            pgn: this.game.pgn(),
            history: this.moveHistory,
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
            this.moveHistory = saveData.history || [];
            this.capturedPieces = saveData.capturedPieces || { white: [], black: [] };
            
            this.game = new Chess();
            this.game.load_pgn(saveData.pgn);
            
            this.createChessboard();
            
            if (this.gameMode === 'computer') {
                this.initStockfish(this.computerLevel);
                this.elements.whitePlayerName.textContent = this.playerColor === 'white' ? 'أنت (أبيض)' : 'الكمبيوتر (أبيض)';
                this.elements.blackPlayerName.textContent = this.playerColor === 'black' ? 'أنت (أسود)' : 'الكمبيوتر (أسود)';
                
                // If it's computer's turn, trigger AI
                const turn = this.game.turn();
                const computerColor = this.playerColor === 'white' ? 'b' : 'w';
                if ((computerColor === 'w' && turn === 'w') || 
                    (computerColor === 'b' && turn === 'b')) {
                    if (!this.isGameOver) {
                        this.stockfishThinking = true;
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
            
            // Clear save after loading
            localStorage.removeItem('drderChessSave');
            this.elements.continueGameContainer.classList.add('hidden');
            
        } catch (error) {
            console.error('Failed to load saved game:', error);
            localStorage.removeItem('drderChessSave');
            alert('تعذر تحميل المباراة المحفوظة.');
        }
    }
    
    checkForSavedGame() {
        const saved = localStorage.getItem('drderChessSave');
        if (saved) {
            try {
                const saveData = JSON.parse(saved);
                if (saveData.pgn && !this.isGameOver) {
                    this.elements.continueGameContainer.classList.remove('hidden');
                    return;
                }
            } catch (e) {
                localStorage.removeItem('drderChessSave');
            }
        }
        this.elements.continueGameContainer.classList.add('hidden');
    }
    
    showSaveConfirmation() {
        // Create a temporary toast notification
        const toast = document.createElement('div');
        toast.textContent = '✓ تم حفظ المباراة';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--success, #66bb6a);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: var(--font-primary);
            z-index: 200;
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // ================ Service Worker ================
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }
}

// ================ Initialize Application ================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Chess library to be available
    const checkChess = setInterval(() => {
        if (typeof Chess !== 'undefined') {
            clearInterval(checkChess);
            
            // Wait for Chessboard library
            const checkChessboard = setInterval(() => {
                if (typeof Chessboard !== 'undefined') {
                    clearInterval(checkChessboard);
                    
                    // Initialize the app
                    window.drderChess = new DrDerChess();
                }
            }, 50);
        }
    }, 50);
});

// Handle uncaught errors gracefully
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
