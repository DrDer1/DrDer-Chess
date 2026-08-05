/* ============================================
   DrDer Chess - التطبيق الرئيسي
   يدير واجهة المستخدم والتكامل مع المحرك
   ============================================ */

// ---------- إدارة الأصوات ----------
class SoundManager {
  constructor() {
    this.enabled = true;
    this.moveSound = null;
    this.captureSound = null;
    this.specialSound = null;
    this.audioContext = null;
    this.initAudioContext();
  }

  // إنشاء سياق الصوت وتوليد الأصوات الخشبية
  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('متصفحك لا يدعم Web Audio API');
      this.enabled = false;
    }
  }

  // توليد صوت نقرة خشبية
  playMove() {
    if (!this.enabled || !this.audioContext) return;
    this.playWoodClick(800, 0.08);
  }

  // توليد صوت أكل (أقوى)
  playCapture() {
    if (!this.enabled || !this.audioContext) return;
    this.playWoodClick(500, 0.15);
    setTimeout(() => this.playWoodClick(300, 0.1), 50);
  }

  // توليد صوت التبييت أو الترقية
  playSpecial() {
    if (!this.enabled || !this.audioContext) return;
    this.playWoodClick(1000, 0.1);
    setTimeout(() => this.playWoodClick(1200, 0.1), 80);
  }

  // دالة مساعدة لتوليد صوت خشبي
  playWoodClick(frequency, duration) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.3, now + duration);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  // استئناف سياق الصوت بعد تفاعل المستخدم
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// ---------- إدارة التطبيق ----------
class DrDerChessApp {
  constructor() {
    // المكونات الأساسية
    this.chessState = new ChessState();
    this.chessAI = new ChessAI();
    this.soundManager = new SoundManager();

    // حالة اللعبة
    this.gameMode = null; // 'computer' أو 'two-player'
    this.playerColor = null; // اللون الذي يلعبه المستخدم في وضع الكمبيوتر
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.isAnimating = false;
    this.lastMove = null; // { fromRank, fromFile, toRank, toFile }
    this.showCoordinates = true;
    this.showLegalMoves = true;
    this.gameSaved = false;

    // عناصر DOM
    this.screens = {};
    this.boardElement = null;
    this.squares = [];

    // التهيئة
    this.init();
  }

  // التهيئة الرئيسية
  init() {
    this.cacheDOM();
    this.loadSettings();
    this.setupEventListeners();
    this.registerServiceWorker();
    this.checkForSavedGame();
    this.showScreen('home-screen');
  }

  // تخزين مراجع DOM
  cacheDOM() {
    this.screens.home = document.getElementById('home-screen');
    this.screens.game = document.getElementById('game-screen');
    this.screens.gameOver = document.getElementById('game-over-screen');
    this.screens.settings = document.getElementById('settings-screen');

    this.boardElement = document.getElementById('chess-board');
    this.statusText = document.getElementById('status-text');
    this.statusIcon = document.getElementById('status-icon');

    // أزرار الشاشة الرئيسية
    this.btnComputer = document.getElementById('btn-computer');
    this.btnTwoPlayer = document.getElementById('btn-two-player');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnContinue = document.getElementById('btn-continue');

    // أزرار أثناء اللعب
    this.btnMovesLog = document.getElementById('btn-moves-log');
    this.btnHome = document.getElementById('btn-home');
    this.btnSave = document.getElementById('btn-save');
    this.btnRestart = document.getElementById('btn-restart');

    // أزرار نهاية اللعبة
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnGameOverHome = document.getElementById('btn-game-over-home');

    // أزرار الإعدادات
    this.btnSettingsBack = document.getElementById('btn-settings-back');
    this.toggleSound = document.getElementById('toggle-sound');
    this.toggleCoordinates = document.getElementById('toggle-coordinates');
    this.toggleLegalMoves = document.getElementById('toggle-legal-moves');
    this.btnResetSettings = document.getElementById('btn-reset-settings');

    // نافذة سجل النقلات
    this.movesLogOverlay = document.getElementById('moves-log-overlay');
    this.movesLogContent = document.getElementById('moves-log-content');
    this.btnCloseMovesLog = document.getElementById('btn-close-moves-log');
    this.btnCopyPGN = document.getElementById('btn-copy-pgn');

    // نافذة استعادة اللعبة
    this.restoreOverlay = document.getElementById('restore-overlay');
    this.btnRestoreYes = document.getElementById('btn-restore-yes');
    this.btnRestoreNo = document.getElementById('btn-restore-no');

    // نافذة الترقية
    this.promotionOverlay = document.getElementById('promotion-overlay');
    this.promotionPiecesContainer = document.getElementById('promotion-pieces');

    // شاشة نهاية اللعبة
    this.gameOverTitle = document.getElementById('game-over-title');
    this.gameOverIcon = document.getElementById('game-over-icon');
    this.gameOverReason = document.getElementById('game-over-reason');
  }

  // إعداد مستمعي الأحداث
  setupEventListeners() {
    // الشاشة الرئيسية
    this.btnComputer.addEventListener('click', () => this.startGame('computer'));
    this.btnTwoPlayer.addEventListener('click', () => this.startGame('two-player'));
    this.btnSettings.addEventListener('click', () => this.showScreen('settings-screen'));
    this.btnContinue.addEventListener('click', () => this.restoreGame());

    // أزرار اللعب
    this.btnMovesLog.addEventListener('click', () => this.showMovesLog());
    this.btnHome.addEventListener('click', () => this.confirmGoHome());
    this.btnSave.addEventListener('click', () => this.saveGame());
    this.btnRestart.addEventListener('click', () => this.confirmRestart());

    // نافذة سجل النقلات
    this.btnCloseMovesLog.addEventListener('click', () => this.hideMovesLog());
    this.btnCopyPGN.addEventListener('click', () => this.copyPGN());
    this.movesLogOverlay.addEventListener('click', (e) => {
      if (e.target === this.movesLogOverlay) this.hideMovesLog();
    });

    // نافذة استعادة اللعبة
    this.btnRestoreYes.addEventListener('click', () => this.restoreGame());
    this.btnRestoreNo.addEventListener('click', () => this.discardSavedGame());

    // نافذة الترقية
    this.promotionOverlay.addEventListener('click', (e) => {
      if (e.target === this.promotionOverlay) {
        // منع الإغلاق - يجب على المستخدم اختيار قطعة
      }
    });

    // شاشة نهاية اللعبة
    this.btnPlayAgain.addEventListener('click', () => this.startGame(this.gameMode));
    this.btnGameOverHome.addEventListener('click', () => this.goHome());

    // الإعدادات
    this.btnSettingsBack.addEventListener('click', () => this.showScreen('home-screen'));
    this.toggleSound.addEventListener('change', () => this.updateSoundSetting());
    this.toggleCoordinates.addEventListener('change', () => this.updateCoordinatesSetting());
    this.toggleLegalMoves.addEventListener('change', () => this.updateLegalMovesSetting());
    this.btnResetSettings.addEventListener('click', () => this.resetSettings());
  }

  // تسجيل Service Worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((registration) => {
          console.log('تم تسجيل Service Worker بنجاح:', registration.scope);
        })
        .catch((error) => {
          console.warn('فشل تسجيل Service Worker:', error);
        });
    }
  }

  // ---------- إدارة الشاشات ----------
  showScreen(screenId) {
    Object.values(this.screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }
  }

  // ---------- إدارة الإعدادات ----------
  loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('drder-chess-settings'));
      if (settings) {
        this.soundManager.enabled = settings.soundEnabled !== false;
        this.showCoordinates = settings.showCoordinates !== false;
        this.showLegalMoves = settings.showLegalMoves !== false;
      }
    } catch (e) {
      // استخدام الإعدادات الافتراضية
    }
    this.applySettingsToUI();
  }

  saveSettings() {
    const settings = {
      soundEnabled: this.soundManager.enabled,
      showCoordinates: this.showCoordinates,
      showLegalMoves: this.showLegalMoves
    };
    try {
      localStorage.setItem('drder-chess-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('فشل حفظ الإعدادات');
    }
  }

  applySettingsToUI() {
    if (this.toggleSound) this.toggleSound.checked = this.soundManager.enabled;
    if (this.toggleCoordinates) this.toggleCoordinates.checked = this.showCoordinates;
    if (this.toggleLegalMoves) this.toggleLegalMoves.checked = this.showLegalMoves;
  }

  updateSoundSetting() {
    this.soundManager.enabled = this.toggleSound.checked;
    this.saveSettings();
  }

  updateCoordinatesSetting() {
    this.showCoordinates = this.toggleCoordinates.checked;
    this.saveSettings();
    this.renderBoard();
    this.renderPieces();
  }

  updateLegalMovesSetting() {
    this.showLegalMoves = this.toggleLegalMoves.checked;
    this.saveSettings();
    if (!this.showLegalMoves) {
      this.clearHighlights();
    } else if (this.selectedSquare) {
      this.highlightLegalMoves();
    }
  }

  resetSettings() {
    this.soundManager.enabled = true;
    this.showCoordinates = true;
    this.showLegalMoves = true;
    this.saveSettings();
    this.applySettingsToUI();
    this.renderBoard();
    this.renderPieces();
  }

  // ---------- بدء اللعبة ----------
  startGame(mode) {
    this.soundManager.resume();
    this.gameMode = mode;
    this.chessState.reset();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.lastMove = null;
    this.isAnimating = false;
    this.gameSaved = false;

    // اختيار اللون عشوائياً في وضع الكمبيوتر
    if (mode === 'computer') {
      this.playerColor = Math.random() < 0.5 ? WHITE : BLACK;
    } else {
      this.playerColor = null;
    }

    this.showScreen('game-screen');
    this.renderBoard();
    this.renderPieces();
    this.updateStatusBar();

    // حفظ تلقائي للحالة الابتدائية
    this.autoSave();

    // إذا كان الكمبيوتر يبدأ (الأسود) قم بحساب نقلته
    if (mode === 'computer' && this.playerColor === BLACK) {
      setTimeout(() => this.computerMove(), 500);
    }
  }

  // ---------- رسم الرقعة ----------
  renderBoard() {
    if (!this.boardElement) return;
    this.boardElement.innerHTML = '';
    this.squares = [];

    for (let r = 0; r < 8; r++) {
      this.squares[r] = [];
      for (let f = 0; f < 8; f++) {
        const square = document.createElement('div');
        const isLight = (r + f) % 2 === 0;
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        square.dataset.rank = r;
        square.dataset.file = f;

        // إضافة الإحداثيات
        if (this.showCoordinates) {
          if (f === 7) {
            const rankCoord = document.createElement('span');
            rankCoord.className = 'coordinates coordinates-rank';
            rankCoord.textContent = RANKS[r];
            square.appendChild(rankCoord);
          }
          if (r === 7) {
            const fileCoord = document.createElement('span');
            fileCoord.className = 'coordinates coordinates-file';
            fileCoord.textContent = FILES[f];
            square.appendChild(fileCoord);
          }
        }

        // إضافة مستمع النقر
        square.addEventListener('click', () => this.onSquareClick(r, f));

        this.boardElement.appendChild(square);
        this.squares[r][f] = square;
      }
    }

    // إعادة تطبيق التأثيرات
    this.applyBoardEffects();
  }

  // رسم القطع
  renderPieces() {
    // إزالة القطع الحالية
    const existingPieces = this.boardElement.querySelectorAll('.piece');
    existingPieces.forEach(p => p.remove());

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.chessState.board[r][f];
        if (piece) {
          const pieceElement = document.createElement('span');
          pieceElement.className = `piece ${piece.color === WHITE ? 'white-piece' : 'black-piece'}`;
          pieceElement.textContent = PIECE_SYMBOLS[piece.type][piece.color];
          pieceElement.dataset.rank = r;
          pieceElement.dataset.file = f;

          if (this.squares[r] && this.squares[r][f]) {
            this.squares[r][f].appendChild(pieceElement);
          }
        }
      }
    }
  }

  // تطبيق تأثيرات الرقعة (آخر نقلة، كش، إلخ)
  applyBoardEffects() {
    // مسح التأثيرات السابقة
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (this.squares[r] && this.squares[r][f]) {
          this.squares[r][f].classList.remove('last-move-from', 'last-move-to', 'king-in-check');
        }
      }
    }

    // إظهار آخر نقلة
    if (this.lastMove) {
      const fromSquare = this.squares[this.lastMove.fromRank]?.[this.lastMove.fromFile];
      const toSquare = this.squares[this.lastMove.toRank]?.[this.lastMove.toFile];
      if (fromSquare) fromSquare.classList.add('last-move-from');
      if (toSquare) toSquare.classList.add('last-move-to');
    }

    // إظهار الكش على الملك
    if (!this.chessState.gameOver && this.chessState.isInCheck(this.chessState.turn)) {
      const kingPos = this.chessState.findKing(this.chessState.turn);
      if (kingPos && this.squares[kingPos.rank]?.[kingPos.file]) {
        this.squares[kingPos.rank][kingPos.file].classList.add('king-in-check');
      }
    }

    // إظهار النقلات القانونية
    if (this.showLegalMoves && this.selectedSquare) {
      this.highlightLegalMoves();
    }
  }

  // مسح التأثيرات
  clearHighlights() {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (this.squares[r] && this.squares[r][f]) {
          this.squares[r][f].classList.remove('selected', 'legal-move', 'legal-capture');
        }
      }
    }
  }

  // إظهار النقلات القانونية للقطعة المحددة
  highlightLegalMoves() {
    if (!this.selectedSquare || !this.showLegalMoves) return;

    for (const move of this.legalMovesForSelected) {
      const square = this.squares[move.toRank]?.[move.toFile];
      if (square) {
        if (move.capture || move.enPassant) {
          square.classList.add('legal-capture');
        } else {
          square.classList.add('legal-move');
        }
      }
    }
  }

  // ---------- التعامل مع النقرات ----------
  onSquareClick(rank, file) {
    if (this.isAnimating) return;
    if (this.chessState.gameOver) return;

    // في وضع الكمبيوتر، تأكد من أن دور المستخدم
    if (this.gameMode === 'computer' && this.chessState.turn !== this.playerColor) return;

    const clickedPiece = this.chessState.board[rank][file];

    // إذا كان هناك قطعة محددة مسبقاً
    if (this.selectedSquare) {
      // التحقق مما إذا كانت النقلة قانونية
      const move = this.legalMovesForSelected.find(
        m => m.toRank === rank && m.toFile === file
      );

      if (move) {
        // التحقق من الترقية
        if (move.promotion) {
          this.showPromotionDialog(move);
          return;
        }
        this.executeMove(move);
        return;
      }

      // إذا نقر على قطعة من نفس اللون، قم بتغيير التحديد
      if (clickedPiece && clickedPiece.color === this.chessState.turn) {
        this.selectSquare(rank, file);
        return;
      }

      // نقر على مربع غير قانوني - إلغاء التحديد
      this.deselectSquare();
      return;
    }

    // تحديد قطعة جديدة
    if (clickedPiece && clickedPiece.color === this.chessState.turn) {
      this.selectSquare(rank, file);
    }
  }

  // تحديد مربع
  selectSquare(rank, file) {
    this.clearHighlights();
    this.selectedSquare = { rank, file };
    this.legalMovesForSelected = this.chessState.generateLegalMoves(this.chessState.turn)
      .filter(m => m.fromRank === rank && m.fromFile === file);

    if (this.squares[rank] && this.squares[rank][file]) {
      this.squares[rank][file].classList.add('selected');
    }

    if (this.showLegalMoves) {
      this.highlightLegalMoves();
    }
  }

  // إلغاء التحديد
  deselectSquare() {
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.clearHighlights();
    this.applyBoardEffects();
  }

  // ---------- تنفيذ النقلة ----------
  executeMove(move) {
    const lastMoveRecord = this.chessState.moveHistory.length > 0
      ? this.chessState.moveHistory[this.chessState.moveHistory.length - 1]
      : null;
    const isCapture = !!(move.capture || move.enPassant);

    // تنفيذ النقلة
    this.chessState.makeMove(move);
    this.lastMove = { fromRank: move.fromRank, fromFile: move.fromFile, toRank: move.toRank, toFile: move.toFile };

    // تشغيل الصوت المناسب
    if (move.castling || move.promotion) {
      this.soundManager.playSpecial();
    } else if (isCapture) {
      this.soundManager.playCapture();
    } else {
      this.soundManager.playMove();
    }

    // إلغاء التحديد
    this.deselectSquare();

    // إعادة رسم الرقعة
    this.renderBoard();
    this.renderPieces();
    this.updateStatusBar();

    // حفظ تلقائي
    this.autoSave();

    // التحقق من نهاية اللعبة
    if (this.chessState.gameOver) {
      setTimeout(() => this.showGameOver(), 600);
      return;
    }

    // دور الكمبيوتر
    if (this.gameMode === 'computer' && this.chessState.turn !== this.playerColor) {
      this.isAnimating = true;
      setTimeout(() => {
        this.computerMove();
      }, 300);
    }
  }

  // نقلة الكمبيوتر
  computerMove() {
    if (this.chessState.gameOver) {
      this.isAnimating = false;
      return;
    }

    const bestMove = this.chessAI.findBestMove(this.chessState);
    if (bestMove) {
      // إذا كانت النقلة ترقية، اختر الملكة دائماً
      if (bestMove.promotion) {
        bestMove.promotion = PIECE_QUEEN;
      }

      const isCapture = !!(bestMove.capture || bestMove.enPassant);
      this.chessState.makeMove(bestMove);
      this.lastMove = {
        fromRank: bestMove.fromRank,
        fromFile: bestMove.fromFile,
        toRank: bestMove.toRank,
        toFile: bestMove.toFile
      };

      if (bestMove.castling || bestMove.promotion) {
        this.soundManager.playSpecial();
      } else if (isCapture) {
        this.soundManager.playCapture();
      } else {
        this.soundManager.playMove();
      }

      this.renderBoard();
      this.renderPieces();
      this.updateStatusBar();
      this.autoSave();

      if (this.chessState.gameOver) {
        setTimeout(() => this.showGameOver(), 600);
      }
    }

    this.isAnimating = false;
  }

  // عرض حوار الترقية
  showPromotionDialog(move) {
    this.promotionPendingMove = move;
    this.promotionPiecesContainer.innerHTML = '';

    const color = this.chessState.turn;
    const promotionPieces = [PIECE_QUEEN, PIECE_ROOK, PIECE_BISHOP, PIECE_KNIGHT];

    for (const pieceType of promotionPieces) {
      const btn = document.createElement('button');
      btn.className = `promotion-piece-btn ${color === WHITE ? 'white-option' : 'black-option'}`;
      btn.textContent = PIECE_SYMBOLS[pieceType][color];
      btn.addEventListener('click', () => {
        this.promotionOverlay.classList.remove('active');
        move.promotion = pieceType;
        this.executeMove(move);
      });
      this.promotionPiecesContainer.appendChild(btn);
    }

    this.promotionOverlay.classList.add('active');
  }

  // ---------- شريط الحالة ----------
  updateStatusBar() {
    if (!this.statusText || !this.statusIcon) return;

    if (this.chessState.gameOver) {
      if (this.chessState.gameResult === 'white') {
        this.statusText.textContent = 'الأبيض فاز';
        this.statusIcon.textContent = '🏆';
      } else if (this.chessState.gameResult === 'black') {
        this.statusText.textContent = 'الأسود فاز';
        this.statusIcon.textContent = '🏆';
      } else {
        this.statusText.textContent = 'تعادل';
        this.statusIcon.textContent = '🤝';
      }
      return;
    }

    const turnText = this.chessState.turn === WHITE ? 'الأبيض' : 'الأسود';
    this.statusIcon.textContent = this.chessState.turn === WHITE ? '⚪' : '⚫';

    if (this.chessState.isInCheck(this.chessState.turn)) {
      this.statusText.textContent = `${turnText} - كش!`;
    } else {
      this.statusText.textContent = `دور ${turnText}`;
    }
  }

  // ---------- شاشة نهاية اللعبة ----------
  showGameOver() {
    if (!this.chessState.gameOver) return;

    const result = this.chessState.gameResult;
    const reason = this.chessState.gameResultReason;

    if (result === 'white') {
      this.gameOverTitle.textContent = 'الأبيض يفوز!';
      this.gameOverIcon.textContent = '🏆';
    } else if (result === 'black') {
      this.gameOverTitle.textContent = 'الأسود يفوز!';
      this.gameOverIcon.textContent = '🏆';
    } else {
      this.gameOverTitle.textContent = 'تعادل!';
      this.gameOverIcon.textContent = '🤝';
    }

    // ترجمة سبب النهاية
    const reasons = {
      'checkmate': 'كش مات',
      'stalemate': 'تعادل - الملك محاصر',
      'fifty-move': 'قاعدة 50 نقلة',
      'threefold-repetition': 'التكرار الثلاثي',
      'insufficient-material': 'مادة غير كافية'
    };
    this.gameOverReason.textContent = reasons[reason] || reason;

    this.showScreen('game-over-screen');

    // حذف الحفظ التلقائي عند انتهاء اللعبة
    this.clearAutoSave();
  }

  // ---------- سجل النقلات ----------
  showMovesLog() {
    const moves = this.chessState.moveHistory;
    let pgnText = '';
    let moveNumber = 1;

    for (let i = 0; i < moves.length; i++) {
      const record = moves[i];
      if (i % 2 === 0) {
        pgnText += `${moveNumber}. `;
        moveNumber++;
      }
      // إعادة بناء النقلة بصيغة PGN
      const tempState = new ChessState();
      // تطبيق النقلات السابقة للوصول إلى الحالة الصحيحة
      for (let j = 0; j < i; j++) {
        const prevRecord = moves[j];
        tempState.board[prevRecord.move.fromRank][prevRecord.move.fromFile] = prevRecord.piece;
        tempState.board[prevRecord.move.toRank][prevRecord.move.toFile] = prevRecord.captured;
        tempState.makeMoveWithoutValidation(prevRecord.move);
        tempState.turn = prevRecord.piece.color;
      }
      // استعادة الحالة الصحيحة
      tempState.board = this.chessState.board.map(row => row.map(cell => cell ? { ...cell } : null));
      // الحصول على PGN مبسط
      const pgnMove = this.getSimplePGN(record);
      pgnText += pgnMove + ' ';
    }

    this.movesLogContent.textContent = pgnText.trim() || 'لا توجد نقلات بعد';
    this.movesLogOverlay.classList.add('active');
  }

  // الحصول على PGN مبسط للنقلة
  getSimplePGN(record) {
    const move = record.move;
    if (move.castling === 'kingside') return 'O-O';
    if (move.castling === 'queenside') return 'O-O-O';

    const pieceSymbol = PGN_SYMBOLS[record.piece.type];
    const toFile = FILES[move.toFile];
    const toRank = RANKS[move.toRank];
    let pgn = pieceSymbol;

    if (record.isCapture || move.enPassant) {
      if (record.piece.type === PIECE_PAWN) {
        pgn += FILES[move.fromFile];
      }
      pgn += 'x';
    }

    pgn += toFile + toRank;

    if (move.promotion) {
      pgn += '=' + PGN_SYMBOLS[move.promotion];
    }

    return pgn;
  }

  hideMovesLog() {
    this.movesLogOverlay.classList.remove('active');
  }

  // نسخ PGN
  copyPGN() {
    const pgnText = this.movesLogContent.textContent;
    if (!pgnText || pgnText === 'لا توجد نقلات بعد') return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(pgnText)
        .then(() => {
          this.showToast('تم نسخ PGN');
        })
        .catch(() => {
          this.showToast('فشل النسخ');
        });
    } else {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = pgnText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.showToast('تم نسخ PGN');
      } catch (e) {
        this.showToast('فشل النسخ');
      }
      document.body.removeChild(textarea);
    }
  }

  // رسالة توست مؤقتة
  showToast(message) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--bg-surface);
      color: var(--text-primary);
      padding: 10px 24px;
      border-radius: 20px;
      font-size: 0.9rem;
      z-index: 200;
      box-shadow: var(--shadow-md);
      animation: fadeIn 0.3s ease;
      border: 1px solid var(--accent-gold);
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ---------- الحفظ والاستعادة ----------
  // حفظ يدوي
  saveGame() {
    if (this.chessState.gameOver) {
      this.showToast('اللعبة منتهية');
      return;
    }

    const saveData = {
      gameMode: this.gameMode,
      playerColor: this.playerColor,
      chessState: this.serializeState(),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('drder-chess-manual-save', JSON.stringify(saveData));
      this.gameSaved = true;
      this.showToast('تم حفظ اللعبة');
    } catch (e) {
      this.showToast('فشل الحفظ');
    }
  }

  // حفظ تلقائي
  autoSave() {
    if (this.chessState.gameOver) return;

    const saveData = {
      gameMode: this.gameMode,
      playerColor: this.playerColor,
      chessState: this.serializeState(),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('drder-chess-auto-save', JSON.stringify(saveData));
    } catch (e) {
      // فشل صامت
    }
  }

  // مسح الحفظ التلقائي
  clearAutoSave() {
    try {
      localStorage.removeItem('drder-chess-auto-save');
    } catch (e) {
      // فشل صامت
    }
  }

  // تسلسل حالة اللعبة للحفظ
  serializeState() {
    return {
      board: this.chessState.board,
      turn: this.chessState.turn,
      castlingRights: this.chessState.castlingRights,
      enPassantTarget: this.chessState.enPassantTarget,
      halfMoveClock: this.chessState.halfMoveClock,
      fullMoveNumber: this.chessState.fullMoveNumber,
      moveHistory: this.chessState.moveHistory.map(record => ({
        move: record.move,
        piece: record.piece,
        captured: record.captured,
        castlingRights: record.castlingRights,
        enPassantTarget: record.enPassantTarget,
        halfMoveClock: record.halfMoveClock,
        fullMoveNumber: record.fullMoveNumber,
        isCapture: record.isCapture,
        isPawnMove: record.isPawnMove,
        isCastling: record.isCastling,
        isPromotion: record.isPromotion,
        prevPositionKey: record.prevPositionKey
      })),
      positionCount: this.chessState.positionCount,
      currentPositionKey: this.chessState.currentPositionKey,
      gameOver: this.chessState.gameOver,
      gameResult: this.chessState.gameResult,
      gameResultReason: this.chessState.gameResultReason
    };
  }

  // إلغاء تسلسل الحالة
  deserializeState(data) {
    this.chessState.board = data.board;
    this.chessState.turn = data.turn;
    this.chessState.castlingRights = data.castlingRights;
    this.chessState.enPassantTarget = data.enPassantTarget;
    this.chessState.halfMoveClock = data.halfMoveClock;
    this.chessState.fullMoveNumber = data.fullMoveNumber;
    this.chessState.moveHistory = data.moveHistory;
    this.chessState.positionCount = data.positionCount;
    this.chessState.currentPositionKey = data.currentPositionKey;
    this.chessState.gameOver = data.gameOver;
    this.chessState.gameResult = data.gameResult;
    this.chessState.gameResultReason = data.gameResultReason;
  }

  // التحقق من وجود لعبة محفوظة عند البدء
  checkForSavedGame() {
    const manualSave = localStorage.getItem('drder-chess-manual-save');
    const autoSave = localStorage.getItem('drder-chess-auto-save');

    if (manualSave) {
      try {
        const data = JSON.parse(manualSave);
        this.btnContinue.style.display = 'flex';
        this.pendingRestoreData = data;
      } catch (e) {
        localStorage.removeItem('drder-chess-manual-save');
        this.btnContinue.style.display = 'none';
      }
    }

    if (autoSave && !manualSave) {
      try {
        const data = JSON.parse(autoSave);
        if (!data.chessState.gameOver) {
          this.restoreOverlay.classList.add('active');
          this.pendingRestoreData = data;
        } else {
          this.clearAutoSave();
        }
      } catch (e) {
        this.clearAutoSave();
      }
    }
  }

  // استعادة اللعبة
  restoreGame() {
    if (!this.pendingRestoreData) return;

    const data = this.pendingRestoreData;
    this.gameMode = data.gameMode;
    this.playerColor = data.playerColor;
    this.deserializeState(data.chessState);
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.lastMove = null;
    this.isAnimating = false;
    this.gameSaved = !!localStorage.getItem('drder-chess-manual-save');

    // استعادة آخر نقلة
    if (this.chessState.moveHistory.length > 0) {
      const lastRecord = this.chessState.moveHistory[this.chessState.moveHistory.length - 1];
      this.lastMove = {
        fromRank: lastRecord.move.fromRank,
        fromFile: lastRecord.move.fromFile,
        toRank: lastRecord.move.toRank,
        toFile: lastRecord.move.toFile
      };
    }

    this.restoreOverlay.classList.remove('active');
    this.showScreen('game-screen');
    this.renderBoard();
    this.renderPieces();
    this.updateStatusBar();
    this.pendingRestoreData = null;
    this.btnContinue.style.display = 'none';
  }

  // تجاهل اللعبة المحفوظة
  discardSavedGame() {
    this.clearAutoSave();
    try {
      localStorage.removeItem('drder-chess-manual-save');
    } catch (e) {
      // فشل صامت
    }
    this.restoreOverlay.classList.remove('active');
    this.pendingRestoreData = null;
    this.btnContinue.style.display = 'none';
  }

  // ---------- أزرار التحكم ----------
  confirmGoHome() {
    if (this.chessState.gameOver) {
      this.goHome();
      return;
    }

    if (confirm('هل تريد العودة للشاشة الرئيسية؟ سيتم حفظ اللعبة تلقائياً.')) {
      this.autoSave();
      this.goHome();
    }
  }

  goHome() {
    this.deselectSquare();
    this.showScreen('home-screen');
    this.checkForSavedGame();
  }

  confirmRestart() {
    if (this.chessState.gameOver) {
      this.startGame(this.gameMode);
      return;
    }

    if (confirm('هل تريد إعادة اللعبة من البداية؟')) {
      this.startGame(this.gameMode);
    }
  }
}

// ---------- بدء التطبيق عند تحميل الصفحة ----------
document.addEventListener('DOMContentLoaded', () => {
  window.drderChessApp = new DrDerChessApp();
});
