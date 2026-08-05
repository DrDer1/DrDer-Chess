/* ============================================
   DrDer Chess - محرك الشطرنج والذكاء الاصطناعي
   يدعم جميع قوانين الشطرنج الرسمية
   ============================================ */

'use strict';

// ---------- الثوابت الأساسية ----------
const WHITE = 'w';
const BLACK = 'b';

const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';

const PIECE_TYPES = [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING];

// رموز القطع المرئية (Unicode)
const PIECE_SYMBOLS = {
  [PAWN]:   { [WHITE]: '♙', [BLACK]: '♟' },
  [KNIGHT]: { [WHITE]: '♘', [BLACK]: '♞' },
  [BISHOP]: { [WHITE]: '♗', [BLACK]: '♝' },
  [ROOK]:   { [WHITE]: '♖', [BLACK]: '♜' },
  [QUEEN]:  { [WHITE]: '♕', [BLACK]: '♛' },
  [KING]:   { [WHITE]: '♔', [BLACK]: '♚' }
};

// أسماء الملفات والصفوف للترميز الجبري
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// قيم القطع المادية
const PIECE_VALUES = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000
};

// ---------- Piece-Square Tables (منظور الأبيض، للأسود نعكس) ----------
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 27, 27, 10,  5,  5,
   0,  0,  0, 25, 25,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-25,-25, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const PST_KING_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const PST_KING_END = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

const PST_TABLES = {
  [PAWN]: PST_PAWN,
  [KNIGHT]: PST_KNIGHT,
  [BISHOP]: PST_BISHOP,
  [ROOK]: PST_ROOK,
  [QUEEN]: PST_QUEEN
};

// ---------- دوال مساعدة ----------
function algebraic(rank, file) {
  return FILES[file] + RANKS[rank];
}

function inBounds(r, f) {
  return r >= 0 && r <= 7 && f >= 0 && f <= 7;
}

function opponent(color) {
  return color === WHITE ? BLACK : WHITE;
}

// ---------- كلاس ChessState ----------
class ChessState {
  constructor(fen) {
    this.reset(fen || INIT_FEN);
  }

  // إعادة تعيين الرقعة من FEN
  reset(fen) {
    this.board = this.createEmptyBoard();
    this.turn = WHITE;
    this.castling = { wK: false, wQ: false, bK: false, bQ: false };
    this.enPassant = null; // { rank, file } أو null
    this.halfMoves = 0;
    this.fullMove = 1;
    this.history = [];
    this.posKeys = []; // لتتبع مفاتيح المواقع للتكرار الثلاثي
    this.posCount = {};
    this.gameOver = false;
    this.result = null; // 'white', 'black', 'draw'
    this.reason = '';
    this.parseFEN(fen);
    this.updatePositionKey();
  }

  createEmptyBoard() {
    const board = [];
    for (let r = 0; r < 8; r++) {
      board[r] = new Array(8).fill(null);
    }
    return board;
  }

  // تحليل FEN
  parseFEN(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          f += parseInt(ch);
        } else {
          const color = ch === ch.toUpperCase() ? WHITE : BLACK;
          const type = ch.toLowerCase();
          this.board[r][f] = { type, color };
          f++;
        }
      }
    }
    this.turn = parts[1] === 'w' ? WHITE : BLACK;
    this.castling = {
      wK: parts[2].includes('K'),
      wQ: parts[2].includes('Q'),
      bK: parts[2].includes('k'),
      bQ: parts[2].includes('q')
    };
    if (parts[3] !== '-') {
      const file = FILES.indexOf(parts[3][0]);
      const rank = 8 - parseInt(parts[3][1]);
      this.enPassant = { rank, file };
    } else {
      this.enPassant = null;
    }
    this.halfMoves = parseInt(parts[4]) || 0;
    this.fullMove = parseInt(parts[5]) || 1;
  }

  // تصدير FEN
  toFEN() {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (piece) {
          if (empty > 0) { fen += empty; empty = 0; }
          const ch = piece.type.toUpperCase();
          fen += piece.color === WHITE ? ch : ch.toLowerCase();
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    fen += ' ' + (this.turn === WHITE ? 'w' : 'b') + ' ';
    let castling = '';
    if (this.castling.wK) castling += 'K';
    if (this.castling.wQ) castling += 'Q';
    if (this.castling.bK) castling += 'k';
    if (this.castling.bQ) castling += 'q';
    fen += (castling || '-') + ' ';
    fen += this.enPassant ? algebraic(this.enPassant.rank, this.enPassant.file) : '-';
    fen += ' ' + this.halfMoves + ' ' + this.fullMove;
    return fen;
  }

  // نسخ الحالة (نسخة خفيفة)
  clone() {
    const c = new ChessState(this.toFEN());
    c.history = this.history.slice();
    c.posKeys = this.posKeys.slice();
    c.posCount = { ...this.posCount };
    c.gameOver = this.gameOver;
    c.result = this.result;
    c.reason = this.reason;
    return c;
  }

  // الحصول على قطعة في مربع
  pieceAt(r, f) {
    if (!inBounds(r, f)) return null;
    return this.board[r][f];
  }

  // البحث عن الملك
  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p && p.type === KING && p.color === color) return { rank: r, file: f };
      }
    }
    return null;
  }

  // هل المربع (r,f) مهدد من قبل اللون attacker؟
  isAttacked(r, f, attacker) {
    // البيادق
    const pawnDir = attacker === WHITE ? 1 : -1;
    const pawnTargets = [[r + pawnDir, f - 1], [r + pawnDir, f + 1]];
    for (const [tr, tf] of pawnTargets) {
      if (inBounds(tr, tf)) {
        const p = this.board[tr][tf];
        if (p && p.type === PAWN && p.color === attacker) return true;
      }
    }
    // الحصان
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, df] of knightMoves) {
      const tr = r + dr, tf = f + df;
      if (inBounds(tr, tf)) {
        const p = this.board[tr][tf];
        if (p && p.type === KNIGHT && p.color === attacker) return true;
      }
    }
    // الملك
    const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, df] of kingMoves) {
      const tr = r + dr, tf = f + df;
      if (inBounds(tr, tf)) {
        const p = this.board[tr][tf];
        if (p && p.type === KING && p.color === attacker) return true;
      }
    }
    // الخطوط المستقيمة (رخ، ملكة)
    const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, df] of straightDirs) {
      let tr = r + dr, tf = f + df;
      while (inBounds(tr, tf)) {
        const p = this.board[tr][tf];
        if (p) {
          if ((p.type === ROOK || p.type === QUEEN) && p.color === attacker) return true;
          break;
        }
        tr += dr; tf += df;
      }
    }
    // الأقطار (فيل، ملكة)
    const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, df] of diagDirs) {
      let tr = r + dr, tf = f + df;
      while (inBounds(tr, tf)) {
        const p = this.board[tr][tf];
        if (p) {
          if ((p.type === BISHOP || p.type === QUEEN) && p.color === attacker) return true;
          break;
        }
        tr += dr; tf += df;
      }
    }
    return false;
  }

  // هل اللون color في كش؟
  inCheck(color) {
    const king = this.findKing(color);
    if (!king) return true;
    return this.isAttacked(king.rank, king.file, opponent(color));
  }

  // توليد كل الحركات شبه القانونية للون
  generatePseudoMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (!piece || piece.color !== color) continue;
        this.addMovesForPiece(r, f, piece, moves);
      }
    }
    return moves;
  }

  // إضافة حركات قطعة واحدة
  addMovesForPiece(r, f, piece, moves) {
    switch (piece.type) {
      case PAWN:   this.addPawnMoves(r, f, piece.color, moves); break;
      case KNIGHT: this.addKnightMoves(r, f, piece.color, moves); break;
      case BISHOP: this.addSlidingMoves(r, f, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1]], moves); break;
      case ROOK:   this.addSlidingMoves(r, f, piece.color, [[-1,0],[1,0],[0,-1],[0,1]], moves); break;
      case QUEEN:  this.addSlidingMoves(r, f, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves); break;
      case KING:   this.addKingMoves(r, f, piece.color, moves); break;
    }
  }

  addPawnMoves(r, f, color, moves) {
    const dir = color === WHITE ? -1 : 1;
    const startRank = color === WHITE ? 6 : 1;
    const promoRank = color === WHITE ? 0 : 7;
    const fwd = r + dir;

    // تقدم بمقدار 1
    if (inBounds(fwd, f) && !this.board[fwd][f]) {
      if (fwd === promoRank) {
        for (const pt of [QUEEN, ROOK, BISHOP, KNIGHT]) {
          moves.push({ fromR: r, fromF: f, toR: fwd, toF: f, promo: pt });
        }
      } else {
        moves.push({ fromR: r, fromF: f, toR: fwd, toF: f });
      }
      // تقدم بمقدار 2 من البداية
      const fwd2 = r + 2 * dir;
      if (r === startRank && !this.board[fwd2][f]) {
        moves.push({ fromR: r, fromF: f, toR: fwd2, toF: f });
      }
    }
    // الأكل
    for (const df of [-1, 1]) {
      const tf = f + df;
      if (!inBounds(fwd, tf)) continue;
      const target = this.board[fwd][tf];
      if (target && target.color !== color) {
        if (fwd === promoRank) {
          for (const pt of [QUEEN, ROOK, BISHOP, KNIGHT]) {
            moves.push({ fromR: r, fromF: f, toR: fwd, toF: tf, promo: pt, capture: target });
          }
        } else {
          moves.push({ fromR: r, fromF: f, toR: fwd, toF: tf, capture: target });
        }
      }
      // en passant
      if (this.enPassant && this.enPassant.rank === fwd && this.enPassant.file === tf) {
        moves.push({
          fromR: r, fromF: f, toR: fwd, toF: tf,
          enPassant: true,
          capture: { type: PAWN, color: opponent(color) }
        });
      }
    }
  }

  addKnightMoves(r, f, color, moves) {
    const dirs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, df] of dirs) {
      const tr = r + dr, tf = f + df;
      if (!inBounds(tr, tf)) continue;
      const target = this.board[tr][tf];
      if (!target || target.color !== color) {
        moves.push({ fromR: r, fromF: f, toR: tr, toF: tf, capture: target || undefined });
      }
    }
  }

  addSlidingMoves(r, f, color, dirs, moves) {
    for (const [dr, df] of dirs) {
      let tr = r + dr, tf = f + df;
      while (inBounds(tr, tf)) {
        const target = this.board[tr][tf];
        if (target) {
          if (target.color !== color) {
            moves.push({ fromR: r, fromF: f, toR: tr, toF: tf, capture: target });
          }
          break;
        }
        moves.push({ fromR: r, fromF: f, toR: tr, toF: tf });
        tr += dr; tf += df;
      }
    }
  }

  addKingMoves(r, f, color, moves) {
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, df] of dirs) {
      const tr = r + dr, tf = f + df;
      if (!inBounds(tr, tf)) continue;
      const target = this.board[tr][tf];
      if (!target || target.color !== color) {
        moves.push({ fromR: r, fromF: f, toR: tr, toF: tf, capture: target || undefined });
      }
    }
    // التبييت
    const rank = color === WHITE ? 7 : 0;
    if (r !== rank || f !== 4 || this.inCheck(color)) return;
    const opp = opponent(color);
    // جهة الملك
    const ksKey = color === WHITE ? 'wK' : 'bK';
    if (this.castling[ksKey] && !this.board[rank][5] && !this.board[rank][6]) {
      if (!this.isAttacked(rank, 5, opp) && !this.isAttacked(rank, 6, opp)) {
        const rookPiece = this.board[rank][7];
        if (rookPiece && rookPiece.type === ROOK && rookPiece.color === color) {
          moves.push({ fromR: r, fromF: f, toR: rank, toF: 6, castling: 'k' });
        }
      }
    }
    // جهة الملكة
    const qsKey = color === WHITE ? 'wQ' : 'bQ';
    if (this.castling[qsKey] && !this.board[rank][3] && !this.board[rank][2] && !this.board[rank][1]) {
      if (!this.isAttacked(rank, 3, opp) && !this.isAttacked(rank, 2, opp)) {
        const rookPiece = this.board[rank][0];
        if (rookPiece && rookPiece.type === ROOK && rookPiece.color === color) {
          moves.push({ fromR: r, fromF: f, toR: rank, toF: 2, castling: 'q' });
        }
      }
    }
  }

  // توليد الحركات القانونية الكاملة
  generateLegalMoves(color) {
    const pseudo = this.generatePseudoMoves(color);
    return pseudo.filter(move => {
      this.applyMove(move);
      const legal = !this.inCheck(color);
      this.undoMove();
      return legal;
    });
  }

  // التحقق من وجود أي حركة قانونية
  hasLegalMoves(color) {
    return this.generateLegalMoves(color).length > 0;
  }

  // تطبيق نقلة (داخلي، للاختبار)
  applyMove(move) {
    const piece = this.board[move.fromR][move.fromF];
    const captured = this.board[move.toR][move.toF] || (move.enPassant ? { type: PAWN, color: opponent(piece.color) } : null);

    const record = {
      move,
      piece,
      captured,
      castling: { ...this.castling },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfMoves: this.halfMoves
    };

    // تحريك القطعة
    this.board[move.toR][move.toF] = piece;
    this.board[move.fromR][move.fromF] = null;

    // en passant capture
    if (move.enPassant) {
      const capturedR = piece.color === WHITE ? move.toR + 1 : move.toR - 1;
      this.board[capturedR][move.toF] = null;
    }

    // الترقية
    if (move.promo) {
      this.board[move.toR][move.toF] = { type: move.promo, color: piece.color };
    }

    // التبييت
    if (move.castling === 'k') {
      const rank = move.toR;
      this.board[rank][5] = this.board[rank][7];
      this.board[rank][7] = null;
    } else if (move.castling === 'q') {
      const rank = move.toR;
      this.board[rank][3] = this.board[rank][0];
      this.board[rank][0] = null;
    }

    // تحديث حقوق التبييت
    if (piece.type === KING) {
      if (piece.color === WHITE) { this.castling.wK = false; this.castling.wQ = false; }
      else { this.castling.bK = false; this.castling.bQ = false; }
    }
    if (piece.type === ROOK) {
      if (move.fromR === 7 && move.fromF === 0) this.castling.wQ = false;
      if (move.fromR === 7 && move.fromF === 7) this.castling.wK = false;
      if (move.fromR === 0 && move.fromF === 0) this.castling.bQ = false;
      if (move.fromR === 0 && move.fromF === 7) this.castling.bK = false;
    }
    // إذا أُكل رخ في زاويته
    if (move.toR === 7 && move.toF === 0) this.castling.wQ = false;
    if (move.toR === 7 && move.toF === 7) this.castling.wK = false;
    if (move.toR === 0 && move.toF === 0) this.castling.bQ = false;
    if (move.toR === 0 && move.toF === 7) this.castling.bK = false;

    // تحديث en passant
    this.enPassant = null;
    if (piece.type === PAWN && Math.abs(move.toR - move.fromR) === 2) {
      this.enPassant = { rank: (move.fromR + move.toR) / 2, file: move.fromF };
    }

    // تحديث عداد النقلات النصفية
    if (piece.type === PAWN || captured) {
      this.halfMoves = 0;
    } else {
      this.halfMoves++;
    }

    // تغيير الدور
    if (this.turn === BLACK) this.fullMove++;
    this.turn = opponent(this.turn);

    this.history.push(record);
  }

  // تنفيذ نقلة كاملة (مع التحقق من انتهاء اللعبة)
  makeMove(move) {
    this.applyMove(move);
    this.updatePositionKey();
    this.checkEndConditions();
  }

  // التراجع عن آخر نقلة
  undoMove() {
    if (this.history.length === 0) return;
    const record = this.history.pop();
    const move = record.move;

    this.gameOver = false;
    this.result = null;
    this.reason = '';

    // استعادة القطعة
    this.board[move.fromR][move.fromF] = record.piece;
    this.board[move.toR][move.toF] = record.captured || null;

    // استعادة en passant capture
    if (move.enPassant) {
      const capturedR = record.piece.color === WHITE ? move.toR + 1 : move.toR - 1;
      this.board[capturedR][move.toF] = { type: PAWN, color: opponent(record.piece.color) };
      this.board[move.toR][move.toF] = null;
    }

    // استعادة التبييت
    if (move.castling === 'k') {
      const rank = move.toR;
      this.board[rank][7] = this.board[rank][5];
      this.board[rank][5] = null;
    } else if (move.castling === 'q') {
      const rank = move.toR;
      this.board[rank][0] = this.board[rank][3];
      this.board[rank][3] = null;
    }

    // استعادة الخصائص
    this.castling = record.castling;
    this.enPassant = record.enPassant;
    this.halfMoves = record.halfMoves;
    this.turn = record.piece.color;
    if (this.turn === WHITE && this.fullMove > 1) this.fullMove--;
  }

  // تحديث مفتاح الموقع للتكرار
  updatePositionKey() {
    const key = this.positionKey();
    this.posKeys.push(key);
    this.posCount[key] = (this.posCount[key] || 0) + 1;
  }

  positionKey() {
    let k = this.toFEN().split(' ').slice(0, 4).join(' ');
    return k;
  }

  // التحقق من شروط نهاية اللعبة
  checkEndConditions() {
    const legal = this.hasLegalMoves(this.turn);
    const inCheck = this.inCheck(this.turn);

    if (!legal) {
      this.gameOver = true;
      if (inCheck) {
        this.result = this.turn === WHITE ? 'black' : 'white';
        this.reason = 'checkmate';
      } else {
        this.result = 'draw';
        this.reason = 'stalemate';
      }
      return;
    }

    // قاعدة 50 نقلة
    if (this.halfMoves >= 100) {
      this.gameOver = true;
      this.result = 'draw';
      this.reason = 'fifty-move';
      return;
    }

    // التكرار الثلاثي
    const currentKey = this.posKeys[this.posKeys.length - 1];
    if (this.posCount[currentKey] >= 3) {
      this.gameOver = true;
      this.result = 'draw';
      this.reason = 'threefold';
      return;
    }

    // المادة غير الكافية
    if (this.insufficientMaterial()) {
      this.gameOver = true;
      this.result = 'draw';
      this.reason = 'insufficient';
      return;
    }
  }

  insufficientMaterial() {
    const pieces = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p) pieces[p.color].push(p);
      }
    }
    const wp = pieces[WHITE], bp = pieces[BLACK];
    // ملك فقط
    if (wp.length === 1 && bp.length === 1) return true;
    // ملك + فيل أو حصان
    if (wp.length === 1 && bp.length === 2) {
      if (bp.some(p => p.type === BISHOP || p.type === KNIGHT)) return true;
    }
    if (bp.length === 1 && wp.length === 2) {
      if (wp.some(p => p.type === BISHOP || p.type === KNIGHT)) return true;
    }
    // ملك + فيل ضد ملك + فيل (نفس اللون)
    if (wp.length === 2 && bp.length === 2) {
      const wb = wp.find(p => p.type === BISHOP);
      const bb = bp.find(p => p.type === BISHOP);
      if (wb && bb) {
        const wbSq = this.getBishopSquareColor(WHITE);
        const bbSq = this.getBishopSquareColor(BLACK);
        if (wbSq === bbSq) return true;
      }
    }
    return false;
  }

  getBishopSquareColor(color) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p && p.type === BISHOP && p.color === color) {
          return (r + f) % 2;
        }
      }
    }
    return -1;
  }
}

// ---------- محرك الذكاء الاصطناعي ----------
class ChessAI {
  constructor() {
    this.maxDepth = 5;
    this.nodes = 0;
  }

  findBestMove(state) {
    this.nodes = 0;
    const legal = state.generateLegalMoves(state.turn);
    if (legal.length === 0) return null;
    if (legal.length === 1) return legal[0];

    const isMax = state.turn === WHITE;
    let bestMove = legal[0];
    let bestScore = isMax ? -Infinity : Infinity;

    // ترتيب الحركات
    this.orderMoves(legal, state);

    for (const move of legal) {
      state.applyMove(move);
      const score = this.alphaBeta(state, this.maxDepth - 1, -Infinity, Infinity, !isMax);
      state.undoMove();

      if (isMax) {
        if (score > bestScore) { bestScore = score; bestMove = move; }
      } else {
        if (score < bestScore) { bestScore = score; bestMove = move; }
      }
    }
    return bestMove;
  }

  alphaBeta(state, depth, alpha, beta, isMax) {
    this.nodes++;
    if (depth === 0 || state.gameOver) {
      return this.quiesce(state, alpha, beta, isMax, 4);
    }

    const moves = state.generateLegalMoves(state.turn);
    if (moves.length === 0) {
      return state.inCheck(state.turn) ? (isMax ? -99999 : 99999) : 0;
    }

    this.orderMoves(moves, state);

    if (isMax) {
      let maxEval = -Infinity;
      for (const move of moves) {
        state.applyMove(move);
        const val = this.alphaBeta(state, depth - 1, alpha, beta, false);
        state.undoMove();
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        state.applyMove(move);
        const val = this.alphaBeta(state, depth - 1, alpha, beta, true);
        state.undoMove();
        minEval = Math.min(minEval, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  quiesce(state, alpha, beta, isMax, depth) {
    const standPat = this.evaluate(state);
    if (depth === 0) return standPat;

    if (isMax) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const moves = state.generateLegalMoves(state.turn).filter(m => m.capture || m.enPassant || m.promo);
    this.orderMoves(moves, state);

    for (const move of moves) {
      state.applyMove(move);
      const val = this.quiesce(state, alpha, beta, !isMax, depth - 1);
      state.undoMove();
      if (isMax) {
        if (val >= beta) return beta;
        if (val > alpha) alpha = val;
      } else {
        if (val <= alpha) return alpha;
        if (val < beta) beta = val;
      }
    }
    return isMax ? alpha : beta;
  }

  evaluate(state) {
    if (state.gameOver) {
      if (state.result === 'white') return 100000;
      if (state.result === 'black') return -100000;
      return 0;
    }
    let score = 0;
    let totalMaterial = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = state.board[r][f];
        if (!piece) continue;
        const val = PIECE_VALUES[piece.type];
        totalMaterial += val;
        let pstIdx = piece.color === WHITE ? r * 8 + f : (7 - r) * 8 + f;
        let pstVal = 0;
        if (PST_TABLES[piece.type]) {
          pstVal = PST_TABLES[piece.type][pstIdx];
        }
        const pieceScore = val + pstVal;
        score += piece.color === WHITE ? pieceScore : -pieceScore;
      }
    }
    // استخدام جدول الملك حسب المرحلة
    const endgame = totalMaterial < 3000;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = state.board[r][f];
        if (!piece || piece.type !== KING) continue;
        let idx = piece.color === WHITE ? r * 8 + f : (7 - r) * 8 + f;
        if (endgame) {
          score += piece.color === WHITE ? PST_KING_END[idx] : -PST_KING_END[idx];
        } else {
          score += piece.color === WHITE ? PST_KING_MID[idx] : -PST_KING_MID[idx];
        }
      }
    }
    // أفضلية بسيطة للدور
    score += state.turn === WHITE ? 5 : -5;
    return score;
  }

  orderMoves(moves, state) {
    moves.sort((a, b) => {
      const scoreA = this.moveScore(a, state);
      const scoreB = this.moveScore(b, state);
      return scoreB - scoreA;
    });
  }

  moveScore(move, state) {
    let score = 0;
    if (move.capture || move.enPassant) {
      const victim = move.capture ? PIECE_VALUES[move.capture.type] : PIECE_VALUES[PAWN];
      const attacker = state.board[move.fromR][move.fromF];
      const attackerVal = attacker ? PIECE_VALUES[attacker.type] : 0;
      score = 10 * victim - attackerVal;
    }
    if (move.promo) score += PIECE_VALUES[move.promo];
    if (move.castling) score += 60;
    return score;
  }
}
