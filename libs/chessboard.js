window.Chessboard = function(id, config) {
    config = config || {};
    var container = document.getElementById(id);
    if (!container) return {};
    
    var position = config.position || 'start';
    var orientation = config.orientation || 'white';
    var showNotation = config.showNotation !== false;
    var pieceTheme = config.pieceTheme || function(p) { return ''; };
    var onDragStart = config.onDragStart || function() { return true; };
    var onDrop = config.onDrop || function() { return 'snapback'; };
    var onSnapEnd = config.onSnapEnd || function() {};
    
    var dragPiece = null;
    var dragSquare = null;
    var boardDiv = null;
    var piecesDiv = null;
    
    function init() {
        container.innerHTML = '';
        boardDiv = document.createElement('div');
        boardDiv.style.cssText = 'position:relative;width:100%;height:100%;';
        container.appendChild(boardDiv);
        
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var sq = document.createElement('div');
                var dr = orientation === 'white' ? r : 7 - r;
                var dc = orientation === 'white' ? c : 7 - c;
                var isLight = (dr + dc) % 2 === 0;
                var name = String.fromCharCode(97 + dc) + (8 - dr);
                sq.setAttribute('data-square', name);
                sq.style.cssText = 'position:absolute;width:12.5%;height:12.5%;top:' + (r*12.5) + '%;left:' + (c*12.5) + '%;background:' + (isLight ? '#f0d9b5' : '#b58863') + ';';
                boardDiv.appendChild(sq);
            }
        }
        
        if (showNotation) {
            for (var i = 0; i < 8; i++) {
                var fc = orientation === 'white' ? i : 7 - i;
                var fl = document.createElement('div');
                fl.textContent = String.fromCharCode(97 + fc);
                fl.style.cssText = 'position:absolute;bottom:1px;left:' + (i*12.5+6.25) + '%;transform:translateX(-50%);font-size:8px;color:' + (i%2===0?'#b58863':'#f0d9b5') + ';z-index:5;';
                boardDiv.appendChild(fl);
                
                var rr = orientation === 'white' ? 7 - i : i;
                var rl = document.createElement('div');
                rl.textContent = rr + 1;
                rl.style.cssText = 'position:absolute;top:' + (i*12.5+6.25) + '%;right:1px;transform:translateY(-50%);font-size:8px;color:' + (i%2===0?'#f0d9b5':'#b58863') + ';z-index:5;';
                boardDiv.appendChild(rl);
            }
        }
        
        piecesDiv = document.createElement('div');
        piecesDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;';
        boardDiv.appendChild(piecesDiv);
        drawPieces();
    }
    
    function drawPieces() {
        if (!piecesDiv) return;
        piecesDiv.innerHTML = '';
        var fen = position === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' : position.split(' ')[0];
        var rows = fen.split('/');
        for (var r = 0; r < 8; r++) {
            var col = 0;
            for (var i = 0; i < rows[r].length; i++) {
                var ch = rows[r][i];
                if (ch >= '0' && ch <= '9') {
                    col += parseInt(ch);
                } else {
                    var color = ch === ch.toUpperCase() ? 'w' : 'b';
                    var type = ch.toUpperCase();
                    var dr = orientation === 'white' ? r : 7 - r;
                    var dc = orientation === 'white' ? col : 7 - col;
                    var square = String.fromCharCode(97 + dc) + (8 - dr);
                    var key = color + type;
                    var el = document.createElement('div');
                    el.setAttribute('data-piece', key);
                    el.setAttribute('data-square', square);
                    el.textContent = pieceTheme(key);
                    el.style.cssText = 'position:absolute;width:12.5%;height:12.5%;top:' + (dr*12.5) + '%;left:' + (dc*12.5) + '%;display:flex;align-items:center;justify-content:center;font-size:' + (container.offsetWidth*0.08) + 'px;cursor:pointer;z-index:10;';
                    
                    el.addEventListener('mousedown', (function(el, square, key) {
                        return function(e) {
                            e.preventDefault();
                            if (onDragStart(square, key, position, orientation) === false) return;
                            dragPiece = el;
                            dragSquare = square;
                            el.style.zIndex = '100';
                            function mv(e) {
                                if (!dragPiece || !boardDiv) return;
                                var rect = boardDiv.getBoundingClientRect();
                                var x = (e.clientX || e.touches[0].clientX) - rect.left - rect.width*0.0625;
                                var y = (e.clientY || e.touches[0].clientY) - rect.top - rect.height*0.0625;
                                dragPiece.style.left = (x/rect.width*100) + '%';
                                dragPiece.style.top = (y/rect.height*100) + '%';
                            }
                            function up(e) {
                                document.removeEventListener('mousemove', mv);
                                document.removeEventListener('mouseup', up);
                                document.removeEventListener('touchmove', mv);
                                document.removeEventListener('touchend', up);
                                if (!boardDiv || !dragPiece) return;
                                var rect = boardDiv.getBoundingClientRect();
                                var cx = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
                                var cy = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
                                var c = Math.floor((cx - rect.left) / rect.width * 8);
                                var r = Math.floor((cy - rect.top) / rect.height * 8);
                                var target = null;
                                if (c >= 0 && c < 8 && r >= 0 && r < 8) {
                                    var ac = orientation === 'white' ? c : 7 - c;
                                    var ar = orientation === 'white' ? 8 - r : r + 1;
                                    target = String.fromCharCode(97 + ac) + ar;
                                }
                                if (onDrop(dragSquare, target, key) === 'snapback') {
                                    dragPiece.style.transition = 'all 0.2s';
                                    dragPiece.style.left = (dc*12.5) + '%';
                                    dragPiece.style.top = (dr*12.5) + '%';
                                    setTimeout(function() { if (dragPiece) dragPiece.style.transition = ''; }, 200);
                                }
                                dragPiece.style.zIndex = '10';
                                dragPiece = null;
                                dragSquare = null;
                                onSnapEnd();
                            }
                            document.addEventListener('mousemove', mv);
                            document.addEventListener('mouseup', up);
                            document.addEventListener('touchmove', mv, {passive: false});
                            document.addEventListener('touchend', up);
                        };
                    })(el, square, key));
                    
                    piecesDiv.appendChild(el);
                    col++;
                }
            }
        }
    }
    
    init();
    
    return {
        position: function(pos) {
            if (pos === undefined) return position;
            position = pos;
            drawPieces();
            return this;
        },
        resize: function() {
            if (!piecesDiv) return;
            var size = container.offsetWidth * 0.08;
            var pieces = piecesDiv.children;
            for (var i = 0; i < pieces.length; i++) {
                pieces[i].style.fontSize = size + 'px';
            }
        },
        destroy: function() {
            container.innerHTML = '';
            boardDiv = null;
            piecesDiv = null;
        },
        clear: function() {
            if (piecesDiv) piecesDiv.innerHTML = '';
        }
    };
};
