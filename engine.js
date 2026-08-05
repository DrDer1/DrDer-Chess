/* ============================================
   DrDer Chess - محرك الشطرنج والذكاء الاصطناعي
   يدعم جميع قوانين الشطرنج الرسمية
   ============================================ */

// ---------- الثوابت ----------
const WHITE = 'w';
const BLACK = 'b';

const PIECE_NONE = 0;
const PIECE_PAWN = 1;
const PIECE_KNIGHT = 2;
const PIECE_BISHOP = 3;
const PIECE_ROOK = 4;
const PIECE_QUEEN = 5;
const PIECE_KING = 6;

// رموز القطع للنص
const PIECE_SYMBOLS = {
  [PIECE_PAWN]: { [WHITE]: '♙', [BLACK]: '♟' },
  [PIECE_KNIGHT]: { [WHITE]: '♘', [BLACK]: '♞' },
  [PIECE_BISHOP]: { [WHITE]: '♗', [BLACK]: '♝' },
  [PIECE_ROOK]: { [WHITE]: '♖', [BLACK]: '♜' },
  [PIECE_QUEEN]: { [WHITE]: '♕', [BLACK]: '♛' },
  [PIECE_KING]: { [WHITE]: '♔', [BLACK]: '♚' }
};

// أحرف PGN
const PGN_SYMBOLS = {
  [PIECE_PAWN]: '',
  [PIECE_KNIGHT]: 'N',
  [PIECE_BISHOP]: 'B',
  [PIECE_ROOK]: 'R',
  [PIECE_QUEEN]: 'Q',
  [PIECE_KING]: 'K'
};

// أسماء الملفات والأعمدة
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Piece-Square Tables للذكاء الاصطناعي (من منظور الأبيض)
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const KING_END_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

const PIECE_TABLES = {
  [PIECE_PAWN]: PAWN_TABLE,
  [PIECE_KNIGHT]: KNIGHT_TABLE,
  [PIECE_BISHOP]: BISHOP_TABLE,
  [PIECE_ROOK]: ROOK_TABLE,
  [PIECE_QUEEN]: QUEEN_TABLE,
  [PIECE_KING]: KING_MIDDLE_TABLE
};

// قيم القطع للتقييم
const PIECE_VALUES = {
  [PIECE_PAWN]: 100,
  [PIECE_KNIGHT]: 320,
  [PIECE_BISHOP]: 330,
  [PIECE_ROOK]: 500,
  [PIECE_QUEEN]: 900,
  [PIECE_KING]: 20000
};

// ---------- كلاس حالة اللعبة ----------
class ChessState {
  constructor() {
    this.reset();
  }

  // إعادة تعيين الحالة للوضع الابتدائي
  reset() {
    // تمثيل الرقعة: board[rank][file]، rank 0 = الصف 8 (أعلى)، rank 7 = الصف 1 (أسفل)
    // null تعني مربع فارغ، وإلا { type, color }
    this.board = this.createInitialBoard();
    this.turn = WHITE;
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null; // { rank, file } أو null
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.positionHistory = []; // لتتبع التكرار الثلاثي
    this.currentPositionKey = this.getPositionKey();
    this.positionCount = {};
    this.positionCount[this.currentPositionKey] = 1;
    this.gameOver = false;
    this.gameResult = null; // 'white', 'black', 'draw'
    this.gameResultReason = '';
  }

  // إنشاء الرقعة الابتدائية
  createInitialBoard() {
    const board = [];
    // الصف 8 (rank 0)
    board.push([
      { type: PIECE_ROOK, color: BLACK },
      { type: PIECE_KNIGHT, color: BLACK },
      { type: PIECE_BISHOP, color: BLACK },
      { type: PIECE_QUEEN, color: BLACK },
      { type: PIECE_KING, color: BLACK },
      { type: PIECE_BISHOP, color: BLACK },
      { type: PIECE_KNIGHT, color: BLACK },
      { type: PIECE_ROOK, color: BLACK }
    ]);
    // الصف 7 (rank 1)
    board.push([
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK },
      { type: PIECE_PAWN, color: BLACK }
    ]);
    // الصفوف الفارغة
    for (let r = 2; r < 6; r++) {
      board.push([null, null, null, null, null, null, null, null]);
    }
    // الصف 2 (rank 6)
    board.push([
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE },
      { type: PIECE_PAWN, color: WHITE }
    ]);
    // الصف 1 (rank 7)
    board.push([
      { type: PIECE_ROOK, color: WHITE },
      { type: PIECE_KNIGHT, color: WHITE },
      { type: PIECE_BISHOP, color: WHITE },
      { type: PIECE_QUEEN, color: WHITE },
      { type: PIECE_KING, color: WHITE },
      { type: PIECE_BISHOP, color: WHITE },
      { type: PIECE_KNIGHT, color: WHITE },
      { type: PIECE_ROOK, color: WHITE }
    ]);
    return board;
  }

  // نسخ عميق للحالة
  clone() {
    const cloned = new ChessState();
    cloned.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    cloned.turn = this.turn;
    cloned.castlingRights = { ...this.castlingRights };
    cloned.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    cloned.halfMoveClock = this.halfMoveClock;
    cloned.fullMoveNumber = this.fullMoveNumber;
    cloned.moveHistory = [...this.moveHistory];
    cloned.positionHistory = [...this.positionHistory];
    cloned.currentPositionKey = this.currentPositionKey;
    cloned.positionCount = { ...this.positionCount };
    cloned.gameOver = this.gameOver;
    cloned.gameResult = this.gameResult;
    cloned.gameResultReason = this.gameResultReason;
    return cloned;
  }

  // الحصول على مفتاح فريد للموقع الحالي (للتكرار الثلاثي)
  getPositionKey() {
    let key = '';
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (piece) {
          key += piece.color + piece.type + r + f + ',';
        } else {
          key += '--,';
        }
      }
    }
    key += this.turn;
    key += this.castlingRights.wK ? '1' : '0';
    key += this.castlingRights.wQ ? '1' : '0';
    key += this.castlingRights.bK ? '1' : '0';
    key += this.castlingRights.bQ ? '1' : '0';
    if (this.enPassantTarget) {
      key += 'ep' + this.enPassantTarget.rank + this.enPassantTarget.file;
    }
    return key;
  }

  // التحقق من وجود قطعة في مربع معين
  getPiece(rank, file) {
    if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
    return this.board[rank][file];
  }

  // التحقق من أن المربع داخل الرقعة
  isValidSquare(rank, file) {
    return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
  }

  // البحث عن موقع الملك للون المحدد
  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (piece && piece.type === PIECE_KING && piece.color === color) {
          return { rank: r, file: f };
        }
      }
    }
    return null;
  }

  // التحقق مما إذا كان اللون المحدد في حالة كش
  isInCheck(color) {
    const kingPos = this.findKing(color);
    if (!kingPos) return true; // الملك غير موجود (لا يجب أن يحدث)
    return this.isSquareAttacked(kingPos.rank, kingPos.file, color === WHITE ? BLACK : WHITE);
  }

  // التحقق مما إذا كان مربع معين يتعرض للهجوم من قبل اللون المهاجم
  isSquareAttacked(rank, file, attackerColor) {
    // هجوم البيادق
    const pawnDir = attackerColor === WHITE ? 1 : -1;
    const pawnAttacks = [
      { r: rank + pawnDir, f: file - 1 },
      { r: rank + pawnDir, f: file + 1 }
    ];
    for (const att of pawnAttacks) {
      if (this.isValidSquare(att.r, att.f)) {
        const piece = this.board[att.r][att.f];
        if (piece && piece.type === PIECE_PAWN && piece.color === attackerColor) {
          return true;
        }
      }
    }

    // هجوم الحصان
    const knightMoves = [
      { r: -2, f: -1 }, { r: -2, f: 1 }, { r: -1, f: -2 }, { r: -1, f: 2 },
      { r: 1, f: -2 }, { r: 1, f: 2 }, { r: 2, f: -1 }, { r: 2, f: 1 }
    ];
    for (const move of knightMoves) {
      const nr = rank + move.r;
      const nf = file + move.f;
      if (this.isValidSquare(nr, nf)) {
        const piece = this.board[nr][nf];
        if (piece && piece.type === PIECE_KNIGHT && piece.color === attackerColor) {
          return true;
        }
      }
    }

    // هجوم الملك
    const kingMoves = [
      { r: -1, f: -1 }, { r: -1, f: 0 }, { r: -1, f: 1 },
      { r: 0, f: -1 }, { r: 0, f: 1 },
      { r: 1, f: -1 }, { r: 1, f: 0 }, { r: 1, f: 1 }
    ];
    for (const move of kingMoves) {
      const nr = rank + move.r;
      const nf = file + move.f;
      if (this.isValidSquare(nr, nf)) {
        const piece = this.board[nr][nf];
        if (piece && piece.type === PIECE_KING && piece.color === attackerColor) {
          return true;
        }
      }
    }

    // هجوم الخطوط المستقيمة (الرخ والملكة)
    const straightDirs = [
      { r: -1, f: 0 }, { r: 1, f: 0 }, { r: 0, f: -1 }, { r: 0, f: 1 }
    ];
    for (const dir of straightDirs) {
      let nr = rank + dir.r;
      let nf = file + dir.f;
      while (this.isValidSquare(nr, nf)) {
        const piece = this.board[nr][nf];
        if (piece) {
          if ((piece.type === PIECE_ROOK || piece.type === PIECE_QUEEN) && piece.color === attackerColor) {
            return true;
          }
          break;
        }
        nr += dir.r;
        nf += dir.f;
      }
    }

    // هجوم الأقطار (الفيل والملكة)
    const diagDirs = [
      { r: -1, f: -1 }, { r: -1, f: 1 }, { r: 1, f: -1 }, { r: 1, f: 1 }
    ];
    for (const dir of diagDirs) {
      let nr = rank + dir.r;
      let nf = file + dir.f;
      while (this.isValidSquare(nr, nf)) {
        const piece = this.board[nr][nf];
        if (piece) {
          if ((piece.type === PIECE_BISHOP || piece.type === PIECE_QUEEN) && piece.color === attackerColor) {
            return true;
          }
          break;
        }
        nr += dir.r;
        nf += dir.f;
      }
    }

    return false;
  }

  // توليد جميع الحركات القانونية للون المحدد
  generateLegalMoves(color) {
    const pseudoMoves = this.generatePseudoLegalMoves(color);
    const legalMoves = [];

    for (const move of pseudoMoves) {
      const cloned = this.clone();
      cloned.makeMoveWithoutValidation(move);
      if (!cloned.isInCheck(color)) {
        legalMoves.push(move);
      }
    }

    return legalMoves;
  }

  // توليد الحركات شبه القانونية (بدون التحقق من الكش على الملك)
  generatePseudoLegalMoves(color) {
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (!piece || piece.color !== color) continue;

        switch (piece.type) {
          case PIECE_PAWN:
            this.generatePawnMoves(r, f, color, moves);
            break;
          case PIECE_KNIGHT:
            this.generateKnightMoves(r, f, color, moves);
            break;
          case PIECE_BISHOP:
            this.generateSlidingMoves(r, f, color, [
              { r: -1, f: -1 }, { r: -1, f: 1 }, { r: 1, f: -1 }, { r: 1, f: 1 }
            ], moves);
            break;
          case PIECE_ROOK:
            this.generateSlidingMoves(r, f, color, [
              { r: -1, f: 0 }, { r: 1, f: 0 }, { r: 0, f: -1 }, { r: 0, f: 1 }
            ], moves);
            break;
          case PIECE_QUEEN:
            this.generateSlidingMoves(r, f, color, [
              { r: -1, f: -1 }, { r: -1, f: 1 }, { r: 1, f: -1 }, { r: 1, f: 1 },
              { r: -1, f: 0 }, { r: 1, f: 0 }, { r: 0, f: -1 }, { r: 0, f: 1 }
            ], moves);
            break;
          case PIECE_KING:
            this.generateKingMoves(r, f, color, moves);
            break;
        }
      }
    }

    return moves;
  }

  // توليد حركات البيدق
  generatePawnMoves(rank, file, color, moves) {
    const direction = color === WHITE ? -1 : 1;
    const startRank = color === WHITE ? 6 : 1;
    const promotionRank = color === WHITE ? 0 : 7;

    // التقدم مربع واحد
    const oneStep = rank + direction;
    if (this.isValidSquare(oneStep, file) && !this.board[oneStep][file]) {
      if (oneStep === promotionRank) {
        this.addPromotionMoves(rank, file, oneStep, file, moves);
      } else {
        moves.push({ fromRank: rank, fromFile: file, toRank: oneStep, toFile: file });
      }
    }

    // التقدم مربعين من البداية
    if (rank === startRank) {
      const twoStep = rank + 2 * direction;
      const between = rank + direction;
      if (this.isValidSquare(twoStep, file) && !this.board[between][file] && !this.board[twoStep][file]) {
        moves.push({ fromRank: rank, fromFile: file, toRank: twoStep, toFile: file });
      }
    }

    // الأكل القطري
    const captures = [{ r: rank + direction, f: file - 1 }, { r: rank + direction, f: file + 1 }];
    for (const cap of captures) {
      if (this.isValidSquare(cap.r, cap.f)) {
        const target = this.board[cap.r][cap.f];
        if (target && target.color !== color) {
          if (cap.r === promotionRank) {
            this.addPromotionMoves(rank, file, cap.r, cap.f, moves);
          } else {
            moves.push({ fromRank: rank, fromFile: file, toRank: cap.r, toFile: cap.f, capture: target });
          }
        }
        // الأخذ بالتجاوز
        if (this.enPassantTarget && this.enPassantTarget.rank === cap.r && this.enPassantTarget.file === cap.f) {
          moves.push({
            fromRank: rank, fromFile: file, toRank: cap.r, toFile: cap.f,
            enPassant: true, capture: { type: PIECE_PAWN, color: color === WHITE ? BLACK : WHITE }
          });
        }
      }
    }
  }

  // إضافة حركات الترقية
  addPromotionMoves(fromRank, fromFile, toRank, toFile, moves) {
    const promotionPieces = [PIECE_QUEEN, PIECE_ROOK, PIECE_BISHOP, PIECE_KNIGHT];
    const targetPiece = this.board[toRank][toFile];
    for (const promoType of promotionPieces) {
      moves.push({
        fromRank, fromFile, toRank, toFile,
        promotion: promoType,
        capture: targetPiece || undefined
      });
    }
  }

  // توليد حركات الحصان
  generateKnightMoves(rank, file, color, moves) {
    const knightMoves = [
      { r: -2, f: -1 }, { r: -2, f: 1 }, { r: -1, f: -2 }, { r: -1, f: 2 },
      { r: 1, f: -2 }, { r: 1, f: 2 }, { r: 2, f: -1 }, { r: 2, f: 1 }
    ];
    for (const move of knightMoves) {
      const nr = rank + move.r;
      const nf = file + move.f;
      if (this.isValidSquare(nr, nf)) {
        const target = this.board[nr][nf];
        if (!target || target.color !== color) {
          moves.push({
            fromRank: rank, fromFile: file, toRank: nr, toFile: nf,
            capture: target || undefined
          });
        }
      }
    }
  }

  // توليد حركات القطع المنزلقة (فيل، رخ، ملكة)
  generateSlidingMoves(rank, file, color, directions, moves) {
    for (const dir of directions) {
      let nr = rank + dir.r;
      let nf = file + dir.f;
      while (this.isValidSquare(nr, nf)) {
        const target = this.board[nr][nf];
        if (target) {
          if (target.color !== color) {
            moves.push({
              fromRank: rank, fromFile: file, toRank: nr, toFile: nf,
              capture: target
            });
          }
          break;
        }
        moves.push({ fromRank: rank, fromFile: file, toRank: nr, toFile: nf });
        nr += dir.r;
        nf += dir.f;
      }
    }
  }

  // توليد حركات الملك (بما في ذلك التبييت)
  generateKingMoves(rank, file, color, moves) {
    const kingMoves = [
      { r: -1, f: -1 }, { r: -1, f: 0 }, { r: -1, f: 1 },
      { r: 0, f: -1 }, { r: 0, f: 1 },
      { r: 1, f: -1 }, { r: 1, f: 0 }, { r: 1, f: 1 }
    ];
    for (const move of kingMoves) {
      const nr = rank + move.r;
      const nf = file + move.f;
      if (this.isValidSquare(nr, nf)) {
        const target = this.board[nr][nf];
        if (!target || target.color !== color) {
          moves.push({
            fromRank: rank, fromFile: file, toRank: nr, toFile: nf,
            capture: target || undefined
          });
        }
      }
    }

    // التبييت
    const opponentColor = color === WHITE ? BLACK : WHITE;
    const kingSideRookFile = 7;
    const queenSideRookFile = 0;
    const homeRank = color === WHITE ? 7 : 0;

    if (rank === homeRank && file === 4 && !this.isInCheck(color)) {
      const kingSide = color === WHITE ? 'wK' : 'bK';
      const queenSide = color === WHITE ? 'wQ' : 'bQ';

      // تبييت جهة الملك
      if (this.castlingRights[kingSide]) {
        if (!this.board[homeRank][5] && !this.board[homeRank][6]) {
          if (!this.isSquareAttacked(homeRank, 5, opponentColor) &&
              !this.isSquareAttacked(homeRank, 6, opponentColor)) {
            const rookPiece = this.board[homeRank][kingSideRookFile];
            if (rookPiece && rookPiece.type === PIECE_ROOK && rookPiece.color === color) {
              moves.push({
                fromRank: rank, fromFile: file, toRank: homeRank, toFile: 6,
                castling: 'kingside'
              });
            }
          }
        }
      }

      // تبييت جهة الملكة
      if (this.castlingRights[queenSide]) {
        if (!this.board[homeRank][3] && !this.board[homeRank][2] && !this.board[homeRank][1]) {
          if (!this.isSquareAttacked(homeRank, 3, opponentColor) &&
              !this.isSquareAttacked(homeRank, 2, opponentColor)) {
            const rookPiece = this.board[homeRank][queenSideRookFile];
            if (rookPiece && rookPiece.type === PIECE_ROOK && rookPiece.color === color) {
              moves.push({
                fromRank: rank, fromFile: file, toRank: homeRank, toFile: 2,
                castling: 'queenside'
              });
            }
          }
        }
      }
    }
  }

  // تنفيذ نقلة بدون التحقق من الصحة (للاستخدام الداخلي)
  makeMoveWithoutValidation(move) {
    const piece = this.board[move.fromRank][move.fromFile];
    const capturedPiece = this.board[move.toRank][move.toFile];

    // تحريك القطعة
    this.board[move.toRank][move.toFile] = piece;
    this.board[move.fromRank][move.fromFile] = null;

    // معالجة الأكل بالتجاوز
    if (move.enPassant) {
      const capturedPawnRank = this.turn === WHITE ? move.toRank + 1 : move.toRank - 1;
      this.board[capturedPawnRank][move.toFile] = null;
    }

    // معالجة الترقية
    if (move.promotion) {
      this.board[move.toRank][move.toFile] = { type: move.promotion, color: piece.color };
    }

    // معالجة التبييت
    if (move.castling === 'kingside') {
      const homeRank = move.toRank;
      this.board[homeRank][5] = this.board[homeRank][7];
      this.board[homeRank][7] = null;
    } else if (move.castling === 'queenside') {
      const homeRank = move.toRank;
      this.board[homeRank][3] = this.board[homeRank][0];
      this.board[homeRank][0] = null;
    }

    // تحديث حقوق التبييت
    if (piece.type === PIECE_KING) {
      if (piece.color === WHITE) {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (piece.type === PIECE_ROOK) {
      if (piece.color === WHITE) {
        if (move.fromRank === 7 && move.fromFile === 7) this.castlingRights.wK = false;
        if (move.fromRank === 7 && move.fromFile === 0) this.castlingRights.wQ = false;
      } else {
        if (move.fromRank === 0 && move.fromFile === 7) this.castlingRights.bK = false;
        if (move.fromRank === 0 && move.fromFile === 0) this.castlingRights.bQ = false;
      }
    }
    // إذا أكل رخ في زاويته
    if (move.toRank === 7 && move.toFile === 7) this.castlingRights.wK = false;
    if (move.toRank === 7 && move.toFile === 0) this.castlingRights.wQ = false;
    if (move.toRank === 0 && move.toFile === 7) this.castlingRights.bK = false;
    if (move.toRank === 0 && move.toFile === 0) this.castlingRights.bQ = false;

    // تحديث en passant
    this.enPassantTarget = null;
    if (piece.type === PIECE_PAWN && Math.abs(move.toRank - move.fromRank) === 2) {
      const epRank = (move.fromRank + move.toRank) / 2;
      this.enPassantTarget = { rank: epRank, file: move.fromFile };
    }

    // تحدعداد النقلات النصفية
    if (piece.type === PIECE_PAWN || capturedPiece || move.enPassant) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // تبديل الدور
    if (this.turn === BLACK) {
      this.fullMoveNumber++;
    }
    this.turn = this.turn === WHITE ? BLACK : WHITE;
  }

  // تنفيذ نقلة كاملة مع التحقق من الصحة وتحديث الحالة
  makeMove(move) {
    const piece = this.board[move.fromRank][move.fromFile];
    const capturedPiece = this.board[move.toRank][move.toFile];
    const isCapture = !!(capturedPiece || move.enPassant);
    const isPawnMove = piece.type === PIECE_PAWN;

    // حفظ معلومات النقلة للسجل
    const moveRecord = {
      move: move,
      piece: { ...piece },
      captured: capturedPiece ? { ...capturedPiece } : (move.enPassant ? { type: PIECE_PAWN, color: this.turn === WHITE ? BLACK : WHITE } : null),
      castlingRights: { ...this.castlingRights },
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      isCapture: isCapture,
      isPawnMove: isPawnMove,
      isCastling: !!move.castling,
      isPromotion: !!move.promotion,
      prevPositionKey: this.currentPositionKey
    };

    // تنفيذ النقلة
    this.makeMoveWithoutValidation(move);

    // تحديث مفتاح الموقع وعداد التكرار
    this.currentPositionKey = this.getPositionKey();
    this.positionCount[this.currentPositionKey] = (this.positionCount[this.currentPositionKey] || 0) + 1;

    this.moveHistory.push(moveRecord);

    // التحقق من انتهاء اللعبة
    this.checkGameEnd();
  }

  // التراجع عن آخر نقلة
  undoMove() {
    if (this.moveHistory.length === 0) return;

    const record = this.moveHistory.pop();
    const move = record.move;

    // تقليل عداد التكرار
    this.positionCount[this.currentPositionKey]--;
    if (this.positionCount[this.currentPositionKey] <= 0) {
      delete this.positionCount[this.currentPositionKey];
    }
    this.currentPositionKey = record.prevPositionKey;

    // إعادة القطعة المنقولة
    this.board[move.fromRank][move.fromFile] = record.piece;
    this.board[move.toRank][move.toFile] = record.captured;

    // إعادة الأكل بالتجاوز
    if (move.enPassant) {
      const capturedPawnRank = record.piece.color === WHITE ? move.toRank + 1 : move.toRank - 1;
      this.board[capturedPawnRank][move.toFile] = { type: PIECE_PAWN, color: record.piece.color === WHITE ? BLACK : WHITE };
      this.board[move.toRank][move.toFile] = null;
    }

    // إعادة التبييت
    if (move.castling === 'kingside') {
      const homeRank = move.toRank;
      this.board[homeRank][7] = this.board[homeRank][5];
      this.board[homeRank][5] = null;
    } else if (move.castling === 'queenside') {
      const homeRank = move.toRank;
      this.board[homeRank][0] = this.board[homeRank][3];
      this.board[homeRank][3] = null;
    }

    // استعادة الحالة
    this.castlingRights = record.castlingRights;
    this.enPassantTarget = record.enPassantTarget;
    this.halfMoveClock = record.halfMoveClock;
    this.fullMoveNumber = record.fullMoveNumber;
    this.turn = record.piece.color;
    this.gameOver = false;
    this.gameResult = null;
    this.gameResultReason = '';
  }

  // التحقق من انتهاء اللعبة
  checkGameEnd() {
    const legalMoves = this.generateLegalMoves(this.turn);

    if (legalMoves.length === 0) {
      this.gameOver = true;
      if (this.isInCheck(this.turn)) {
        // كش مات
        const winner = this.turn === WHITE ? BLACK : WHITE;
        this.gameResult = winner === WHITE ? 'white' : 'black';
        this.gameResultReason = 'checkmate';
      } else {
        // تعادل (Stalemate)
        this.gameResult = 'draw';
        this.gameResultReason = 'stalemate';
      }
      return;
    }

    // قاعدة 50 نقلة
    if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.gameResultReason = 'fifty-move';
      return;
    }

    // التكرار الثلاثي
    if (this.positionCount[this.currentPositionKey] >= 3) {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.gameResultReason = 'threefold-repetition';
      return;
    }

    // المادة غير الكافية
    if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.gameResultReason = 'insufficient-material';
      return;
    }
  }

  // التحقق من المادة غير الكافية
  isInsufficientMaterial() {
    const pieces = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (piece) {
          pieces[piece.color].push(piece);
        }
      }
    }

    const whitePieces = pieces[WHITE];
    const blackPieces = pieces[BLACK];

    // ملك ضد ملك
    if (whitePieces.length === 1 && blackPieces.length === 1) return true;

    // ملك وفيل ضد ملك
    if (whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.some(p => p.type === PIECE_BISHOP)) return true;
    if (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.some(p => p.type === PIECE_BISHOP)) return true;

    // ملك وحصان ضد ملك
    if (whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.some(p => p.type === PIECE_KNIGHT)) return true;
    if (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.some(p => p.type === PIECE_KNIGHT)) return true;

    // ملك وفيل ضد ملك وفيل (نفس اللون)
    if (whitePieces.length === 2 && blackPieces.length === 2) {
      const wBishop = whitePieces.find(p => p.type === PIECE_BISHOP);
      const bBishop = blackPieces.find(p => p.type === PIECE_BISHOP);
      if (wBishop && bBishop) {
        // التحقق من لون المربعات (معقد، نبسط)
        return true;
      }
    }

    return false;
  }

  // تحويل إحداثيات الرقعة إلى ترميز جبري (مثل e2e4)
  moveToAlgebraic(move) {
    const fromFile = FILES[move.fromFile];
    const fromRank = RANKS[move.fromRank];
    const toFile = FILES[move.toFile];
    const toRank = RANKS[move.toRank];
    let alg = fromFile + fromRank + toFile + toRank;
    if (move.promotion) {
      alg += PGN_SYMBOLS[move.promotion].toLowerCase() || 'q';
    }
    return alg;
  }

  // تحويل النقلة إلى ترميز PGN
  moveToPGN(move) {
    const piece = this.board[move.fromRank] ? this.board[move.fromRank][move.fromFile] : null;
    if (!piece) return '';

    const pgnSymbol = PGN_SYMBOLS[piece.type];
    const toFile = FILES[move.toFile];
    const toRank = RANKS[move.toRank];
    let pgn = '';

    if (move.castling === 'kingside') return 'O-O';
    if (move.castling === 'queenside') return 'O-O-O';

    pgn += pgnSymbol;

    // تحديد مصدر النقلة إذا لزم الأمر
    if (piece.type !== PIECE_PAWN) {
      const otherPieces = [];
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = this.board[r][f];
          if (p && p.type === piece.type && p.color === piece.color && !(r === move.fromRank && f === move.fromFile)) {
            const legalMoves = this.generatePseudoLegalMoves(piece.color);
            for (const m of legalMoves) {
              if (m.toRank === move.toRank && m.toFile === move.toFile &&
                  m.fromRank === r && m.fromFile === f) {
                otherPieces.push({ rank: r, file: f });
              }
            }
          }
        }
      }
      if (otherPieces.length > 0) {
        const fromFile = FILES[move.fromFile];
        const fromRank = RANKS[move.fromRank];
        const sameFile = otherPieces.some(p => p.file === move.fromFile);
        const sameRank = otherPieces.some(p => p.rank === move.fromRank);
        if (!sameFile) {
          pgn += fromFile;
        } else if (!sameRank) {
          pgn += fromRank;
        } else {
          pgn += fromFile + fromRank;
        }
      }
    }

    if (move.capture || move.enPassant) {
      if (piece.type === PIECE_PAWN) {
        pgn += FILES[move.fromFile];
      }
      pgn += 'x';
    }

    pgn += toFile + toRank;

    if (move.promotion) {
      pgn += '=' + PGN_SYMBOLS[move.promotion];
    }

    // إضافة علامة الكش أو الكش مات (سنتحقق لاحقاً)
    const cloned = this.clone();
    cloned.makeMoveWithoutValidation(move);
    if (cloned.isInCheck(cloned.turn)) {
      const legalMoves = cloned.generateLegalMoves(cloned.turn);
      if (legalMoves.length === 0) {
        pgn += '#';
      } else {
        pgn += '+';
      }
    }

    return pgn;
  }
}

// ---------- محرك الذكاء الاصطناعي ----------
class ChessAI {
  constructor() {
    this.maxDepth = 4;
    this.nodesSearched = 0;
  }

  // البحث عن أفضل نقلة
  findBestMove(gameState) {
    this.nodesSearched = 0;
    const legalMoves = gameState.generateLegalMoves(gameState.turn);
    if (legalMoves.length === 0) return null;

    // ترتيب النقلات لتحسين التقليم
    this.orderMoves(legalMoves, gameState);

    let bestMove = legalMoves[0];
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;
    const isMaximizing = gameState.turn === WHITE;

    for (const move of legalMoves) {
      const cloned = gameState.clone();
      cloned.makeMove(move);

      let score;
      if (cloned.gameOver) {
        if (cloned.gameResult === 'white') score = 100000;
        else if (cloned.gameResult === 'black') score = -100000;
        else score = 0;
      } else {
        score = this.alphaBeta(cloned, this.maxDepth - 1, alpha, beta, !isMaximizing);
      }

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  // خوارزمية Alpha-Beta
  alphaBeta(gameState, depth, alpha, beta, isMaximizing) {
    this.nodesSearched++;

    if (depth === 0 || gameState.gameOver) {
      return this.quiescenceSearch(gameState, alpha, beta, isMaximizing, 3);
    }

    const legalMoves = gameState.generateLegalMoves(gameState.turn);
    if (legalMoves.length === 0) {
      if (gameState.isInCheck(gameState.turn)) {
        return isMaximizing ? -99999 + (this.maxDepth - depth) : 99999 - (this.maxDepth - depth);
      }
      return 0;
    }

    this.orderMoves(legalMoves, gameState);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const cloned = gameState.clone();
        cloned.makeMove(move);
        const evalScore = this.alphaBeta(cloned, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        const cloned = gameState.clone();
        cloned.makeMove(move);
        const evalScore = this.alphaBeta(cloned, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // بحث هادئ لتجنب أفق التأثير
  quiescenceSearch(gameState, alpha, beta, isMaximizing, maxDepth) {
    const standPat = this.evaluatePosition(gameState);

    if (maxDepth === 0) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    // الحصول على النقلات الآكلة فقط
    const legalMoves = gameState.generateLegalMoves(gameState.turn);
    const captureMoves = legalMoves.filter(m => m.capture || m.enPassant || m.promotion);
    this.orderMoves(captureMoves, gameState);

    if (isMaximizing) {
      for (const move of captureMoves) {
        const cloned = gameState.clone();
        cloned.makeMove(move);
        const score = this.quiescenceSearch(cloned, alpha, beta, false, maxDepth - 1);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      for (const move of captureMoves) {
        const cloned = gameState.clone();
        cloned.makeMove(move);
        const score = this.quiescenceSearch(cloned, alpha, beta, true, maxDepth - 1);
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  // تقييم الموقف
  evaluatePosition(gameState) {
    if (gameState.gameOver) {
      if (gameState.gameResult === 'white') return 100000;
      if (gameState.gameResult === 'black') return -100000;
      return 0;
    }

    let score = 0;
    let whiteMaterial = 0;
    let blackMaterial = 0;
    let endgameWeight = 0;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = gameState.board[r][f];
        if (!piece) continue;

        const pieceValue = PIECE_VALUES[piece.type];
        const tableIndex = piece.color === WHITE ? r * 8 + f : (7 - r) * 8 + f;
        let tableValue = 0;

        if (PIECE_TABLES[piece.type]) {
          tableValue = PIECE_TABLES[piece.type][tableIndex];
        }

        if (piece.color === WHITE) {
          score += pieceValue + tableValue;
          whiteMaterial += pieceValue;
        } else {
          score -= pieceValue + tableValue;
          blackMaterial += pieceValue;
        }

        if (piece.type !== PIECE_KING && piece.type !== PIECE_PAWN) {
          endgameWeight++;
        }
      }
    }

    // تعديل تقييم الملك حسب مرحلة اللعبة
    const totalMaterial = whiteMaterial + blackMaterial;
    const isEndgame = totalMaterial < 3000 || endgameWeight < 6;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = gameState.board[r][f];
        if (!piece || piece.type !== PIECE_KING) continue;

        const tableIndex = piece.color === WHITE ? r * 8 + f : (7 - r) * 8 + f;
        const midValue = KING_MIDDLE_TABLE[tableIndex];
        const endValue = KING_END_TABLE[tableIndex];

        if (isEndgame) {
          if (piece.color === WHITE) {
            score = score - midValue + endValue;
          } else {
            score = score + midValue - endValue;
          }
        }
      }
    }

    // مكافأة الدور الحالي
    if (gameState.turn === WHITE) {
      score += 10;
    } else {
      score -= 10;
    }

    return score;
  }

  // ترتيب النقلات لتحسين أداء Alpha-Beta
  orderMoves(moves, gameState) {
    moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // تفضيل الأكل
      if (a.capture || a.enPassant) {
        const victimA = a.capture ? PIECE_VALUES[a.capture.type] : PIECE_VALUES[PIECE_PAWN];
        const attackerA = gameState.board[a.fromRank][a.fromFile];
        const attackerValueA = attackerA ? PIECE_VALUES[attackerA.type] : 0;
        scoreA = 10 * victimA - attackerValueA;
      }
      if (b.capture || b.enPassant) {
        const victimB = b.capture ? PIECE_VALUES[b.capture.type] : PIECE_VALUES[PIECE_PAWN];
        const attackerB = gameState.board[b.fromRank][b.fromFile];
        const attackerValueB = attackerB ? PIECE_VALUES[attackerB.type] : 0;
        scoreB = 10 * victimB - attackerValueB;
      }

      // تفضيل الترقية
      if (a.promotion) scoreA += PIECE_VALUES[a.promotion];
      if (b.promotion) scoreB += PIECE_VALUES[b.promotion];

      // تفضيل التبييت
      if (a.castling) scoreA += 50;
      if (b.castling) scoreB += 50;

      return scoreB - scoreA; // ترتيب تنازلي
    });
  }
}
