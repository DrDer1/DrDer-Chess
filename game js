// ================ game.js - Game Logic ================

class ChessGame {
    constructor() {
        this.chess = new Chess();
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.isGameOver = false;
        this.gameResult = null;
        this.currentTurn = 'w';
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMove = null;
        this.boardSquares = {};
        this.pendingPromotion = null;
    }

    // Initialize new game
    newGame() {
        this.chess = new Chess();
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.isGameOver = false;
        this.gameResult = null;
        this.currentTurn = 'w';
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMove = null;
        this.pendingPromotion = null;
    }

    // Get current FEN
    getFen() {
        return this.chess.fen();
    }

    // Get current board position
    getBoard() {
        return this.chess.board();
    }

    // Get current turn
    getTurn() {
        return this.chess.turn();
    }

    // Get all legal moves
    getLegalMoves() {
        return this.chess.moves({ verbose: true });
    }

    // Get legal moves for a specific square
    getLegalMovesForSquare(square) {
        return this.chess.moves({ square: square, verbose: true });
    }

    // Check if a square has legal moves
    isSquareSelectable(square) {
        const piece = this.chess.get(square);
        if (!piece) return false;
        if (piece.color !== this.chess.turn()) return false;
        const moves = this.getLegalMovesForSquare(square);
        return moves.length > 0;
    }

    // Select a square
    selectSquare(square) {
        this.selectedSquare = square;
        this.legalMovesForSelected = this.getLegalMovesForSquare(square);
        return this.legalMovesForSelected;
    }

    // Deselect square
    deselectSquare() {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
    }

    // Check if a move is legal
    isLegalMove(from, to) {
        const moves = this.getLegalMovesForSquare(from);
        return moves.some(move => move.to === to);
    }

    // Get move details
    getMoveDetails(from, to) {
        const moves = this.getLegalMovesForSquare(from);
        return moves.find(move => move.to === to);
    }

    // Make a move
    makeMove(from, to, promotion = 'q') {
        if (this.isGameOver) return null;

        // Check if promotion is needed
        const piece = this.chess.get(from);
        if (piece && piece.type === 'p') {
            const targetRank = to.charAt(1);
            if ((piece.color === 'w' && targetRank === '8') || 
                (piece.color === 'b' && targetRank === '1')) {
                if (!promotion) {
                    this.pendingPromotion = { from, to };
                    return { needsPromotion: true, from, to };
                }
            }
        }

        const moveResult = this.chess.move({ from, to, promotion });
        
        if (!moveResult) return null;

        // Track captured pieces
        if (moveResult.captured) {
            const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
            this.capturedPieces[capturedColor === 'w' ? 'white' : 'black'].push(moveResult.captured);
        }

        // Track move history
        this.moveHistory.push(moveResult);

        // Track last move
        this.lastMove = moveResult;

        // Update current turn
        this.currentTurn = this.chess.turn();

        // Check game status
        this.checkGameStatus();

        return moveResult;
    }

    // Check game status
    checkGameStatus() {
        if (this.chess.in_checkmate()) {
            this.isGameOver = true;
            const winner = this.chess.turn() === 'w' ? 'b' : 'w';
            this.gameResult = {
                type: 'checkmate',
                winner: winner,
                message: winner === 'w' ? 'الأبيض فاز بالمباراة' : 'الأسود فاز بالمباراة'
            };
        } else if (this.chess.in_stalemate()) {
            this.isGameOver = true;
            this.gameResult = {
                type: 'stalemate',
                winner: null,
                message: 'تعادل بالجمود'
            };
        } else if (this.chess.in_threefold_repetition()) {
            this.isGameOver = true;
            this.gameResult = {
                type: 'threefold',
                winner: null,
                message: 'تعادل بالتكرار الثلاثي'
            };
        } else if (this.chess.insufficient_material()) {
            this.isGameOver = true;
            this.gameResult = {
                type: 'insufficient',
                winner: null,
                message: 'تعادل لعدم كفاية القطع'
            };
        } else if (this.chess.in_draw()) {
            this.isGameOver = true;
            this.gameResult = {
                type: 'draw',
                winner: null,
                message: 'تعادل'
            };
        }
    }

    // Check if in check
    isInCheck() {
        return this.chess.in_check();
    }

    // Undo last move
    undoMove() {
        const undone = this.chess.undo();
        if (undone) {
            this.moveHistory.pop();
            this.currentTurn = this.chess.turn();
            this.isGameOver = false;
            this.gameResult = null;
            this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
        }
        return undone;
    }

    // Get PGN
    getPgn() {
        return this.chess.pgn();
    }

    // Load from PGN
    loadPgn(pgn) {
        this.chess.load_pgn(pgn);
        this.currentTurn = this.chess.turn();
        this.checkGameStatus();
    }

    // Get piece at square
    getPiece(square) {
        return this.chess.get(square);
    }

    // Get all captured pieces
    getCapturedPieces() {
        return this.capturedPieces;
    }

    // Get move history
    getMoveHistory() {
        return this.moveHistory;
    }

    // Check if game over
    isGameFinished() {
        return this.isGameOver;
    }

    // Get game result
    getGameResult() {
        return this.gameResult;
    }

    // Get last move
    getLastMove() {
        return this.lastMove;
    }
}

// Export for use
window.ChessGame = ChessGame;
