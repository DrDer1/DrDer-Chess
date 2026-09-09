// ================ app.js - Main Application ================

class DrDerChessApp {
    constructor() {
        this.game = null;
        this.gameMode = null;
        this.playerColor = 'white';
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishThinking = false;
        this.stockfishDepth = 99;
        this.stockfishMoveTime = 15000;
        this.aiTimeout = null;
        this.pendingPromotion = null;
        this.twoPlayerFlipped = false;
        
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
        this.boardBuilt = false;
        
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
    
    // ================ Color Helpers ================
    getComputerColor() {
        return this.playerColor === 'white' ? 'black' : 'white';
    }
    
    getPlayerChessColor() {
        return this.playerColor === 'white' ? 'w' : 'b';
    }
    
    getComputerChessColor() {
        return this.playerColor === 'white' ? 'b' : 'w';
    }
    
    isComputerTurn() {
        if (this.gameMode !== 'computer' || !this.game) {
            return false;
        }
        return this.game.getTurn() === this.getComputerChessColor();
    }
    
    isPlayerTurn() {
        if (!this.game) {
            return false;
        }
        if (this.gameMode === 'twoPlayers') {
            return true;
        }
        return this.game.getTurn() === this.getPlayerChessColor();
    }
    
    validatePlayerColors() {
        if (this.gameMode !== 'computer') {
            return true;
        }
        if (this.playerColor !== 'white' && this.playerColor !== 'black') {
            console.error('Invalid player color:', this.playerColor);
            this.playerColor = 'white';
            return false;
        }
        const playerColor = this.getPlayerChessColor();
        const computerColor = this.getComputerChessColor();
        if (playerColor === computerColor) {
            console.error('Player/Computer color conflict detected');
            return false;
        }
        return true;
    }
    
    verifyMoveOwnership(from, expectedColor) {
        if (!this.game) {
            return false;
        }
        const piece = this.game.getPiece(from);
        if (!piece) {
            console.error('Move rejected: no piece on square', from);
            return false;
        }
        if (piece.color !== expectedColor) {
            console.error(
                'Move rejected: piece color conflict',
                { square: from, pieceColor: piece.color, expectedColor: expectedColor }
            );
            return false;
        }
        if (this.game.getTurn() !== expectedColor) {
            console.error(
                'Move rejected: turn/color conflict',
                { turn: this.game.getTurn(), expectedColor: expectedColor }
            );
            return false;
        }
        return true;
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
    
    // ================ Board ================
    buildBoard() {
        const boardContainer = this.elements.chessboard;
        if (!boardContainer) return;
        
        boardContainer.innerHTML = '';
        boardContainer.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);';
        this.boardElements = {};
        this.pieceElements = {};
        this.boardBuilt = true;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                const squareName = this.getSquareName(row, col);
                
                square.className = 'chess-square';
                square.dataset.square = squareName;
                square.style.cssText = 
                    'display:flex;align-items:center;justify-content:center;position:relative;' +
                    'background-color:' + (isLight ? '#d4a574' : '#6b4423') + ';' +
                    'cursor:pointer;';
                
                boardContainer.appendChild(square);
                this.boardElements[squareName] = square;
            }
        }
        
        boardContainer.onclick = (event) => {
            const square = event.target.closest('.chess-square');
            if (!square || !boardContainer.contains(square)) {
                return;
            }
            const squareName = square.dataset.square;
            if (!squareName) {
                return;
            }
            this.handleSquareClick(squareName);
        };
        
        this.updateBoardOrientation();
        this.renderPieces();
    }
    
    updateBoardOrientation() {
        const boardContainer = this.elements.chessboard;
        if (!boardContainer) return;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareName = this.getSquareName(row, col);
                const square = this.boardElements[squareName];
                if (!square) continue;
                
                let visualRow, visualCol;
                
                if (this.gameMode === 'twoPlayers' && this.twoPlayerFlipped) {
                    visualRow = 7 - row;
                    visualCol = 7 - col;
                } else {
                    visualRow = row;
                    visualCol = col;
                }
                
                square.style.gridRow = String(visualRow + 1);
                square.style.gridColumn = String(visualCol + 1);
            }
        }
    }
    
    getSquareName(row, col) {
        const file = String.fromCharCode(97 + col);
        const rank = 8 - row;
        return file + rank;
    }
    
    renderPieces() {
        if (!this.game || !this.boardBuilt) return;
        
        const board = this.game.getBoard();
        if (!board) return;
        
        const symbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        Object.values(this.pieceElements).forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        this.pieceElements = {};
        
        this.clearAllHighlights();
        
        const boardContainer = this.elements.chessboard;
        const containerSize = boardContainer.offsetWidth || 400;
        const pieceFontSize = containerSize / 8 * 0.75;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                
                const squareName = this.getSquareName(row, col);
                const pieceKey = piece.color + piece.type.toUpperCase();
                
                // القطعة توضع دائماً في مربعها الحقيقي
                const targetSquareEl = this.boardElements[squareName];
                
                if (!targetSquareEl) continue;
                
                const pieceEl = document.createElement('div');
                pieceEl.className = 'chess-piece';
                pieceEl.setAttribute('data-piece', pieceKey);
                pieceEl.textContent = symbols[pieceKey] || '';
                pieceEl.style.cssText = 
                    'display:flex;align-items:center;justify-content:center;' +
                    'width:100%;height:100%;' +
                    'font-size:' + pieceFontSize + 'px;' +
                    'font-weight:bold;cursor:pointer;' +
                    'pointer-events:none;' +
                    'z-index:3;';
                
                targetSquareEl.appendChild(pieceEl);
                this.pieceElements[squareName] = pieceEl;
            }
        }
        
        this.showSelection();
        this.showLastMove();
    }
    
    clearAllHighlights() {
        Object.values(this.boardElements).forEach(square => {
            const squareName = square.dataset.square;
            if (squareName) {
                const col = squareName.charCodeAt(0) - 97;
                const row = 8 - parseInt(squareName[1]);
                const isLight = (row + col) % 2 === 0;
                square.style.backgroundColor = isLight ? '#d4a574' : '#6b4423';
            }
        });
        
        Object.values(this.boardElements).forEach(square => {
            const dots = square.querySelectorAll('div');
            dots.forEach(dot => {
                if (dot.style.width === '30%') dot.remove();
            });
        });
    }
    
    showSelection() {
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
                        'background-color:rgba(0,0,0,0.3);pointer-events:none;';
                    squareEl.appendChild(dot);
                }
            });
        }
    }
    
    showLastMove() {
        const lastMove = this.game.getLastMove();
        if (!lastMove) return;
        
        const fromEl = this.boardElements[lastMove.from];
        const toEl = this.boardElements[lastMove.to];
        
        if (fromEl) fromEl.style.backgroundColor = 'rgba(241, 196, 15, 0.4)';
        if (toEl) toEl.style.backgroundColor = 'rgba(241, 196, 15, 0.6)';
    }
    
    handleSquareClick(squareName) {
        if (!this.game) return;
        
        // dataset.square يحتوي دائماً على الإحداثي الحقيقي للمربع
        const realSquare = squareName;
        
        if (this.game.isGameFinished()) return;
        if (this.gameMode === 'computer' && this.stockfishThinking) {
            return;
        }
        
        const selected = this.game.selectedSquare;
        const clickedPiece = this.game.getPiece(realSquare);
        
        if (this.gameMode === 'computer') {
            const playerColor = this.getPlayerChessColor();
            if (this.game.getTurn() !== playerColor) {
                return;
            }
            if (
                clickedPiece &&
                clickedPiece.color !== playerColor &&
                selected &&
                this.game.isLegalMove(selected, realSquare)
            ) {
                this.makeMoveAndUpdate(selected, realSquare);
                return;
            }
        }
        
        if (!selected) {
            if (this.game.isSquareSelectable(realSquare)) {
                this.game.selectSquare(realSquare);
                this.renderPieces();
            }
            return;
        }
        
        if (selected === realSquare) {
            this.game.deselectSquare();
            this.renderPieces();
            return;
        }
        
        if (this.game.isSquareSelectable(realSquare)) {
            this.game.selectSquare(realSquare);
            this.renderPieces();
            return;
        }
        
        if (this.game.isLegalMove(selected, realSquare)) {
            this.makeMoveAndUpdate(selected, realSquare);
            return;
        }
        
        this.game.deselectSquare();
        this.renderPieces();
    }
    
    makeMoveAndUpdate(from, to, promotion = 'q') {
        if (!this.game) return;
        
        const isComputerMove = this.gameMode === 'computer' && this.isComputerTurn();
        
        if (this.gameMode === 'computer') {
            const playerColor = this.getPlayerChessColor();
            const computerColor = this.getComputerChessColor();
            const currentTurn = this.game.getTurn();
            const expectedColor = currentTurn === playerColor ? playerColor : computerColor;
            
            if (!this.verifyMoveOwnership(from, expectedColor)) {
                this.stockfishThinking = false;
                this.updateGameStatus();
                return;
            }
        }
        
        const result = this.game.makeMove(from, to, promotion);
        if (!result) {
            this.stockfishThinking = false;
            this.updateGameStatus();
            return;
        }
        
        if (result.needsPromotion) {
            if (isComputerMove) {
                const promotionPiece = promotion || 'q';
                const moveResult = this.game.makeMove(
                    result.from,
                    result.to,
                    promotionPiece
                );
                if (moveResult && !moveResult.needsPromotion) {
                    this.stockfishThinking = false;
                    this.afterMoveUpdate(moveResult);
                } else {
                    this.stockfishThinking = false;
                    this.updateGameStatus();
                }
                return;
            }
            this.pendingPromotion = { from: result.from, to: result.to, color: result.color };
            this.showPromotionModal(result.color);
            return;
        }
        
        this.afterMoveUpdate(result);
    }
    
    afterMoveUpdate(result) {
        if (this.gameMode === 'twoPlayers') {
            this.twoPlayerFlipped = !this.twoPlayerFlipped;
            this.updateBoardOrientation();
        }
        
        this.renderPieces();
        this.updateGameStatus();
        this.updateCapturedPieces();
        
        if (this.game.isGameFinished()) {
            this.playSound('gameOver');
            this.showGameOverModal();
            this.stockfishThinking = false;
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
            if (this.aiTimeout) {
                clearTimeout(this.aiTimeout);
                this.aiTimeout = null;
            }
            
            if (this.isComputerTurn()) {
                this.stockfishThinking = true;
                this.updateGameStatus();
                this.aiTimeout = setTimeout(() => {
                    this.aiTimeout = null;
                    this.makeAIMove();
                }, 200);
            } else {
                this.stockfishThinking = false;
                this.updateGameStatus();
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
                const msg = String(event.data || '');
                
                if (msg === 'readyok') {
                    this.stockfishReady = true;
                    this.stockfish.postMessage('ucinewgame');
                    
                    this.stockfish.postMessage('setoption name UCI_LimitStrength value false');
                    this.stockfish.postMessage('setoption name Skill Level value 20');
                    this.stockfish.postMessage('setoption name MultiPV value 1');
                    this.stockfish.postMessage('setoption name Contempt value 0');
                    
                    this.stockfishDepth = 99;
                    this.stockfishMoveTime = 15000;
                }
                
                if (msg.startsWith('bestmove')) {
                    const bestMove = msg.split(' ')[1];
                    
                    if (!bestMove || bestMove === '(none)' || !this.stockfishThinking) {
                        return;
                    }
                    
                    if (!this.isComputerTurn()) {
                        this.stockfishThinking = false;
                        this.updateGameStatus();
                        return;
                    }
                    
                    const from = bestMove.substring(0, 2);
                    const to = bestMove.substring(2, 4);
                    const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : 'q';
                    
                    const computerColor = this.getComputerChessColor();
                    const piece = this.game.getPiece(from);
                    if (!piece || piece.color !== computerColor) {
                        this.stockfishThinking = false;
                        console.error('Stockfish returned a move for the wrong color');
                        return;
                    }
                    
                    this.makeMoveAndUpdate(from, to, promotion);
                }
            };
            
            this.stockfish.postMessage('uci');
            this.stockfish.postMessage('isready');
        } catch (error) {
            this.stockfish = null;
        }
    }
    
    makeAIMove() {
        if (!this.game) {
            this.stockfishThinking = false;
            return;
        }
        
        if (this.gameMode !== 'computer') {
            this.stockfishThinking = false;
            return;
        }
        
        if (this.game.isGameFinished()) {
            this.stockfishThinking = false;
            this.updateGameStatus();
            return;
        }
        
        if (!this.isComputerTurn()) {
            this.stockfishThinking = false;
            this.updateGameStatus();
            return;
        }
        
        if (!this.stockfish || !this.stockfishReady) {
            const moves = this.game.getLegalMoves();
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                setTimeout(() => {
                    if (!this.game || this.game.isGameFinished()) {
                        this.stockfishThinking = false;
                        this.updateGameStatus();
                        return;
                    }
                    
                    if (!this.isComputerTurn()) {
                        this.stockfishThinking = false;
                        this.updateGameStatus();
                        return;
                    }
                    
                    this.makeMoveAndUpdate(
                        randomMove.from,
                        randomMove.to,
                        randomMove.promotion || 'q'
                    );
                }, 200);
                return;
            }
            this.stockfishThinking = false;
            this.updateGameStatus();
            return;
        }
        
        const fen = this.game.getFen();
        this.stockfish.postMessage('position fen ' + fen);
        this.stockfish.postMessage(
            'go depth ' + this.stockfishDepth + ' movetime ' + this.stockfishMoveTime
        );
    }
    
    startComputerGame() {
        this.gameMode = 'computer';
        this.playerColor = this.getRandomColor();
        this.validatePlayerColors();
        this.game = new ChessGame();
        this.boardBuilt = false;
        this.twoPlayerFlipped = false;
        
        this.initStockfish();
        
        this.elements.opponentName.textContent = 'الكمبيوتر';
        this.elements.playerNameBottom.textContent = 'DrDer';
        
        this.showScreen('gameScreen');
        this.buildBoard();
        this.updateGameStatus();
        this.updateCapturedPieces();
        
        if (this.isComputerTurn()) {
            this.stockfishThinking = true;
            this.updateGameStatus();
            this.aiTimeout = setTimeout(() => {
                this.aiTimeout = null;
                this.makeAIMove();
            }, 500);
        }
    }
    
    startTwoPlayerGame() {
        this.gameMode = 'twoPlayers';
        this.playerColor = this.getRandomColor();
        this.game = new ChessGame();
        this.boardBuilt = false;
        this.twoPlayerFlipped = false;
        
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = null;
            this.stockfishReady = false;
        }
        
        this.elements.opponentName.textContent = 'اللاعب 2';
        this.elements.playerNameBottom.textContent = 'DrDer';
        
        this.showScreen('gameScreen');
        this.buildBoard();
        this.updateGameStatus();
        this.updateCapturedPieces();
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
        
        this.elements.gameStatusText.textContent = '';
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
        
        const promotionContainer = this.elements.promotionPieces;
        const promotionModal = this.elements.promotionModal;
        
        if (!promotionContainer || !promotionModal) {
            console.error('Promotion elements not found');
            return;
        }
        
        promotionContainer.innerHTML = '';
        promotionContainer.style.pointerEvents = 'auto';
        promotionContainer.style.zIndex = '10002';
        promotionContainer.style.position = 'relative';
        
        ['q', 'r', 'b', 'n'].forEach(piece => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'promotion-piece';
            btn.textContent = symbols[color + piece];
            btn.dataset.promotion = piece;
            btn.style.cssText = 
                'width:60px;height:60px;font-size:2.2rem;' +
                'display:flex;align-items:center;justify-content:center;' +
                'background:#1a1a1a;border:2px solid #ffd700;border-radius:8px;' +
                'cursor:pointer;pointer-events:auto;touch-action:manipulation;' +
                'position:relative;z-index:10003;' +
                'color:inherit;padding:0;margin:0;' +
                '-webkit-tap-highlight-color:transparent;' +
                'user-select:none;-webkit-user-select:none;';
            
            let promotionHandled = false;
            
            const handlePromotion = (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                if (promotionHandled) return;
                promotionHandled = true;
                
                if (!this.pendingPromotion || !this.game) return;
                
                const pending = this.pendingPromotion;
                this.pendingPromotion = null;
                this.closePromotionModal();
                
                const result = this.game.makeMove(
                    pending.from,
                    pending.to,
                    piece
                );
                
                if (!result || result.needsPromotion) {
                    console.error('Promotion failed:', {
                        from: pending.from,
                        to: pending.to,
                        promotion: piece
                    });
                    this.pendingPromotion = pending;
                    this.showPromotionModal(pending.color);
                    return;
                }
                
                this.afterMoveUpdate(result);
            };
            
            btn.addEventListener('pointerdown', handlePromotion);
            btn.addEventListener('click', handlePromotion);
            
            promotionContainer.appendChild(btn);
        });
        
        promotionModal.style.pointerEvents = 'auto';
        promotionModal.style.zIndex = '10000';
        promotionModal.style.position = 'fixed';
        promotionModal.classList.remove('hidden');
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
