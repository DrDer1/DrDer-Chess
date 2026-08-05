/* ============================================
   DrDer Chess - التطبيق الرئيسي
   ============================================ */
'use strict';

/************* إدارة الصوت *************/
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(freq, dur, vol = 0.25) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.2, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  moveSound() { this.play(700, 0.09, 0.2); }
  captureSound() { this.play(400, 0.14, 0.35); setTimeout(() => this.play(250, 0.1, 0.25), 50); }
  specialSound() { this.play(900, 0.1, 0.3); setTimeout(() => this.play(1100, 0.12, 0.3), 70); }
}

/************* التطبيق *************/
class DrDerChess {
  constructor() {
    this.state = new ChessState();
    this.ai = new ChessAI();
    this.sound = new SoundManager();

    this.mode = null;        // 'computer' | 'two-player'
    this.playerColor = null; // في وضع الكمبيوتر
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.showCoords = true;
    this.showLegal = true;
    this.saved = false;

    this.dom = {};
    this.cacheDom();
    this.loadSettings();
    this.bindEvents();
    this.registerSW();
    this.checkRestore();
    this.show('home');
  }

  /* ---------- DOM ---------- */
  cacheDom() {
    const ids = [
      'home-screen','game-screen','gameover-screen','settings-screen',
      'board','status-icon','status-text',
      'btn-comp','btn-two','btn-settings','btn-continue',
      'btn-log','btn-home','btn-save','btn-restart',
      'btn-again','btn-gohome',
      'btn-sback','toggle-sound','toggle-coords','toggle-legal','btn-reset-settings',
      'overlay-log','log-content','btn-close-log',
      'overlay-restore','btn-restore-yes','btn-restore-no',
      'overlay-promo','promo-pieces',
      'gameover-icon','gameover-title','gameover-reason'
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.dom[id] = el;
    }
  }

  /* ---------- شاشات ---------- */
  show(name) {
    ['home-screen','game-screen','gameover-screen','settings-screen'].forEach(id => {
      const el = this.dom[id];
      if (el) el.classList.remove('active');
    });
    const target = this.dom[name + '-screen'];
    if (target) target.classList.add('active');
  }

  /* ---------- أحداث ---------- */
  bindEvents() {
    this.dom['btn-comp']?.addEventListener('click', () => this.start('computer'));
    this.dom['btn-two']?.addEventListener('click', () => this.start('two-player'));
    this.dom['btn-settings']?.addEventListener('click', () => this.show('settings'));
    this.dom['btn-continue']?.addEventListener('click', () => this.restoreSaved());

    this.dom['btn-log']?.addEventListener('click', () => this.openLog());
    this.dom['btn-home']?.addEventListener('click', () => this.goHome());
    this.dom['btn-save']?.addEventListener('click', () => this.saveManual());
    this.dom['btn-restart']?.addEventListener('click', () => this.restart());

    this.dom['btn-close-log']?.addEventListener('click', () => this.closeLog());
    this.dom['overlay-log']?.addEventListener('click', (e) => { if (e.target === this.dom['overlay-log']) this.closeLog(); });

    this.dom['btn-restore-yes']?.addEventListener('click', () => this.restoreSaved());
    this.dom['btn-restore-no']?.addEventListener('click', () => this.discardSaved());

    this.dom['btn-again']?.addEventListener('click', () => this.start(this.mode));
    this.dom['btn-gohome']?.addEventListener('click', () => { this.clearAutoSave(); this.show('home'); });

    this.dom['btn-sback']?.addEventListener('click', () => this.show('home'));
    this.dom['toggle-sound']?.addEventListener('change', (e) => { this.sound.enabled = e.target.checked; this.saveSettings(); });
    this.dom['toggle-coords']?.addEventListener('change', (e) => { this.showCoords = e.target.checked; this.saveSettings(); this.renderBoard(); this.renderPieces(); });
    this.dom['toggle-legal']?.addEventListener('change', (e) => { this.showLegal = e.target.checked; this.saveSettings(); this.clearHighlights(); if (this.selected) this.showLegalMoves(); });
    this.dom['btn-reset-settings']?.addEventListener('click', () => this.resetSettings());
  }

  /* ---------- إعدادات ---------- */
  loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('drder-settings'));
      if (s) {
        this.sound.enabled = s.sound !== false;
        this.showCoords = s.coords !== false;
        this.showLegal = s.legal !== false;
      }
    } catch (e) {}
    if (this.dom['toggle-sound']) this.dom['toggle-sound'].checked = this.sound.enabled;
    if (this.dom['toggle-coords']) this.dom['toggle-coords'].checked = this.showCoords;
    if (this.dom['toggle-legal']) this.dom['toggle-legal'].checked = this.showLegal;
  }

  saveSettings() {
    try {
      localStorage.setItem('drder-settings', JSON.stringify({
        sound: this.sound.enabled,
        coords: this.showCoords,
        legal: this.showLegal
      }));
    } catch (e) {}
  }

  resetSettings() {
    this.sound.enabled = true;
    this.showCoords = true;
    this.showLegal = true;
    this.saveSettings();
    if (this.dom['toggle-sound']) this.dom['toggle-sound'].checked = true;
    if (this.dom['toggle-coords']) this.dom['toggle-coords'].checked = true;
    if (this.dom['toggle-legal']) this.dom['toggle-legal'].checked = true;
    this.renderBoard();
    this.renderPieces();
  }

  /* ---------- بدء اللعبة ---------- */
  start(mode) {
    this.sound.resume();
    this.mode = mode;
    this.state.reset();
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.saved = false;

    if (mode === 'computer') {
      this.playerColor = Math.random() < 0.5 ? WHITE : BLACK;
    } else {
      this.playerColor = null;
    }

    this.show('game');
    this.renderBoard();
    this.renderPieces();
    this.updateStatus();
    this.autoSave();

    if (mode === 'computer' && this.playerColor === BLACK) {
      setTimeout(() => this.computerMove(), 400);
    }
  }

  /* ---------- الرقعة ---------- */
  renderBoard() {
    const board = this.dom['board'];
    if (!board) return;
    board.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = document.createElement('div');
        sq.className = 'sq ' + ((r + f) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.r = r;
        sq.dataset.f = f;

        if (this.showCoords) {
          if (f === 7) {
            const rc = document.createElement('span');
            rc.className = 'coord coord-rank';
            rc.textContent = RANKS[r];
            sq.appendChild(rc);
          }
          if (r === 7) {
            const fc = document.createElement('span');
            fc.className = 'coord coord-file';
            fc.textContent = FILES[f];
            sq.appendChild(fc);
          }
        }

        sq.addEventListener('click', () => this.onClick(r, f));
        board.appendChild(sq);
      }
    }
    this.applyEffects();
  }

  renderPieces() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.piece').forEach(el => el.remove());
    const squares = board.querySelectorAll('.sq');
    squares.forEach(sq => {
      const r = parseInt(sq.dataset.r), f = parseInt(sq.dataset.f);
      const piece = this.state.board[r][f];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === WHITE ? 'white' : 'black');
        span.textContent = PIECE_SYMBOLS[piece.type][piece.color];
        sq.appendChild(span);
      }
    });
  }

  applyEffects() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.sq').forEach(sq => {
      sq.classList.remove('sel','legal','capture','last-from','last-to','check');
    });
    if (this.lastMove) {
      const fromSq = board.querySelector(`.sq[data-r="${this.lastMove.fromR}"][data-f="${this.lastMove.fromF}"]`);
      const toSq = board.querySelector(`.sq[data-r="${this.lastMove.toR}"][data-f="${this.lastMove.toF}"]`);
      if (fromSq) fromSq.classList.add('last-from');
      if (toSq) toSq.classList.add('last-to');
    }
    if (!this.state.gameOver && this.state.inCheck(this.state.turn)) {
      const king = this.state.findKing(this.state.turn);
      if (king) {
        const kingSq = board.querySelector(`.sq[data-r="${king.rank}"][data-f="${king.file}"]`);
        if (kingSq) kingSq.classList.add('check');
      }
    }
    if (this.selected && this.showLegal) this.showLegalMoves();
  }

  clearHighlights() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.sq').forEach(sq => {
      sq.classList.remove('sel','legal','capture');
    });
  }

  showLegalMoves() {
    if (!this.selected || !this.showLegal) return;
    const board = this.dom['board'];
    if (!board) return;
    for (const m of this.legalMoves) {
      const sq = board.querySelector(`.sq[data-r="${m.toR}"][data-f="${m.toF}"]`);
      if (sq) {
        sq.classList.add(m.capture || m.enPassant ? 'capture' : 'legal');
      }
    }
  }

  /* ---------- النقر ---------- */
  onClick(r, f) {
    if (this.state.gameOver) return;
    if (this.mode === 'computer' && this.state.turn !== this.playerColor) return;

    const piece = this.state.board[r][f];

    if (this.selected) {
      const move = this.legalMoves.find(m => m.toR === r && m.toF === f);
      if (move) {
        if (move.promo) {
          this.pendingPromo = move;
          this.showPromoDialog(move);
          return;
        }
        this.execute(move);
        return;
      }
      if (piece && piece.color === this.state.turn) {
        this.select(r, f);
        return;
      }
      this.deselect();
      return;
    }

    if (piece && piece.color === this.state.turn) {
      this.select(r, f);
    }
  }

  select(r, f) {
    this.clearHighlights();
    this.selected = { r, f };
    this.legalMoves = this.state.generateLegalMoves(this.state.turn).filter(m => m.fromR === r && m.fromF === f);
    const board = this.dom['board'];
    if (board) {
      const sq = board.querySelector(`.sq[data-r="${r}"][data-f="${f}"]`);
      if (sq) sq.classList.add('sel');
    }
    if (this.showLegal) this.showLegalMoves();
  }

  deselect() {
    this.selected = null;
    this.legalMoves = [];
    this.clearHighlights();
    this.applyEffects();
  }

  /* ---------- تنفيذ نقلة ---------- */
  execute(move) {
    const capture = !!(move.capture || move.enPassant);
    const special = !!(move.castling || move.promo);

    this.state.makeMove(move);
    this.lastMove = { fromR: move.fromR, fromF: move.fromF, toR: move.toR, toF: move.toF };
    this.deselect();

    if (special) this.sound.specialSound();
    else if (capture) this.sound.captureSound();
    else this.sound.moveSound();

    this.renderBoard();
    this.renderPieces();
    this.updateStatus();
    this.autoSave();

    if (this.state.gameOver) {
      setTimeout(() => this.showGameOver(), 500);
      return;
    }

    if (this.mode === 'computer' && this.state.turn !== this.playerColor) {
      setTimeout(() => this.computerMove(), 250);
    }
  }

  computerMove() {
    if (this.state.gameOver) return;
    const move = this.ai.findBestMove(this.state);
    if (move) {
      if (move.promo) move.promo = QUEEN;
      const capture = !!(move.capture || move.enPassant);
      const special = !!(move.castling || move.promo);
      this.state.makeMove(move);
      this.lastMove = { fromR: move.fromR, fromF: move.fromF, toR: move.toR, toF: move.toF };

      if (special) this.sound.specialSound();
      else if (capture) this.sound.captureSound();
      else this.sound.moveSound();

      this.renderBoard();
      this.renderPieces();
      this.updateStatus();
      this.autoSave();

      if (this.state.gameOver) {
        setTimeout(() => this.showGameOver(), 500);
      }
    }
  }

  /* ---------- ترقية ---------- */
  showPromoDialog(move) {
    const container = this.dom['promo-pieces'];
    if (!container) return;
    container.innerHTML = '';
    const color = this.state.turn;
    [QUEEN, ROOK, BISHOP, KNIGHT].forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'promo-btn ' + (color === WHITE ? 'white' : 'black');
      btn.textContent = PIECE_SYMBOLS[type][color];
      btn.addEventListener('click', () => {
        this.dom['overlay-promo'].classList.remove('active');
        move.promo = type;
        this.execute(move);
      });
      container.appendChild(btn);
    });
    this.dom['overlay-promo'].classList.add('active');
  }

  /* ---------- شريط الحالة ---------- */
  updateStatus() {
    const icon = this.dom['status-icon'];
    const text = this.dom['status-text'];
    if (!icon || !text) return;
    if (this.state.gameOver) {
      if (this.state.result === 'white') { icon.textContent = '🏆'; text.textContent = 'الأبيض فاز'; }
      else if (this.state.result === 'black') { icon.textContent = '🏆'; text.textContent = 'الأسود فاز'; }
      else { icon.textContent = '🤝'; text.textContent = 'تعادل'; }
      return;
    }
    const turn = this.state.turn === WHITE ? 'الأبيض' : 'الأسود';
    icon.textContent = this.state.turn === WHITE ? '⚪' : '⚫';
    text.textContent = this.state.inCheck(this.state.turn) ? `${turn} - كش!` : `دور ${turn}`;
  }

  /* ---------- نهاية اللعبة ---------- */
  showGameOver() {
    const result = this.state.result;
    const reason = this.state.reason;
    if (this.dom['gameover-title']) {
      this.dom['gameover-title'].textContent = result === 'white' ? 'الأبيض يفوز!' : result === 'black' ? 'الأسود يفوز!' : 'تعادل!';
    }
    if (this.dom['gameover-icon']) {
      this.dom['gameover-icon'].textContent = result === 'draw' ? '🤝' : '🏆';
    }
    const reasons = {
      checkmate: 'كش مات',
      stalemate: 'تعادل - الملك محاصر',
      'fifty-move': 'قاعدة 50 نقلة',
      threefold: 'التكرار الثلاثي',
      insufficient: 'مادة غير كافية'
    };
    if (this.dom['gameover-reason']) {
      this.dom['gameover-reason'].textContent = reasons[reason] || reason;
    }
    this.show('gameover');
    this.clearAutoSave();
  }

  /* ---------- سجل النقلات ---------- */
  openLog() {
    const content = this.dom['log-content'];
    if (!content) return;
    let txt = '';
    this.state.history.forEach((rec, i) => {
      if (i % 2 === 0) txt += `${Math.floor(i/2)+1}. `;
      txt += this.formatMove(rec) + ' ';
    });
    content.textContent = txt.trim() || 'لا توجد نقلات';
    this.dom['overlay-log'].classList.add('active');
  }

  formatMove(rec) {
    const m = rec.move;
    if (m.castling === 'k') return 'O-O';
    if (m.castling === 'q') return 'O-O-O';
    let s = '';
    if (rec.piece.type !== PAWN) s = rec.piece.type.toUpperCase();
    if (rec.captured) {
      if (rec.piece.type === PAWN) s = FILES[m.fromF];
      s += 'x';
    }
    s += algebraic(m.toR, m.toF);
    if (m.promo) s += '=' + m.promo.toUpperCase();
    return s;
  }

  closeLog() {
    this.dom['overlay-log'].classList.remove('active');
  }

  /* ---------- حفظ ---------- */
  serialize() {
    return {
      mode: this.mode,
      playerColor: this.playerColor,
      fen: this.state.toFEN(),
      history: this.state.history.map(r => ({ move: r.move, piece: r.piece, captured: r.captured })),
      lastMove: this.lastMove,
      saved: this.saved
    };
  }

  deserialize(data) {
    this.mode = data.mode;
    this.playerColor = data.playerColor;
    this.state.reset(data.fen);
    // استعادة التاريخ
    this.state.history = data.history.map(r => ({
      move: r.move, piece: r.piece, captured: r.captured,
      castling: { wK: false, wQ: false, bK: false, bQ: false },
      enPassant: null, halfMoves: 0
    }));
    this.lastMove = data.lastMove;
    this.saved = data.saved;
    this.state.updatePositionKey();
    this.state.checkEndConditions();
  }

  saveManual() {
    if (this.state.gameOver) return;
    try {
      localStorage.setItem('drder-manual', JSON.stringify(this.serialize()));
      this.saved = true;
    } catch (e) {}
  }

  autoSave() {
    if (this.state.gameOver) return;
    try {
      localStorage.setItem('drder-auto', JSON.stringify(this.serialize()));
    } catch (e) {}
  }

  clearAutoSave() {
    try { localStorage.removeItem('drder-auto'); } catch (e) {}
  }

  checkRestore() {
    const manual = localStorage.getItem('drder-manual');
    if (manual) {
      try {
        this._restoreData = JSON.parse(manual);
        const btn = this.dom['btn-continue'];
        if (btn) btn.style.display = 'flex';
      } catch (e) { localStorage.removeItem('drder-manual'); }
    }
    const auto = localStorage.getItem('drder-auto');
    if (auto && !manual) {
      try {
        const data = JSON.parse(auto);
        if (data.mode) {
          this._restoreData = data;
          this.dom['overlay-restore'].classList.add('active');
        }
      } catch (e) { this.clearAutoSave(); }
    }
  }

  restoreSaved() {
    if (!this._restoreData) return;
    const data = this._restoreData;
    this.deserialize(data);
    this.selected = null;
    this.legalMoves = [];
    this.dom['overlay-restore'].classList.remove('active');
    const btn = this.dom['btn-continue'];
    if (btn) btn.style.display = 'none';
    this._restoreData = null;
    this.show('game');
    this.renderBoard();
    this.renderPieces();
    this.updateStatus();
    if (this.mode === 'computer' && this.state.turn !== this.playerColor && !this.state.gameOver) {
      setTimeout(() => this.computerMove(), 400);
    }
  }

  discardSaved() {
    this.clearAutoSave();
    try { localStorage.removeItem('drder-manual'); } catch (e) {}
    this.dom['overlay-restore'].classList.remove('active');
    const btn = this.dom['btn-continue'];
    if (btn) btn.style.display = 'none';
    this._restoreData = null;
  }

  /* ---------- أزرار ---------- */
  goHome() {
    if (!this.state.gameOver) this.autoSave();
    this.deselect();
    this.show('home');
    this.checkRestore();
  }

  restart() {
    if (this.state.gameOver) { this.start(this.mode); return; }
    this.start(this.mode);
  }

  /* ---------- Service Worker ---------- */
  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
}

/* ---------- بدء التطبيق ---------- */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DrDerChess();
});
