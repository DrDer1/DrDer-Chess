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
        this.pendingPromotion = null;
        this.inCheck = false;
    }

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
        this.inCheck = false;
    }

    getFen() {
        return this.chess.fen();
    }

    getBoard() {
        return this.chess.board();
    }

    getTurn() {
        return this.chess.turn();
    }

    getLegalMoves() {
        return this.chess.moves({ verbose: true });
    }

    getLegalMovesForSquare(square) {
        return this.chess.moves({ square: square, verbose: true });
    }

    isSquareSelectable(square) {
        const piece = this.chess.get(square);
        if (!piece) return false;
        if (piece.color !== this.chess.turn()) return false;
        const moves = this.getLegalMovesForSquare(square);
        return moves.length > 0;
    }

    selectSquare(square) {
        this.selectedSquare = square;
        this.legalMovesForSelected = this.getLegalMovesForSquare(square);
        return this.legalMovesForSelected;
    }

    deselectSquare() {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
    }

    isLegalMove(from, to) {
        const moves = this.getLegalMovesForSquare(from);
        return moves.some(move => move.to === to);
    }

    getMoveDetails(from, to) {
        const moves = this.getLegalMovesForSquare(from);
        return moves.find(move => move.to === to);
    }

    makeMove(from, to, promotion) {
        if (this.isGameOver) return null;

        const piece = this.chess.get(from);
        
        if (piece && piece.type === 'p') {
            const targetRank = to.charAt(1);
            const isPromotionRank = (
                (piece.color === 'w' && targetRank === '8') ||
                (piece.color === 'b' && targetRank === '1')
            );
            
            if (isPromotionRank) {
                // إذا كانت الترقية غير محددة أو غير صالحة
                const validPromotions = ['q', 'r', 'b', 'n'];
                if (!promotion || !validPromotions.includes(promotion)) {
                    this.pendingPromotion = { from, to, color: piece.color };
                    return { needsPromotion: true, from, to, color: piece.color };
                }
            }
        }

        const moveResult = this.chess.move({ from, to, promotion: promotion || 'q' });
        
        if (!moveResult) {
            return null;
        }

        this.afterMove(moveResult);
        return moveResult;
    }

    afterMove(moveResult) {
        if (moveResult.captured) {
            const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
            this.capturedPieces[capturedColor === 'w' ? 'white' : 'black'].push(moveResult.captured);
        }

        this.moveHistory.push(moveResult);
        this.lastMove = moveResult;
        this.currentTurn = this.chess.turn();
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.inCheck = this.chess.in_check();

        this.checkGameStatus();
    }

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

    isInCheck() {
        return this.chess.in_check();
    }

    undoMove() {
        const undone = this.chess.undo();
        if (undone) {
            this.moveHistory.pop();
            this.currentTurn = this.chess.turn();
            this.isGameOver = false;
            this.gameResult = null;
            this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
            this.inCheck = this.chess.in_check();
        }
        return undone;
    }

    getPgn() {
        return this.chess.pgn();
    }

    loadPgn(pgn) {
        this.chess.load_pgn(pgn);
        this.currentTurn = this.chess.turn();
        this.inCheck = this.chess.in_check();
        this.checkGameStatus();
    }

    getPiece(square) {
        return this.chess.get(square);
    }

    getCapturedPieces() {
        return this.capturedPieces;
    }

    getMoveHistory() {
        return this.moveHistory;
    }

    isGameFinished() {
        return this.isGameOver;
    }

    getGameResult() {
        return this.gameResult;
    }

    getLastMove() {
        return this.lastMove;
    }
}

window.ChessGame = ChessGame;
