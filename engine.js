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

/* ---------- Piece-Square Tables (محسنة) ---------- */
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

  legalMoves(color) { return this._pseudoMoves(color).filter(m => { this._apply(m); const ok = !this.inCheck(color); this._undo(); return ok; }); }
  hasLegal(color) { return this.legalMoves(color).length > 0; }

  _apply(move) {
    const piece = this.board[move.fr][move.ff], captured = this.board[move.tr][move.tf] || (move.ep ? { type: PAWN, color: opponent(piece.color) } : null);
    this.history.push({ move, piece, captured, castling: {...this.castling}, enPassant: this.enPassant ? {...this.enPassant} : null, halfMoves: this.halfMoves });
    this.board[move.tr][move.tf] = piece; this.board[move.fr][move.ff] = null;
    if (move.ep) { const cr = piece.color === WHITE ? move.tr+1 : move.tr-1; this.board[cr][move.tf] = null; }
    if (move.promo) this.board[move.tr][move.tf] = { type: move.promo, color: piece.color };
    if (move.castle === 'k') { this.board[move.tr][5] = this.board[move.tr][7]; this.board[move.tr][7] = null; }
    if (move.castle === 'q') { this.board[move.tr][3] = this.board[move.tr][0]; this.board[move.tr][0] = null; }
    if (piece.type === KING) { if (piece.color === WHITE) { this.castling.wK = false; this.castling.wQ = false; } else { this.castling.bK = false; this.castling.bQ = false; } }
    if (piece.type === ROOK) { if (move.fr===7&&move.ff===0) this.castling.wQ=false; if (move.fr===7&&move.ff===7) this.castling.wK=false; if (move.fr===0&&move.ff===0) this.castling.bQ=false; if (move.fr===0&&move.ff===7) this.castling.bK=false; }
    if (move.tr===7&&move.tf===0) this.castling.wQ=false; if (move.tr===7&&move.tf===7) this.castling.wK=false;
    if (move.tr===0&&move.tf===0) this.castling.bQ=false; if (move.tr===0&&move.tf===7) this.castling.bK=false;
    this.enPassant = null;
    if (piece.type === PAWN && Math.abs(move.tr-move.fr)===2) this.enPassant = { rank: (move.fr+move.tr)/2, file: move.ff };
    if (piece.type === PAWN || captured) this.halfMoves = 0; else this.halfMoves++;
    if (this.turn === BLACK) this.fullMove++;
    this.turn = opponent(this.turn);
  }

  makeMove(move) { this._apply(move); this._updateKey(); this._endCheck(); }

  _undo() {
    if (!this.history.length) return;
    const rec = this.history.pop(), m = rec.move;
    this.board[m.fr][m.ff] = rec.piece; this.board[m.tr][m.tf] = rec.captured || null;
    if (m.ep) { const cr = rec.piece.color===WHITE?m.tr+1:m.tr-1; this.board[cr][m.tf] = { type: PAWN, color: opponent(rec.piece.color) }; this.board[m.tr][m.tf] = null; }
    if (m.castle==='k') { this.board[m.tr][7]=this.board[m.tr][5]; this.board[m.tr][5]=null; }
    if (m.castle==='q') { this.board[m.tr][0]=this.board[m.tr][3]; this.board[m.tr][3]=null; }
    this.castling=rec.castling; this.enPassant=rec.enPassant; this.halfMoves=rec.halfMoves;
    this.turn=rec.piece.color; if (this.turn===WHITE&&this.fullMove>1) this.fullMove--;
    this.gameOver=false; this.result=null; this.reason='';
  }

  _endCheck() {
    if (!this.hasLegal(this.turn)) { this.gameOver=true; this.result=this.inCheck(this.turn)?(this.turn===WHITE?'black':'white'):'draw'; this.reason=this.inCheck(this.turn)?'checkmate':'stalemate'; return; }
    if (this.halfMoves>=100) { this.gameOver=true; this.result='draw'; this.reason='fifty'; return; }
    const key=this._posKey(); if ((this.posCount[key]||0)>=3) { this.gameOver=true; this.result='draw'; this.reason='threefold'; return; }
    if (this._insufficient()) { this.gameOver=true; this.result='draw'; this.reason='material'; return; }
  }

  _insufficient() {
    const wp=[], bp=[];
    for (let r=0;r<8;r++) for (let f=0;f<8;f++) { const p=this.board[r][f]; if(p) (p.color===WHITE?wp:bp).push(p); }
    if (wp.length===1&&bp.length===1) return true;
    if (wp.length===1&&bp.length===2&&bp.some(p=>p.type===BISHOP||p.type===KNIGHT)) return true;
    if (bp.length===1&&wp.length===2&&wp.some(p=>p.type===BISHOP||p.type===KNIGHT)) return true;
    if (wp.length===2&&bp.length===2) { const wb=wp.find(p=>p.type===BISHOP), bb=bp.find(p=>p.type===BISHOP); if(wb&&bb) { let ws=-1,bs=-1; for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=this.board[r][f]; if(p&&p.type===BISHOP){if(p.color===WHITE)ws=(r+f)%2;else bs=(r+f)%2;}} if(ws===bs) return true; } }
    return false;
  }

  /* دالة مساعدة لتقييم mobility للون معين */
  _countMobility(color) {
    return this._pseudoMoves(color).length;
  }

  /* دالة مساعدة لتقييم أمان الملك */
  _kingSafety(color) {
    const king = this._king(color);
    if (!king) return -100;
    let safety = 0;
    const opp = opponent(color);
    /* عدد المربعات الآمنة حول الملك */
    for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const tr = king.rank + dr, tf = king.file + df;
      if (inBounds(tr, tf) && !this._attacked(tr, tf, opp)) safety++;
    }
    /* حماية البيادق أمام الملك */
    const pawnDir = color === WHITE ? -1 : 1;
    for (const df of [-1, 0, 1]) {
      const pr = king.rank + pawnDir, pf = king.file + df;
      if (inBounds(pr, pf)) { const p = this.board[pr][pf]; if (p && p.type === PAWN && p.color === color) safety += 3; }
    }
    return safety;
  }

  /* تقييم بنية البيادق للون */
  _pawnStructure(color) {
    let score = 0;
    const files = [0,0,0,0,0,0,0,0]; /* عدد البيادق في كل عمود */
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f];
      if (p && p.type === PAWN && p.color === color) {
        files[f]++;
        /* بيدق متقدم */
        const advance = color === WHITE ? 6 - r : r - 1;
        score += advance * 5;
        /* بيدق معزول */
        let isolated = true;
        if (f > 0 && files[f-1] > 0) isolated = false;
        if (f < 7) {
          for (let rr = 0; rr < 8; rr++) { const pp = this.board[rr][f+1]; if (pp && pp.type === PAWN && pp.color === color) { isolated = false; break; } }
        }
        if (isolated) score -= 15;
      }
    }
    /* بيادق مزدوجة */
    for (let f = 0; f < 8; f++) if (files[f] > 1) score -= (files[f] - 1) * 20;
    return score;
  }

  /* تقييم التطوير في الافتتاحية */
  _development(color) {
    let score = 0;
    const backRank = color === WHITE ? 7 : 0;
    /* مكافأة تطوير الأحصنة والفيلة */
    for (let f = 0; f < 8; f++) {
      const p = this.board[backRank][f];
      if (p && p.color === color && (p.type === KNIGHT || p.type === BISHOP)) {
        score -= 8; /* عقوبة لبقاء القطع في الصف الخلفي */
      }
    }
    /* مكافأة التبييت */
    const king = this._king(color);
    if (king) {
      if (color === WHITE) {
        if (king.rank === 7 && (king.file === 6 || king.file === 2 || king.file === 7)) score += 20;
      } else {
        if (king.rank === 0 && (king.file === 6 || king.file === 2 || king.file === 0)) score += 20;
      }
    }
    /* عقوبة تحريك الملكة مبكراً */
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = this.board[r][f];
      if (p && p.type === QUEEN && p.color === color) {
        const homeR = color === WHITE ? 7 : 0;
        if (r !== homeR) {
          const totalPieces = this._countPieces();
          if (totalPieces > 28) score -= 5; /* عقوبة في الافتتاحية فقط */
        }
      }
    }
    return score;
  }

  _countPieces() {
    let count = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (this.board[r][f]) count++;
    return count;
  }

  /* تقييم السيطرة على الوسط */
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

/* ---------- ChessAI متقدم ---------- */
class ChessAI {
  constructor() {
    this.maxDepth = 5;
    this.nodes = 0;
    this.killerMoves = []; /* قاتل الحركات: killerMoves[depth][slot] */
    this.historyTable = {}; /* historyTable[fromR+fromF+toR+toF+pieceType] */
    for (let i = 0; i < 20; i++) this.killerMoves[i] = [null, null];
  }

  bestMove(state) {
    this.nodes = 0;
    const moves = state.legalMoves(state.turn);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];

    const maxi = state.turn === WHITE;
    let best = moves[0];
    let bestVal = maxi ? -Infinity : Infinity;

    this._orderMoves(moves, state, 0);

    for (const m of moves) {
      state._apply(m);
      const val = this._alphaBeta(state, this.maxDepth - 1, -Infinity, Infinity, !maxi, 1);
      state._undo();
      if (maxi) { if (val > bestVal) { bestVal = val; best = m; } }
      else { if (val < bestVal) { bestVal = val; best = m; } }
    }
    return best;
  }

  _alphaBeta(state, depth, alpha, beta, maxi, ply) {
    this.nodes++;
    if (depth === 0 || state.gameOver) return this._quiesce(state, alpha, beta, maxi, 5);

    const moves = state.legalMoves(state.turn);
    if (!moves.length) return state.inCheck(state.turn) ? (maxi ? -99999 + ply : 99999 - ply) : 0;

    this._orderMoves(moves, state, ply);

    if (maxi) {
      let val = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        state._apply(moves[i]);
        const childVal = this._alphaBeta(state, depth - 1, alpha, beta, false, ply + 1);
        state._undo();
        val = Math.max(val, childVal);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) {
          /* تسجيل Killer Move */
          if (!moves[i].capture && !moves[i].ep) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = moves[i];
            /* تحديث history heuristic */
            const key = moves[i].fr + '' + moves[i].ff + '' + moves[i].tr + '' + moves[i].tf;
            this.historyTable[key] = (this.historyTable[key] || 0) + depth * depth;
          }
          break;
        }
      }
      return val;
    } else {
      let val = Infinity;
      for (let i = 0; i < moves.length; i++) {
        state._apply(moves[i]);
        const childVal = this._alphaBeta(state, depth - 1, alpha, beta, true, ply + 1);
        state._undo();
        val = Math.min(val, childVal);
        beta = Math.min(beta, val);
        if (beta <= alpha) {
          if (!moves[i].capture && !moves[i].ep) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = moves[i];
            const key = moves[i].fr + '' + moves[i].ff + '' + moves[i].tr + '' + moves[i].tf;
            this.historyTable[key] = (this.historyTable[key] || 0) + depth * depth;
          }
          break;
        }
      }
      return val;
    }
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
      /* SEE pruning بسيط: تخطي الأكل غير المربح */
      if (m.capture && !m.promo) {
        const attacker = PIECE_VALUES[state.board[m.fr][m.ff].type];
        const victim = PIECE_VALUES[m.capture.type];
        if (victim < attacker && stand + victim + 200 < alpha && depth < 3) continue;
      }

      state._apply(m);
      const val = this._quiesce(state, alpha, beta, !maxi, depth - 1);
      state._undo();
      if (maxi) { if (val >= beta) return beta; if (val > alpha) alpha = val; }
      else { if (val <= alpha) return alpha; if (val < beta) beta = val; }
    }
    return maxi ? alpha : beta;
  }

  _orderMoves(moves, state, ply) {
    moves.forEach(m => {
      let score = 0;
      /* الأكل: MVV-LVA */
      if (m.capture || m.ep) {
        const victimVal = m.capture ? PIECE_VALUES[m.capture.type] : PIECE_VALUES[PAWN];
        const attackerVal = PIECE_VALUES[state.board[m.fr][m.ff].type];
        score = 10000 + victimVal * 10 - attackerVal;
      }
      /* الترقية */
      if (m.promo) score += 9000 + PIECE_VALUES[m.promo];
      /* Killer Moves */
      if (!m.capture && !m.ep && ply < 20) {
        if (this.killerMoves[ply][0] && this.killerMoves[ply][0].fr === m.fr && this.killerMoves[ply][0].ff === m.ff && this.killerMoves[ply][0].tr === m.tr && this.killerMoves[ply][0].tf === m.tf) score += 5000;
        if (this.killerMoves[ply][1] && this.killerMoves[ply][1].fr === m.fr && this.killerMoves[ply][1].ff === m.ff && this.killerMoves[ply][1].tr === m.tr && this.killerMoves[ply][1].tf === m.tf) score += 4000;
      }
      /* History Heuristic */
      if (!m.capture && !m.ep) {
        const key = m.fr + '' + m.ff + '' + m.tr + '' + m.tf;
        score += (this.historyTable[key] || 0);
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

    /* تقييم القطع وجداول المواقع */
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

    /* جداول الملك حسب المرحلة */
    const endgame = totalMaterial < 3000;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = state.board[r][f];
      if (!p || p.type !== KING) continue;
      const idx = p.color === WHITE ? r*8+f : (7-r)*8+f;
      score += p.color === WHITE ? (endgame ? PST_KING_END[idx] : PST_KING_MID[idx])
                                 : -(endgame ? PST_KING_END[idx] : PST_KING_MID[idx]);
    }

    /* Mobility */
    score += (state._countMobility(WHITE) - state._countMobility(BLACK)) * 2;

    /* King Safety */
    score += (state._kingSafety(WHITE) - state._kingSafety(BLACK)) * 3;

    /* Pawn Structure */
    score += (state._pawnStructure(WHITE) - state._pawnStructure(BLACK));

    /* Development */
    score += (state._development(WHITE) - state._development(BLACK));

    /* Center Control */
    score += (state._centerControl(WHITE) - state._centerControl(BLACK)) * 2;

    /* أفضلية طفيفة للدور */
    score += state.turn === WHITE ? 5 : -5;

    return score;
  }
}
