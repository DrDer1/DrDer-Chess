/*!
 * Chessboard.js - Custom Build for DrDer Chess
 * MIT License
 */
(function() {
    'use strict';

    const Chessboard = function(containerElOrId, config) {
        const DEFAULT_CONFIG = {
            position: 'start',
            orientation: 'white',
            showNotation: true,
            draggable: false,
            dropOffBoard: 'snapback',
            pieceTheme: function(piece) { return ''; },
            onDragStart: function() { return true; },
            onDrop: function() { return 'snapback'; },
            onSnapEnd: function() {},
            onMouseoutSquare: function() {},
            onMouseoverSquare: function() {},
            onMoveEnd: function() {},
            appearSpeed: 200,
            trashSpeed: 100,
            sparePieces: false,
            border: '0px',
            borderRadius: '4px'
        };

        // Merge config with defaults
        config = Object.assign({}, DEFAULT_CONFIG, config);

        // State variables
        let boardEl = null;
        let pieces = {};
        let currentPosition = config.position;
        let currentOrientation = config.orientation;
        let draggedPiece = null;
        let dragSourceSquare = null;
        let isDragging = false;
        let squareSize = 0;
        let isResizing = false;

        // DOM Elements
        const containerEl = typeof containerElOrId === 'string' 
            ? document.getElementById(containerElOrId) 
            : containerElOrId;

        if (!containerEl) {
            console.error('Chessboard: Container element not found');
            return;
        }

        // Initialize board
        function init() {
            buildBoard();
            updatePosition();
            
            // Handle resize
            window.addEventListener('resize', debounce(resize, 250));
        }

        function buildBoard() {
            containerEl.innerHTML = '';
            boardEl = document.createElement('div');
            boardEl.className = 'chessboard';
            boardEl.style.cssText = `
                position: relative;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, sans-serif;
            `;
            containerEl.appendChild(boardEl);

            // Create squares
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = document.createElement('div');
                    const isWhite = (row + col) % 2 === 0;
                    const squareId = `${String.fromCharCode(97 + col)}${8 - row}`;
                    
                    square.className = `square square-${squareId}`;
                    square.dataset.square = squareId;
                    square.style.cssText = `
                        position: absolute;
                        width: 12.5%;
                        height: 12.5%;
                        top: ${row * 12.5}%;
                        left: ${col * 12.5}%;
                        background-color: ${isWhite ? '#f0d9b5' : '#b58863'};
                        cursor: pointer;
                        transition: background-color 0.1s;
                    `;

                    // Hover effects
                    square.addEventListener('mouseenter', () => {
                        if (!isDragging) {
                            square.style.backgroundColor = isWhite ? '#e8d5a3' : '#a07050';
                        }
                    });
                    square.addEventListener('mouseleave', () => {
                        if (!isDragging) {
                            square.style.backgroundColor = isWhite ? '#f0d9b5' : '#b58863';
                        }
                    });

                    boardEl.appendChild(square);
                }
            }

            // Add notation if enabled
            if (config.showNotation) {
                addNotation();
            }

            // Add pieces container
            const piecesContainer = document.createElement('div');
            piecesContainer.className = 'pieces-container';
            piecesContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;
            boardEl.appendChild(piecesContainer);
        }

        function addNotation() {
            // File labels (a-h)
            for (let i = 0; i < 8; i++) {
                const label = document.createElement('div');
                const col = currentOrientation === 'white' ? i : 7 - i;
                label.textContent = String.fromCharCode(97 + col);
                label.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    left: ${i * 12.5 + 12.5 / 2}%;
                    transform: translateX(-50%);
                    font-size: ${Math.max(8, 12.5 * 0.25)}px;
                    color: ${i % 2 === 0 ? '#b58863' : '#f0d9b5'};
                    font-weight: bold;
                    pointer-events: none;
                    z-index: 1;
                `;
                boardEl.appendChild(label);
            }

            // Rank labels (1-8)
            for (let i = 0; i < 8; i++) {
                const label = document.createElement('div');
                const row = currentOrientation === 'white' ? 7 - i : i;
                label.textContent = row + 1;
                label.style.cssText = `
                    position: absolute;
                    top: ${i * 12.5 + 12.5 / 2}%;
                    right: 2px;
                    transform: translateY(-50%);
                    font-size: ${Math.max(8, 12.5 * 0.25)}px;
                    color: ${i % 2 === 0 ? '#f0d9b5' : '#b58863'};
                    font-weight: bold;
                    pointer-events: none;
                    z-index: 1;
                `;
                boardEl.appendChild(label);
            }
        }

        function updatePosition() {
            const piecesContainer = boardEl.querySelector('.pieces-container');
            if (!piecesContainer) return;

            piecesContainer.innerHTML = '';
            pieces = {};

            // Parse position (FEN string or 'start')
            let fenPosition = currentPosition;
            if (fenPosition === 'start') {
                fenPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
            }

            const rows = fenPosition.split('/');
            for (let row = 0; row < 8; row++) {
                let col = 0;
                const displayRow = currentOrientation === 'white' ? row : 7 - row;
                
                for (let char of rows[row]) {
                    if (char >= '1' && char <= '8') {
                        col += parseInt(char);
                    } else {
                        const pieceColor = char === char.toUpperCase() ? 'w' : 'b';
                        const pieceType = char.toLowerCase();
                        const displayCol = currentOrientation === 'white' ? col : 7 - col;
                        const square = `${String.fromCharCode(97 + displayCol)}${8 - displayRow}`;
                        
                        createPiece(square, pieceColor + pieceType.toUpperCase());
                        col++;
                    }
                }
            }
        }

        function createPiece(square, piece) {
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece piece-${piece} square-${square}`;
            pieceEl.dataset.piece = piece;
            pieceEl.dataset.square = square;
            pieceEl.style.cssText = `
                position: absolute;
                width: 12.5%;
                height: 12.5%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${12.5 * 0.8}%;
                cursor: pointer;
                user-select: none;
                pointer-events: all;
                z-index: 2;
                transition: transform 0.05s;
            `;

            // Set position
            const col = square.charCodeAt(0) - 97;
            const row = 8 - parseInt(square[1]);
            const displayRow = currentOrientation === 'white' ? row : 7 - row;
            const displayCol = currentOrientation === 'white' ? col : 7 - col;

            pieceEl.style.top = `${displayRow * 12.5}%`;
            pieceEl.style.left = `${displayCol * 12.5}%`;

            // Set piece symbol
            const symbols = {
                'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
                'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
            };
            
            pieceEl.textContent = config.pieceTheme(piece) || symbols[piece] || '?';

            // Drag and drop
            pieceEl.addEventListener('mousedown', (e) => onPieceMouseDown(e, pieceEl, square, piece));
            pieceEl.addEventListener('touchstart', (e) => onPieceTouchStart(e, pieceEl, square, piece), { passive: false });

            // Hover effect
            pieceEl.addEventListener('mouseenter', () => {
                pieceEl.style.transform = 'scale(1.05)';
            });
            pieceEl.addEventListener('mouseleave', () => {
                if (!isDragging || pieceEl !== draggedPiece) {
                    pieceEl.style.transform = 'scale(1)';
                }
            });

            const piecesContainer = boardEl.querySelector('.pieces-container');
            piecesContainer.appendChild(pieceEl);
            pieces[square] = pieceEl;
        }

        function onPieceMouseDown(e, pieceEl, square, piece) {
            e.preventDefault();
            
            const dragAllowed = config.onDragStart(square, piece, currentPosition, currentOrientation);
            if (dragAllowed === false) return;

            startDrag(e.clientX, e.clientY, pieceEl, square, piece);
        }

        function onPieceTouchStart(e, pieceEl, square, piece) {
            const touch = e.touches[0];
            
            const dragAllowed = config.onDragStart(square, piece, currentPosition, currentOrientation);
            if (dragAllowed === false) return;

            e.preventDefault();
            startDrag(touch.clientX, touch.clientY, pieceEl, square, piece);
        }

        function startDrag(clientX, clientY, pieceEl, square, piece) {
            isDragging = true;
            draggedPiece = pieceEl;
            dragSourceSquare = square;

            pieceEl.style.zIndex = '100';
            pieceEl.style.transform = 'scale(1.1)';

            const moveHandler = (e) => {
                const x = e.clientX || e.touches[0].clientX;
                const y = e.clientY || e.touches[0].clientY;
                moveDraggedPiece(x, y);
            };

            const releaseHandler = (e) => {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('touchmove', moveHandler);
                document.removeEventListener('mouseup', releaseHandler);
                document.removeEventListener('touchend', releaseHandler);

                const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
                const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
                endDrag(clientX, clientY);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('mouseup', releaseHandler);
            document.addEventListener('touchend', releaseHandler);
        }

        function moveDraggedPiece(clientX, clientY) {
            if (!draggedPiece || !boardEl) return;

            const boardRect = boardEl.getBoundingClientRect();
            const x = clientX - boardRect.left - (boardRect.width * 0.0625);
            const y = clientY - boardRect.top - (boardRect.height * 0.0625);

            draggedPiece.style.left = `${(x / boardRect.width) * 100}%`;
            draggedPiece.style.top = `${(y / boardRect.height) * 100}%`;
        }

        function endDrag(clientX, clientY) {
            if (!draggedPiece || !boardEl) {
                isDragging = false;
                return;
            }

            const boardRect = boardEl.getBoundingClientRect();
            const col = Math.floor(((clientX - boardRect.left) / boardRect.width) * 8);
            const row = Math.floor(((clientY - boardRect.top) / boardRect.height) * 8);

            let targetSquare;
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                const actualCol = currentOrientation === 'white' ? col : 7 - col;
                const actualRow = currentOrientation === 'white' ? 8 - row : row + 1;
                targetSquare = `${String.fromCharCode(97 + actualCol)}${actualRow}`;
            }

            const result = config.onDrop(dragSourceSquare, targetSquare, draggedPiece.dataset.piece);

            if (result === 'snapback' || result === false) {
                snapbackPiece();
            } else {
                config.onSnapEnd();
            }

            isDragging = false;
            draggedPiece.style.zIndex = '2';
            draggedPiece.style.transform = 'scale(1)';
            draggedPiece = null;
            dragSourceSquare = null;
        }

        function snapbackPiece() {
            if (!draggedPiece || !dragSourceSquare) return;

            const col = dragSourceSquare.charCodeAt(0) - 97;
            const row = 8 - parseInt(dragSourceSquare[1]);
            const displayRow = currentOrientation === 'white' ? row : 7 - row;
            const displayCol = currentOrientation === 'white' ? col : 7 - col;

            draggedPiece.style.transition = 'all 0.2s ease';
            draggedPiece.style.top = `${displayRow * 12.5}%`;
            draggedPiece.style.left = `${displayCol * 12.5}%`;

            setTimeout(() => {
                if (draggedPiece) {
                    draggedPiece.style.transition = 'transform 0.05s';
                }
            }, 200);
        }

        function resize() {
            if (isResizing) return;
            isResizing = true;

            requestAnimationFrame(() => {
                const fontSize = containerEl.offsetWidth * 0.08;
                const allPieces = boardEl.querySelectorAll('.piece');
                allPieces.forEach(el => {
                    el.style.fontSize = `${fontSize}px`;
                });

                isResizing = false;
            });
        }

        function destroy() {
            if (boardEl) {
                boardEl.innerHTML = '';
                boardEl = null;
            }
            pieces = {};
            containerEl.innerHTML = '';
        }

        function debounce(fn, delay) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(this, args), delay);
            };
        }

        // Public API
        const publicAPI = {
            position: function(pos) {
                if (pos === undefined) return currentPosition;
                currentPosition = pos;
                updatePosition();
                return publicAPI;
            },
            move: function() {
                // Handled by drag and drop
            },
            resize: resize,
            destroy: destroy,
            orientation: function(orient) {
                if (orient === undefined) return currentOrientation;
                currentOrientation = orient;
                updatePosition();
                return publicAPI;
            },
            clear: function() {
                const piecesContainer = boardEl.querySelector('.pieces-container');
                if (piecesContainer) {
                    piecesContainer.innerHTML = '';
                }
                pieces = {};
            },
            start: function() {
                currentPosition = 'start';
                updatePosition();
                return publicAPI;
            }
        };

        init();
        return publicAPI;
    };

    // Export to window
    window.Chessboard = Chessboard;
})();
