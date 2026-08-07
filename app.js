/* ============================================
   DrDer Chess - التطبيق الرئيسي
   ============================================ */
'use strict';

/************* إدارة الصوت *************/
class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this._pendingUnlock = true;
    this._tryInit();
    /* تفعيل الصوت عند أول تفاعل من المستخدم */
    this._boundUnlock = this._unlock.bind(this);
    document.body.addEventListener('click', this._boundUnlock, { once: true });
    document.body.addEventListener('touchstart', this._boundUnlock, { once: true });
  }

  _tryInit() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') {
        this._pendingUnlock = true;
      } else {
        this._pendingUnlock = false;
      }
    } catch (e) {
      this.ctx = null;
      this.enabled = false;
      this._pendingUnlock = false;
    }
  }

  _unlock() {
    if (!this.ctx || !this._pendingUnlock) return;
    this._pendingUnlock = false;
    this.ctx.resume().then(() => {
      /* تشغيل صوت صامت لتفعيل السياق */
      if (this.ctx) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(0);
        osc.stop(this.ctx.currentTime + 0.001);
      }
    }).catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _play(freq, dur, vol) {
    if (!this.enabled || !this.ctx || this._pendingUnlock) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.15, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  moveSound() { this._play(700, 0.08, 0.2); }
  captureSound() { this._play(400, 0.12, 0.35); setTimeout(() => this._play(250, 0.09, 0.25), 45); }
  specialSound() { this._play(900, 0.09, 0.3); setTimeout(() => this._play(1100, 0.1, 0.3), 60); }
}

/************* التطبيق *************/
class DrDerChess {
  constructor() {
    /* Splash Screen */
    this._showSplash();

    this.state = new ChessState();
    this.ai = new ChessAI();
    this.sound = new SoundManager();

    this.mode = null;
    this.playerColor = null;
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.showCoords = true;
    this.showLegal = true;
    this.flipBoard = false;
    this.saved = false;
    this.pendingPromo = null;
    this.animating = false;

    this.dom = {};
    this._cacheDom();
    this._loadSettings();
    this._bindEvents();
    this._registerSW();
    this._checkRestore();
    this._show('home');

    /* إخفاء Splash Screen بعد التحميل */
    setTimeout(() => this._hideSplash(), 600);
  }

  /* ---------- Splash Screen ---------- */
  _showSplash() {
    /* إنشاء Splash Screen مؤقت */
    if (document.getElementById('drder-splash')) return;
    const splash = document.createElement('div');
    splash.id = 'drder-splash';
    splash.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #1a1a1a; display: flex;
      flex-direction: column; align-items: center;
      justify-content: center; gap: 16px;
      transition: opacity 0.4s ease;
    `;
    const img = document.createElement('img');
    img.src = '192.png';
    img.alt = 'DrDer Chess';
    img.style.cssText = 'width:80px;height:80px;border-radius:18px;border:2px solid #c8a45c;';
    const title = document.createElement('div');
    title.textContent = 'DrDer Chess';
    title.style.cssText = 'color:#c8a45c;font-size:1.5rem;font-weight:700;font-family:sans-serif;';
    splash.appendChild(img);
    splash.appendChild(title);
    document.body.appendChild(splash);
  }

  _hideSplash() {
    const splash = document.getElementById('drder-splash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 400);
  }

  /* ---------- DOM ---------- */
  _cacheDom() {
    const ids = [
      'home-screen','game-screen','gameover-screen','settings-screen',
      'board','status-icon','status-text',
      'btn-comp','btn-two','btn-settings','btn-continue',
      'btn-home','btn-save','btn-restart',
      'btn-again','btn-gohome',
      'btn-sback','toggle-sound','toggle-coords','toggle-legal','toggle-flip','btn-reset-settings',
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
  _show(name) {
    ['home-screen','game-screen','gameover-screen','settings-screen'].forEach(id => {
      const el = this.dom[id];
      if (el) el.classList.remove('active');
    });
    const target = this.dom[name + '-screen'];
    if (target) target.classList.add('active');
  }

  /* ---------- أحداث ---------- */
  _bindEvents() {
    this.dom['btn-comp']?.addEventListener('click', () => this._start('computer'));
    this.dom['btn-two']?.addEventListener('click', () => this._start('two-player'));
    this.dom['btn-settings']?.addEventListener('click', () => this._show('settings'));
    this.dom['btn-continue']?.addEventListener('click', () => this._restoreSaved());

    this.dom['btn-home']?.addEventListener('click', () => this._goHome());
    this.dom['btn-save']?.addEventListener('click', () => this._saveManual());
    this.dom['btn-restart']?.addEventListener('click', () => this._restart());

    this.dom['btn-restore-yes']?.addEventListener('click', () => this._restoreSaved());
    this.dom['btn-restore-no']?.addEventListener('click', () => this._discardSaved());

    this.dom['btn-again']?.addEventListener('click', () => this._start(this.mode));
    this.dom['btn-gohome']?.addEventListener('click', () => { this._clearAutoSave(); this._show('home'); });

    this.dom['btn-sback']?.addEventListener('click', () => this._show('home'));
    this.dom['toggle-sound']?.addEventListener('change', e => { this.sound.enabled = e.target.checked; this._saveSettings(); });
    this.dom['toggle-coords']?.addEventListener('change', e => { this.showCoords = e.target.checked; this._saveSettings(); this._renderBoard(); this._renderPieces(); });
    this.dom['toggle-legal']?.addEventListener('change', e => { this.showLegal = e.target.checked; this._saveSettings(); this._clearHighlights(); if (this.selected) this._showLegalMoves(); });
    this.dom['toggle-flip']?.addEventListener('change', e => { this.flipBoard = e.target.checked; this._saveSettings(); this._renderBoard(); this._renderPieces(); });
    this.dom['btn-reset-settings']?.addEventListener('click', () => this._resetSettings());
  }

  /* ---------- إعدادات ---------- */
  _loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('drder-settings'));
      if (s) {
        this.sound.enabled = s.sound !== false;
        this.showCoords = s.coords !== false;
        this.showLegal = s.legal !== false;
        this.flipBoard = s.flip === true;
      }
    } catch (e) {}
    if (this.dom['toggle-sound']) this.dom['toggle-sound'].checked = this.sound.enabled;
    if (this.dom['toggle-coords']) this.dom['toggle-coords'].checked = this.showCoords;
    if (this.dom['toggle-legal']) this.dom['toggle-legal'].checked = this.showLegal;
    if (this.dom['toggle-flip']) this.dom['toggle-flip'].checked = this.flipBoard;
  }

  _saveSettings() {
    try {
      localStorage.setItem('drder-settings', JSON.stringify({
        sound: this.sound.enabled,
        coords: this.showCoords,
        legal: this.showLegal,
        flip: this.flipBoard
      }));
    } catch (e) {}
  }

  _resetSettings() {
    this.sound.enabled = true;
    this.showCoords = true;
    this.showLegal = true;
    this.flipBoard = false;
    this._saveSettings();
    if (this.dom['toggle-sound']) this.dom['toggle-sound'].checked = true;
    if (this.dom['toggle-coords']) this.dom['toggle-coords'].checked = true;
    if (this.dom['toggle-legal']) this.dom['toggle-legal'].checked = true;
    if (this.dom['toggle-flip']) this.dom['toggle-flip'].checked = false;
    this._renderBoard();
    this._renderPieces();
  }

  _shouldFlip() {
    return this.flipBoard && this.mode === 'computer' && this.playerColor === BLACK;
  }

  _displayR(r) { return this._shouldFlip() ? 7 - r : r; }
  _displayF(f) { return this._shouldFlip() ? 7 - f : f; }

  /* ---------- بدء اللعبة ---------- */
  _start(mode) {
    this.sound.resume();
    this.mode = mode;
    this.state = new ChessState();
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.saved = false;
    this.animating = false;

    if (mode === 'computer') {
      this.playerColor = Math.random() < 0.5 ? WHITE : BLACK;
    } else {
      this.playerColor = null;
    }

    this._show('game');
    this._renderBoard();
    this._renderPieces();
    this._updateStatus();
    this._autoSave();

    if (mode === 'computer' && this.playerColor === BLACK) {
      setTimeout(() => this._computerMove(), 500);
    }
  }

  /* ---------- الرقعة ---------- */
  _renderBoard() {
    const board = this.dom['board'];
    if (!board) return;
    board.innerHTML = '';
    for (let dr = 0; dr < 8; dr++) {
      for (let df = 0; df < 8; df++) {
        const r = this._shouldFlip() ? 7 - dr : dr;
        const f = this._shouldFlip() ? 7 - df : df;
        const sq = document.createElement('div');
        sq.className = 'sq ' + ((r + f) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.r = r;
        sq.dataset.f = f;
        sq.style.gridRow = dr + 1;
        sq.style.gridColumn = df + 1;

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

        sq.addEventListener('click', () => this._onClick(r, f));
        board.appendChild(sq);
      }
    }
    this._applyEffects();
  }

  _renderPieces() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.piece').forEach(el => el.remove());
    const squares = board.querySelectorAll('.sq');
    squares.forEach(sq => {
      const r = parseInt(sq.dataset.r);
      const f = parseInt(sq.dataset.f);
      const piece = this.state.board[r][f];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === WHITE ? 'white' : 'black');
        span.textContent = PIECE_SYMBOLS[piece.type][piece.color];
        span.dataset.r = r;
        span.dataset.f = f;
        sq.appendChild(span);
      }
    });
  }

  /* تحريك قطعة بصرياً - لا يعيد رسم الرقعة لتجنب الاختفاء */
  _animatePiece(fromR, fromF, toR, toF) {
    const board = this.dom['board'];
    if (!board) return;
    const fromSq = board.querySelector(`.sq[data-r="${fromR}"][data-f="${fromF}"]`);
    const toSq = board.querySelector(`.sq[data-r="${toR}"][data-f="${toF}"]`);
    if (!fromSq || !toSq) return;
    const pieceEl = fromSq.querySelector('.piece');
    if (!pieceEl) return;

    const fromRect = fromSq.getBoundingClientRect();
    const toRect = toSq.getBoundingClientRect();
    const deltaX = toRect.left - fromRect.left;
    const deltaY = toRect.top - fromRect.top;

    pieceEl.style.transition = 'transform 0.18s ease-out';
    pieceEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    pieceEl.style.zIndex = '10';

    setTimeout(() => {
      pieceEl.style.transition = '';
      pieceEl.style.transform = '';
      pieceEl.style.zIndex = '';
      /* إعادة رسم القطع فقط مع الحفاظ على التأثيرات */
      this._renderPieces();
      this._applyEffects();
    }, 180);
  }

  _applyEffects() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.sq').forEach(sq => {
      sq.classList.remove('sel','legal','capture','last-from','last-to','check');
    });
    if (this.lastMove) {
      const fromSq = board.querySelector(`.sq[data-r="${this.lastMove.fr}"][data-f="${this.lastMove.ff}"]`);
      const toSq = board.querySelector(`.sq[data-r="${this.lastMove.tr}"][data-f="${this.lastMove.tf}"]`);
      if (fromSq) fromSq.classList.add('last-from');
      if (toSq) toSq.classList.add('last-to');
    }
    if (!this.state.gameOver && this.state.inCheck(this.state.turn)) {
      const king = this.state._king(this.state.turn);
      if (king) {
        const kingSq = board.querySelector(`.sq[data-r="${king.rank}"][data-f="${king.file}"]`);
        if (kingSq) kingSq.classList.add('check');
      }
    }
    if (this.selected && this.showLegal) this._showLegalMoves();
  }

  _clearHighlights() {
    const board = this.dom['board'];
    if (!board) return;
    board.querySelectorAll('.sq').forEach(sq => sq.classList.remove('sel','legal','capture'));
  }

  _showLegalMoves() {
    if (!this.selected || !this.showLegal) return;
    const board = this.dom['board'];
    if (!board) return;
    for (const m of this.legalMoves) {
      const sq = board.querySelector(`.sq[data-r="${m.tr}"][data-f="${m.tf}"]`);
      if (sq) sq.classList.add(m.capture || m.ep ? 'capture' : 'legal');
    }
  }

  /* ---------- النقر ---------- */
  _onClick(r, f) {
    if (this.animating) return;
    if (this.state.gameOver) return;
    if (this.mode === 'computer' && this.state.turn !== this.playerColor) return;

    const piece = this.state.board[r][f];

    if (this.selected) {
      const move = this.legalMoves.find(m => m.tr === r && m.tf === f);
      if (move) {
        if (move.promo) {
          this._showPromoDialog(move);
          return;
        }
        this._execute(move);
        return;
      }
      if (piece && piece.color === this.state.turn) {
        this._select(r, f);
        return;
      }
      this._deselect();
      return;
    }

    if (piece && piece.color === this.state.turn) {
      this._select(r, f);
    }
  }

  _select(r, f) {
    this._clearHighlights();
    this.selected = { r, f };
    this.legalMoves = this.state.legalMoves(this.state.turn).filter(m => m.fr === r && m.ff === f);
    const sq = this.dom['board']?.querySelector(`.sq[data-r="${r}"][data-f="${f}"]`);
    if (sq) sq.classList.add('sel');
    if (this.showLegal) this._showLegalMoves();
  }

  _deselect() {
    this.selected = null;
    this.legalMoves = [];
    this._clearHighlights();
    this._applyEffects();
  }

  /* ---------- تنفيذ نقلة ---------- */
  _execute(move) {
    const capture = !!(move.capture || move.ep);
    const special = !!(move.castle || move.promo);

    this.animating = true;
    this._deselect();

    const fromR = move.fr, fromF = move.ff, toR = move.tr, toF = move.tf;

    this._animatePiece(fromR, fromF, toR, toF);

    setTimeout(() => {
      this.state.makeMove(move);
      this.lastMove = { fr: fromR, ff: fromF, tr: toR, tf: toF };

      if (special) this.sound.specialSound();
      else if (capture) this.sound.captureSound();
      else this.sound.moveSound();

      this._updateStatus();
      this._autoSave();
      this.animating = false;

      if (this.state.gameOver) {
        setTimeout(() => this._showGameOver(), 400);
        return;
      }

      if (this.mode === 'computer' && this.state.turn !== this.playerColor) {
        setTimeout(() => this._computerMove(), 300);
      }
    }, 200);
  }

  _computerMove() {
    if (this.state.gameOver) return;
    const move = this.ai.bestMove(this.state);
    if (move) {
      if (move.promo) move.promo = QUEEN;
      const capture = !!(move.capture || move.ep);
      const special = !!(move.castle || move.promo);

      this.animating = true;
      this._animatePiece(move.fr, move.ff, move.tr, move.tf);

      setTimeout(() => {
        this.state.makeMove(move);
        this.lastMove = { fr: move.fr, ff: move.ff, tr: move.tr, tf: move.tf };

        if (special) this.sound.specialSound();
        else if (capture) this.sound.captureSound();
        else this.sound.moveSound();

        this._updateStatus();
        this._autoSave();
        this.animating = false;

        if (this.state.gameOver) {
          setTimeout(() => this._showGameOver(), 400);
        }
      }, 200);
    }
  }

  /* ---------- ترقية ---------- */
  _showPromoDialog(move) {
    if (!move) return;
    this.pendingPromo = move;
    const container = this.dom['promo-pieces'];
    if (!container) return;
    container.innerHTML = '';
    const color = this.state.turn;
    [QUEEN, ROOK, BISHOP, KNIGHT].forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'promo-btn ' + (color === WHITE ? 'white' : 'black');
      btn.textContent = PIECE_SYMBOLS[type][color];
      btn.addEventListener('click', () => {
        /* إغلاق الـ overlay أولاً */
        this.dom['overlay-promo']?.classList.remove('active');
        /* التأكد من وجود pendingPromo */
        if (!this.pendingPromo) return;
        this.pendingPromo.promo = type;
        const promoMove = this.pendingPromo;
        this.pendingPromo = null;
        this._execute(promoMove);
      });
      container.appendChild(btn);
    });
    this.dom['overlay-promo']?.classList.add('active');
  }

  /* ---------- شريط الحالة ---------- */
  _updateStatus() {
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
  _showGameOver() {
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
      fifty: 'قاعدة 50 نقلة',
      threefold: 'التكرار الثلاثي',
      material: 'مادة غير كافية'
    };
    if (this.dom['gameover-reason']) {
      this.dom['gameover-reason'].textContent = reasons[reason] || reason;
    }
    this._show('gameover');
    this._clearAutoSave();
  }

  /* ---------- حفظ محسن ---------- */
  _serialize() {
    return {
      mode: this.mode,
      playerColor: this.playerColor,
      fen: this.state._fen(),
      history: this.state.history.map(r => ({
        move: r.move,
        piece: r.piece,
        captured: r.captured,
        castling: r.castling,
        enPassant: r.enPassant,
        halfMoves: r.halfMoves,
        fullMove: r.fullMove,
        turn: r.turn
      })),
      lastMove: this.lastMove,
      saved: this.saved
    };
  }

  _deserialize(data) {
    this.mode = data.mode;
    this.playerColor = data.playerColor;
    this.state = new ChessState(data.fen);
    /* استعادة history كاملاً */
    this.state.history = data.history.map(r => ({
      move: r.move,
      piece: r.piece,
      captured: r.captured,
      castling: r.castling || { wK: false, wQ: false, bK: false, bQ: false },
      enPassant: r.enPassant || null,
      halfMoves: r.halfMoves || 0,
      fullMove: r.fullMove || 1,
      turn: r.turn || WHITE
    }));
    this.lastMove = data.lastMove;
    this.saved = data.saved || false;
    this.state._updateKey();
    this.state._endCheck();
  }

  _saveManual() {
    if (this.state.gameOver) return;
    try { localStorage.setItem('drder-manual', JSON.stringify(this._serialize())); this.saved = true; } catch (e) {}
  }

  _autoSave() {
    if (this.state.gameOver) return;
    try { localStorage.setItem('drder-auto', JSON.stringify(this._serialize())); } catch (e) {}
  }

  _clearAutoSave() {
    try { localStorage.removeItem('drder-auto'); } catch (e) {}
  }

  _checkRestore() {
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
        if (data.mode) { this._restoreData = data; this.dom['overlay-restore']?.classList.add('active'); }
      } catch (e) { this._clearAutoSave(); }
    }
  }

  _restoreSaved() {
    if (!this._restoreData) return;
    this._deserialize(this._restoreData);
    this.selected = null;
    this.legalMoves = [];
    this.dom['overlay-restore']?.classList.remove('active');
    const btn = this.dom['btn-continue'];
    if (btn) btn.style.display = 'none';
    this._restoreData = null;
    this._show('game');
    this._renderBoard();
    this._renderPieces();
    this._updateStatus();
    if (this.mode === 'computer' && this.state.turn !== this.playerColor && !this.state.gameOver) {
      setTimeout(() => this._computerMove(), 500);
    }
  }

  _discardSaved() {
    this._clearAutoSave();
    try { localStorage.removeItem('drder-manual'); } catch (e) {}
    this.dom['overlay-restore']?.classList.remove('active');
    const btn = this.dom['btn-continue'];
    if (btn) btn.style.display = 'none';
    this._restoreData = null;
  }

  _goHome() {
    if (!this.state.gameOver) this._autoSave();
    this._deselect();
    this._show('home');
    this._checkRestore();
  }

  _restart() { this._start(this.mode); }

  _registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
}

/* ---------- بدء التطبيق ---------- */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DrDerChess();
});
