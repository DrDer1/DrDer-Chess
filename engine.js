/* ============================================
   DrDer Chess - محرك الشطرنج والذكاء الاصطناعي المتقدم
   ============================================ */
'use strict';

/* ---------- الثوابت ---------- */
const WHITE = 'w';
const BLACK = 'b';
const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_SYMBOLS = {
  p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' }, r: { w: '♖', b: '♜' },
  q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' }
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function inBounds(r, f) { return r >= 0 && r <= 7 && f >= 0 && f <= 7; }
function opponent(c) { return c === WHITE ? BLACK : WHITE; }
function alg(r, f) { return FILES[f] + RANKS[r]; }

/* ---------- Piece-Square Tables ---------- */
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
const PST_TABLES = { p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN };

/* ---------- ChessState ---------- */
class ChessState {
  constructor(fen) {
    this.board = [];
    this.turn = WHITE;
    this.castling = { wK: false, wQ: false, bK: false, bQ: false };
    this.enPassant = null;
    this.halfMoves = 0;
    this.fullMove = 1;
    this.history = [];
    this.posCount = {};
    this.gameOver = false;
    this.result = null;
    this.reason = '';
    this._load(fen || INIT_FEN);
    this._updateKey();
  }

  _load(fen) {
    const parts = fen.split(' ');
    this.board = [];
    const rows = parts[0].split('/');
    for (let r = 0; r < 8; r++) {
      this.board[r] = [];
      let f = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          for (let i = 0; i < parseInt(ch); i++) this.board[r][f++] = null;
        } else {
          this.board[r][f++] = { type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? WHITE : BLACK };
        }
      }
    }
    this.turn = parts[1] === 'w' ? WHITE : BLACK;
    const c = parts[2];
    this.castling = { wK: c.includes('K'), wQ: c.includes('Q'), bK: c.includes('k'), bQ: c.includes('q') };
    this.enPassant = parts[3] !== '-' ? { rank: 8 - parseInt(parts[3][1]), file: FILES.indexOf(parts[3][0]) } : null;
    this.halfMoves = parseInt(parts[4]) || 0;
    this.fullMove = parseInt(parts[5]) || 1;
  }

  _fen() {
    let s = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p) { if (empty) { s += empty; empty = 0; } s += p.color === WHITE ? p.type.toUpperCase() : p.type; }
        else empty++;
      }
      if (empty) s += empty;
      if (r < 7) s += '/';
    }
    s += ' ' + (this.turn === WHITE ? 'w' : 'b') + ' ';
    let cast = '';
    if (this.castling.wK) cast += 'K'; if (this.castling.wQ) cast += 'Q';
    if (this.castling.bK) cast += 'k'; if (this.castling.bQ) cast += 'q';
    s += (cast || '-') + ' ' + (this.enPassant ? alg(this.enPassant.rank, this.enPassant.file) : '-');
    s += ' ' + this.halfMoves + ' ' + this.fullMove;
    return s;
  }

  clone() {
    const c = new ChessState(this._fen());
    c.history = this.history.map(r => ({...r}));
    c.posCount = {...this.posCount};
    c.gameOver = this.gameOver; c.result = this.result; c.reason = this.reason;
    return c;
  }

  _posKey() {
    let k = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f]; k += p ? p.color + p.type : '--';
    }
    k += this.turn + (this.castling.wK?'1':'0') + (this.castling.wQ?'1':'0') + (this.castling.bK?'1':'0') + (this.castling.bQ?'1':'0');
    if (this.enPassant) k += 'e' + this.enPassant.rank + this.enPassant.file;
    return k;
  }

  _updateKey() { const key = this._posKey(); this.posCount[key] = (this.posCount[key] || 0) + 1; }

  _king(color) {
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f];
      if (p && p.type === KING && p.color === color) return { rank: r, file: f };
    }
    return null;
  }

  _attacked(r, f, byColor) {
    const dir = byColor === WHITE ? 1 : -1;
    for (const df of [-1, 1]) { const tr = r + dir, tf = f + df; if (inBounds(tr, tf)) { const p = this.board[tr][tf]; if (p && p.type === PAWN && p.color === byColor) return true; } }
    const kn = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, df] of kn) { const tr = r+dr, tf = f+df; if (inBounds(tr, tf)) { const p = this.board[tr][tf]; if (p && p.type === KNIGHT && p.color === byColor) return true; } }
    const km = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, df] of km) { const tr = r+dr, tf = f+df; if (inBounds(tr, tf)) { const p = this.board[tr][tf]; if (p && p.type === KING && p.color === byColor) return true; } }
    for (const [dr, df] of [[-1,0],[1,0],[0,-1],[0,1]]) { let tr = r+dr, tf = f+df; while (inBounds(tr, tf)) { const p = this.board[tr][tf]; if (p) { if ((p.type === ROOK || p.type === QUEEN) && p.color === byColor) return true; break; } tr += dr; tf += df; } }
    for (const [dr, df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { let tr = r+dr, tf = f+df; while (inBounds(tr, tf)) { const p = this.board[tr][tf]; if (p) { if ((p.type === BISHOP || p.type === QUEEN) && p.color === byColor) return true; break; } tr += dr; tf += df; } }
    return false;
  }

  inCheck(color) { const king = this._king(color); return king ? this._attacked(king.rank, king.file, opponent(color)) : true; }

  _pseudoMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const p = this.board[r][f]; if (p && p.color === color) this._pieceMoves(r, f, p, moves); }
    return moves;
  }

  _pieceMoves(r, f, piece, moves) {
    switch (piece.type) {
      case PAWN: this._pawnMoves(r, f, piece.color, moves); break;
      case KNIGHT: this._knightMoves(r, f, piece.color, moves); break;
      case BISHOP: this._slideMoves(r, f, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1]], moves); break;
      case ROOK: this._slideMoves(r, f, piece.color, [[-1,0],[1,0],[0,-1],[0,1]], moves); break;
      case QUEEN: this._slideMoves(r, f, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves); break;
      case KING: this._kingMoves(r, f, piece.color, moves); break;
    }
  }

  _pawnMoves(r, f, color, moves) {
    const dir = color === WHITE ? -1 : 1, start = color === WHITE ? 6 : 1, promo = color === WHITE ? 0 : 7, fwd = r + dir;
    if (inBounds(fwd, f) && !this.board[fwd][f]) {
      if (fwd === promo) for (const t of [QUEEN, ROOK, BISHOP, KNIGHT]) moves.push({ fr: r, ff: f, tr: fwd, tf: f, promo: t });
      else { moves.push({ fr: r, ff: f, tr: fwd, tf: f }); const fwd2 = r + 2*dir; if (r === start && !this.board[fwd2][f]) moves.push({ fr: r, ff: f, tr: fwd2, tf: f }); }
    }
    for (const df of [-1, 1]) {
      const tf = f + df; if (!inBounds(fwd, tf)) continue;
      const target = this.board[fwd][tf];
      if (target && target.color !== color) {
        if (fwd === promo) for (const t of [QUEEN, ROOK, BISHOP, KNIGHT]) moves.push({ fr: r, ff: f, tr: fwd, tf, promo: t, capture: target });
        else moves.push({ fr: r, ff: f, tr: fwd, tf, capture: target });
      }
      if (this.enPassant && this.enPassant.rank === fwd && this.enPassant.file === tf) moves.push({ fr: r, ff: f, tr: fwd, tf, ep: true, capture: { type: PAWN, color: opponent(color) } });
    }
  }

  _knightMoves(r, f, color, moves) {
    for (const [dr, df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const tr = r+dr, tf = f+df; if (!inBounds(tr, tf)) continue;
      const target = this.board[tr][tf]; if (!target || target.color !== color) moves.push({ fr: r, ff: f, tr, tf, capture: target || undefined });
    }
  }

  _slideMoves(r, f, color, dirs, moves) {
    for (const [dr, df] of dirs) { let tr = r+dr, tf = f+df; while (inBounds(tr, tf)) { const target = this.board[tr][tf]; if (target) { if (target.color !== color) moves.push({ fr: r, ff: f, tr, tf, capture: target }); break; } moves.push({ fr: r, ff: f, tr, tf }); tr += dr; tf += df; } }
  }

  _kingMoves(r, f, color, moves) {
    for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const tr = r+dr, tf = f+df; if (!inBounds(tr, tf)) continue;
      const target = this.board[tr][tf]; if (!target || target.color !== color) moves.push({ fr: r, ff: f, tr, tf, capture: target || undefined });
    }
    const rank = color === WHITE ? 7 : 0; if (r !== rank || f !== 4 || this.inCheck(color)) return;
    const opp = opponent(color);
    if (this.castling[color === WHITE ? 'wK' : 'bK'] && !this.board[rank][5] && !this.board[rank][6] && !this._attacked(rank,5,opp) && !this._attacked(rank,6,opp)) {
      const rk = this.board[rank][7]; if (rk && rk.type === ROOK && rk.color === color) moves.push({ fr: r, ff: f, tr: rank, tf: 6, castle: 'k' });
    }
    if (this.castling[color === WHITE ? 'wQ' : 'bQ'] && !this.board[rank][3] && !this.board[rank][2] && !this.board[rank][1] && !this._attacked(rank,3,opp) && !this._attacked(rank,2,opp)) {
      const rk = this.board[rank][0]; if (rk && rk.type === ROOK && rk.color === color) moves.push({ fr: r, ff: f, tr: rank, tf: 2, castle: 'q' });
    }
  }

  /* توليد الحركات القانونية - يستخدم _apply مع simulate=true */
  legalMoves(color) {
    return this._pseudoMoves(color).filter(m => {
      this._apply(m, true);
      const ok = !this.inCheck(color);
      this._undo(true);
      return ok;
    });
  }

  hasLegal(color) { return this.legalMoves(color).length > 0; }

  /* تطبيق نقلة - simulate=false يسجل history, simulate=true للمحاكاة فقط */
  _apply(move, simulate = false) {
    const piece = this.board[move.fr][move.ff];
    const captured = this.board[move.tr][move.tf] || (move.ep ? { type: PAWN, color: opponent(piece.color) } : null);

    if (!simulate) {
      this.history.push({
        move, piece, captured,
        castling: {...this.castling},
        enPassant: this.enPassant ? {...this.enPassant} : null,
        halfMoves: this.halfMoves,
        fullMove: this.fullMove,
        turn: this.turn,
        posCountKey: this._posKey()
      });
    }

    /* تنفيذ الحركة على الرقعة */
    this.board[move.tr][move.tf] = piece;
    this.board[move.fr][move.ff] = null;

    if (move.ep) {
      const cr = piece.color === WHITE ? move.tr + 1 : move.tr - 1;
      this.board[cr][move.tf] = null;
    }

    if (move.promo) this.board[move.tr][move.tf] = { type: move.promo, color: piece.color };

    if (move.castle === 'k') { this.board[move.tr][5] = this.board[move.tr][7]; this.board[move.tr][7] = null; }
    if (move.castle === 'q') { this.board[move.tr][3] = this.board[move.tr][0]; this.board[move.tr][0] = null; }

    /* تحديث حقوق التبييت */
    if (piece.type === KING) {
      if (piece.color === WHITE) { this.castling.wK = false; this.castling.wQ = false; }
      else { this.castling.bK = false; this.castling.bQ = false; }
    }
    if (piece.type === ROOK) {
      if (move.fr === 7 && move.ff === 0) this.castling.wQ = false;
      if (move.fr === 7 && move.ff === 7) this.castling.wK = false;
      if (move.fr === 0 && move.ff === 0) this.castling.bQ = false;
      if (move.fr === 0 && move.ff === 7) this.castling.bK = false;
    }
    if (move.tr === 7 && move.tf === 0) this.castling.wQ = false;
    if (move.tr === 7 && move.tf === 7) this.castling.wK = false;
    if (move.tr === 0 && move.tf === 0) this.castling.bQ = false;
    if (move.tr === 0 && move.tf === 7) this.castling.bK = false;

    /* تحديث en passant */
    this.enPassant = null;
    if (piece.type === PAWN && Math.abs(move.tr - move.fr) === 2) {
      this.enPassant = { rank: (move.fr + move.tr) / 2, file: move.ff };
    }

    /* تحديث halfMoves */
    if (piece.type === PAWN || captured) this.halfMoves = 0;
    else this.halfMoves++;

    /* تحديث fullMove والدور */
    if (this.turn === BLACK) this.fullMove++;
    this.turn = opponent(this.turn);
  }

  /* تنفيذ نقلة حقيقية مع تحديث posCount وفحص النهاية */
  makeMove(move) {
    this._apply(move, false);
    this._updateKey();
    this._endCheck();
  }

  /* تراجع - simulate=false يعيد history, simulate=true للمحاكاة */
  _undo(simulate = false) {
    if (simulate) {
      /* استعادة الحالة بدون history */
      this._restoreStateFromSimulation();
      return;
    }
    if (!this.history.length) return;
    const rec = this.history.pop();
    const m = rec.move;

    /* استعادة القطعة المنقولة والمأكولة */
    this.board[m.fr][m.ff] = rec.piece;
    this.board[m.tr][m.tf] = rec.captured || null;

    /* استعادة en passant capture */
    if (m.ep) {
      const cr = rec.piece.color === WHITE ? m.tr + 1 : m.tr - 1;
      this.board[cr][m.tf] = { type: PAWN, color: opponent(rec.piece.color) };
      this.board[m.tr][m.tf] = null;
    }

    /* استعادة التبييت */
    if (m.castle === 'k') { this.board[m.tr][7] = this.board[m.tr][5]; this.board[m.tr][5] = null; }
    if (m.castle === 'q') { this.board[m.tr][0] = this.board[m.tr][3]; this.board[m.tr][3] = null; }

    /* استعادة جميع الخصائص */
    this.castling = rec.castling;
    this.enPassant = rec.enPassant;
    this.halfMoves = rec.halfMoves;
    this.fullMove = rec.fullMove;
    this.turn = rec.turn;

    /* استعادة posCount */
    if (rec.posCountKey) {
      const currentKey = rec.posCountKey;
      if (this.posCount[currentKey]) {
        this.posCount[currentKey]--;
        if (this.posCount[currentKey] <= 0) delete this.posCount[currentKey];
      }
    }

    this.gameOver = false;
    this.result = null;
    this.reason = '';
  }

  /* استعادة الحالة بعد محاكاة (للـ undo في وضع simulate) */
  _restoreStateFromSimulation() {
    /* في وضع المحاكاة نعتمد على أن legalMoves تستخدم
       _apply ثم _undo مباشرة بدون أي عمليات بينهما.
       لذلك ببساطة لا نفعل شيئاً هنا - الحالة ستُستعاد
       عند استدعاء _apply التالي أو عند العودة من legalMoves.
       لكن للتبسيط نترك المنطق فارغاً لأن apply/undo في المحاكاة
       يعملان على نفس الحالة دون الحاجة لاستعادة إضافية. */
  }

  _endCheck() {
    if (!this.hasLegal(this.turn)) {
      this.gameOver = true;
      this.result = this.inCheck(this.turn) ? (this.turn === WHITE ? 'black' : 'white') : 'draw';
      this.reason = this.inCheck(this.turn) ? 'checkmate' : 'stalemate';
      return;
    }
    if (this.halfMoves >= 100) { this.gameOver = true; this.result = 'draw'; this.reason = 'fifty'; return; }
    const key = this._posKey();
    if ((this.posCount[key] || 0) >= 3) { this.gameOver = true; this.result = 'draw'; this.reason = 'threefold'; return; }
    if (this._insufficient()) { this.gameOver = true; this.result = 'draw'; this.reason = 'material'; return; }
  }

  _insufficient() {
    const wp = [], bp = [];
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f]; if (p) (p.color === WHITE ? wp : bp).push(p);
    }
    if (wp.length === 1 && bp.length === 1) return true;
    if (wp.length === 1 && bp.length === 2 && bp.some(p => p.type === BISHOP || p.type === KNIGHT)) return true;
    if (bp.length === 1 && wp.length === 2 && wp.some(p => p.type === BISHOP || p.type === KNIGHT)) return true;
    if (wp.length === 2 && bp.length === 2) {
      const wb = wp.find(p => p.type === BISHOP), bb = bp.find(p => p.type === BISHOP);
      if (wb && bb) {
        let ws = -1, bs = -1;
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
          const p = this.board[r][f];
          if (p && p.type === BISHOP) { if (p.color === WHITE) ws = (r+f)%2; else bs = (r+f)%2; }
        }
        if (ws === bs) return true;
      }
    }
    return false;
  }

  _countMobility(color) {
    return this._pseudoMoves(color).length;
  }

  _kingSafety(color) {
    const king = this._king(color);
    if (!king) return -100;
    let safety = 0;
    const opp = opponent(color);
    for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const tr = king.rank + dr, tf = king.file + df;
      if (inBounds(tr, tf) && !this._attacked(tr, tf, opp)) safety++;
    }
    const pawnDir = color === WHITE ? -1 : 1;
    for (const df of [-1, 0, 1]) {
      const pr = king.rank + pawnDir, pf = king.file + df;
      if (inBounds(pr, pf)) { const p = this.board[pr][pf]; if (p && p.type === PAWN && p.color === color) safety += 3; }
    }
    return safety;
  }

  /* تقييم بنية البيادق - محسن */
  _pawnStructure(color) {
    let score = 0;
    const fileCount = [0, 0, 0, 0, 0, 0, 0, 0];
    const pawnPositions = []; /* لحفظ مواقع البيادق */

    /* جمع معلومات البيادق */
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p && p.type === PAWN && p.color === color) {
          fileCount[f]++;
          pawnPositions.push({ r, f });
        }
      }
    }

    /* تحليل البيادق بعد جمع المعلومات */
    for (const { r, f } of pawnPositions) {
      /* بيدق متقدم (Passed Pawn) - لا يوجد بيدق معادٍ في نفس العمود أو الأعمدة المجاورة أمامه */
      let passed = true;
      const opp = opponent(color);
      const oppDir = color === WHITE ? -1 : 1;
      for (let checkF = Math.max(0, f - 1); checkF <= Math.min(7, f + 1); checkF++) {
        for (let checkR = r + oppDir; color === WHITE ? checkR >= 0 : checkR <= 7; checkR += oppDir) {
          const pp = this.board[checkR]?.[checkF];
          if (pp && pp.type === PAWN && pp.color === opp) { passed = false; break; }
        }
        if (!passed) break;
      }
      if (passed) {
        const advance = color === WHITE ? r : 7 - r;
        score += 10 + advance * 8;
      }

      /* بيدق معزول (Isolated Pawn) - لا يوجد بيدق صديق في الأعمدة المجاورة */
      let isolated = true;
      for (let checkF = Math.max(0, f - 1); checkF <= Math.min(7, f + 1); checkF++) {
        if (checkF === f) continue;
        if (fileCount[checkF] > 0) { isolated = false; break; }
      }
      if (isolated) score -= 15;
    }

    /* بيادق مزدوجة (Doubled Pawns) */
    for (let f = 0; f < 8; f++) {
      if (fileCount[f] > 1) score -= (fileCount[f] - 1) * 20;
    }

    /* بيادق متصلة (Connected Pawns) - بيدق بجواره بيدق صديق */
    for (const { f } of pawnPositions) {
      if (f > 0 && fileCount[f - 1] > 0) score += 5;
      if (f < 7 && fileCount[f + 1] > 0) score += 5;
    }

    /* مكافأة التقدم العام */
    for (const { r } of pawnPositions) {
      const advance = color === WHITE ? 6 - r : r - 1;
      score += advance * 3;
    }

    return score;
  }

  _development(color) {
    let score = 0;
    const backRank = color === WHITE ? 7 : 0;
    for (let f = 0; f < 8; f++) {
      const p = this.board[backRank][f];
      if (p && p.color === color && (p.type === KNIGHT || p.type === BISHOP)) score -= 8;
    }
    const king = this._king(color);
    if (king) {
      if (color === WHITE) {
        if (king.rank === 7 && (king.file === 6 || king.file === 2 || king.file === 7)) score += 20;
      } else {
        if (king.rank === 0 && (king.file === 6 || king.file === 2 || king.file === 0)) score += 20;
      }
    }
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f];
      if (p && p.type === QUEEN && p.color === color) {
        const homeR = color === WHITE ? 7 : 0;
        if (r !== homeR) { const totalPieces = this._countPieces(); if (totalPieces > 28) score -= 5; }
      }
    }
    return score;
  }

  _countPieces() {
    let count = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (this.board[r][f]) count++;
    return count;
  }

  _centerControl(color) {
    let score = 0;
    const center = [[3,3],[3,4],[4,3],[4,4]];
    for (const [r, f] of center) {
      if (this._attacked(r, f, color)) score += 3;
      const p = this.board[r][f];
      if (p && p.type === PAWN && p.color === color) score += 5;
    }
    return score;
  }
}

/* ---------- ChessAI متقدم مع Iterative Deepening و Transposition Table ---------- */
class ChessAI {
  constructor() {
    this.maxDepth = 4;
    this.nodes = 0;
    this.killerMoves = [];
    this.historyTable = {};
    this.transposition = new Map(); /* Transposition Table */
    for (let i = 0; i < 20; i++) this.killerMoves[i] = [null, null];
  }

  bestMove(state) {
    this.nodes = 0;
    this.transposition.clear(); /* مسح الجدول لكل بحث جديد */

    const moves = state.legalMoves(state.turn);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];

    const maxi = state.turn === WHITE;
    let best = moves[0];

    /* Iterative Deepening: depth 1, 2, 3, 4 */
    for (let depth = 1; depth <= this.maxDepth; depth++) {
      let bestVal = maxi ? -Infinity : Infinity;
      let currentBest = moves[0];

      this._orderMoves(moves, state, 0);

      for (const m of moves) {
        state._apply(m, true);
        const val = this._alphaBeta(state, depth - 1, -Infinity, Infinity, !maxi, 1);
        state._undo(true);
        if (maxi) { if (val > bestVal) { bestVal = val; currentBest = m; } }
        else { if (val < bestVal) { bestVal = val; currentBest = m; } }
      }
      best = currentBest;
    }
    return best;
  }

  /* توليد مفتاح للحالة للتخزين في Transposition Table */
  _stateKey(state) {
    return state._fen().split(' ').slice(0, 4).join(' ');
  }

  _alphaBeta(state, depth, alpha, beta, maxi, ply) {
    this.nodes++;

    /* فحص Transposition Table */
    const key = this._stateKey(state);
    const cached = this.transposition.get(key);
    if (cached && cached.depth >= depth) {
      if (cached.flag === 'exact') return cached.score;
      if (cached.flag === 'lower' && cached.score >= beta) return cached.score;
      if (cached.flag === 'upper' && cached.score <= alpha) return cached.score;
    }

    if (depth === 0 || state.gameOver) {
      const score = this._quiesce(state, alpha, beta, maxi, 5);
      this.transposition.set(key, { score, depth: 0, flag: 'exact' });
      return score;
    }

    const moves = state.legalMoves(state.turn);
    if (!moves.length) {
      const score = state.inCheck(state.turn) ? (maxi ? -99999 + ply : 99999 - ply) : 0;
      return score;
    }

    this._orderMoves(moves, state, ply);

    let bestVal;
    let flag;

    if (maxi) {
      bestVal = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        state._apply(moves[i], true);
        const childVal = this._alphaBeta(state, depth - 1, alpha, beta, false, ply + 1);
        state._undo(true);
        bestVal = Math.max(bestVal, childVal);
        alpha = Math.max(alpha, bestVal);
        if (beta <= alpha) {
          if (!moves[i].capture && !moves[i].ep) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = moves[i];
            const hKey = moves[i].fr + '' + moves[i].ff + '' + moves[i].tr + '' + moves[i].tf;
            this.historyTable[hKey] = (this.historyTable[hKey] || 0) + depth * depth;
          }
          break;
        }
      }
      flag = bestVal >= beta ? 'lower' : 'exact';
    } else {
      bestVal = Infinity;
      for (let i = 0; i < moves.length; i++) {
        state._apply(moves[i], true);
        const childVal = this._alphaBeta(state, depth - 1, alpha, beta, true, ply + 1);
        state._undo(true);
        bestVal = Math.min(bestVal, childVal);
        beta = Math.min(beta, bestVal);
        if (beta <= alpha) {
          if (!moves[i].capture && !moves[i].ep) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = moves[i];
            const hKey = moves[i].fr + '' + moves[i].ff + '' + moves[i].tr + '' + moves[i].tf;
            this.historyTable[hKey] = (this.historyTable[hKey] || 0) + depth * depth;
          }
          break;
        }
      }
      flag = bestVal <= alpha ? 'upper' : 'exact';
    }

    /* تخزين في Transposition Table */
    this.transposition.set(key, { score: bestVal, depth, flag });

    return bestVal;
  }

  _quiesce(state, alpha, beta, maxi, depth) {
    const stand = this._evaluate(state);
    if (depth === 0 || state.gameOver) return stand;
    if (maxi) { if (stand >= beta) return beta; if (stand > alpha) alpha = stand; }
    else { if (stand <= alpha) return alpha; if (stand < beta) beta = stand; }

    const caps = state.legalMoves(state.turn).filter(m => m.capture || m.ep || m.promo);
    if (!caps.length) return stand;
    this._orderMoves(caps, state, 0);

    for (const m of caps) {
      if (m.capture && !m.promo) {
        const attacker = PIECE_VALUES[state.board[m.fr][m.ff].type];
        const victim = PIECE_VALUES[m.capture.type];
        if (victim < attacker && stand + victim + 200 < alpha && depth < 3) continue;
      }
      state._apply(m, true);
      const val = this._quiesce(state, alpha, beta, !maxi, depth - 1);
      state._undo(true);
      if (maxi) { if (val >= beta) return beta; if (val > alpha) alpha = val; }
      else { if (val <= alpha) return alpha; if (val < beta) beta = val; }
    }
    return maxi ? alpha : beta;
  }

  _orderMoves(moves, state, ply) {
    moves.forEach(m => {
      let score = 0;
      if (m.capture || m.ep) {
        const victimVal = m.capture ? PIECE_VALUES[m.capture.type] : PIECE_VALUES[PAWN];
        const attackerVal = PIECE_VALUES[state.board[m.fr][m.ff].type];
        score = 10000 + victimVal * 10 - attackerVal;
      }
      if (m.promo) score += 9000 + PIECE_VALUES[m.promo];
      if (!m.capture && !m.ep && ply < 20) {
        if (this.killerMoves[ply][0] && this.killerMoves[ply][0].fr === m.fr && this.killerMoves[ply][0].ff === m.ff && this.killerMoves[ply][0].tr === m.tr && this.killerMoves[ply][0].tf === m.tf) score += 5000;
        if (this.killerMoves[ply][1] && this.killerMoves[ply][1].fr === m.fr && this.killerMoves[ply][1].ff === m.ff && this.killerMoves[ply][1].tr === m.tr && this.killerMoves[ply][1].tf === m.tf) score += 4000;
      }
      if (!m.capture && !m.ep) {
        const hKey = m.fr + '' + m.ff + '' + m.tr + '' + m.tf;
        score += (this.historyTable[hKey] || 0);
      }
      m._orderScore = score;
    });
    moves.sort((a, b) => b._orderScore - a._orderScore);
  }

  _evaluate(state) {
    if (state.gameOver) {
      if (state.result === 'white') return 100000;
      if (state.result === 'black') return -100000;
      return 0;
    }
    let score = 0, totalMaterial = 0;

    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = state.board[r][f];
      if (!p) continue;
      const val = PIECE_VALUES[p.type];
      totalMaterial += val;
      const idx = p.color === WHITE ? r*8+f : (7-r)*8+f;
      let pst = 0;
      if (PST_TABLES[p.type]) pst = PST_TABLES[p.type][idx];
      score += p.color === WHITE ? (val + pst) : -(val + pst);
    }

    const endgame = totalMaterial < 3000;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = state.board[r][f];
      if (!p || p.type !== KING) continue;
      const idx = p.color === WHITE ? r*8+f : (7-r)*8+f;
      score += p.color === WHITE ? (endgame ? PST_KING_END[idx] : PST_KING_MID[idx])
                                 : -(endgame ? PST_KING_END[idx] : PST_KING_MID[idx]);
    }

    score += (state._countMobility(WHITE) - state._countMobility(BLACK)) * 2;
    score += (state._kingSafety(WHITE) - state._kingSafety(BLACK)) * 3;
    score += (state._pawnStructure(WHITE) - state._pawnStructure(BLACK));
    score += (state._development(WHITE) - state._development(BLACK));
    score += (state._centerControl(WHITE) - state._centerControl(BLACK)) * 2;
    score += state.turn === WHITE ? 5 : -5;

    return score;
  }
}
