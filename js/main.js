/**
 * 3D Chess Game - Main Logic
 * Handles scene setup, game state, user interaction, and rendering.
 */

// ==================== Scene Setup ====================
let scene, camera, renderer, orbitControls;
let boardGroup, piecesGroup;
let raycaster, mouse;
let chess;
let selectedSquare = null;
let legalMoveSquares = [];
let squareMeshes = {};
let clickPlaneMeshes = {};
let pieceMeshes = {};
let highlightMeshes = [];
let capturedWhite = [];
let capturedBlack = [];
let boardFlipped = false;
let pendingPromotion = null;
let animating = false;
let lastMoveSquares = [];

const SQUARE_SIZE = 1;
const BOARD_SIZE = 8;
const BOARD_OFFSET = (BOARD_SIZE - 1) / 2;

const COLORS = {
    lightSquare: 0xdec8a0,
    darkSquare: 0x8b6914,
    selectedSquare: 0x44ff44,
    legalMove: 0x44aaff,
    captureMove: 0xff4444,
    lastMove: 0xcccc44,
    checkSquare: 0xff2222,
    border: 0x4a3728,
};

init();
animate();

function init() {
    // Chess engine
    chess = new Chess();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lights
    setupLights();

    // Board
    createBoard();

    // Pieces
    piecesGroup = new THREE.Group();
    scene.add(piecesGroup);
    syncPiecesToBoard();

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Orbit controls (manual implementation for CDN compatibility)
    setupOrbitControls();

    // Event listeners
    renderer.domElement.addEventListener('click', onBoardClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    // Initial UI update
    updateUI();
}

function setupLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 8, -5);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffd700, 0.2);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Point light for warmth
    const pointLight = new THREE.PointLight(0xffaa44, 0.3, 20);
    pointLight.position.set(0, 6, 0);
    scene.add(pointLight);
}

// ==================== Board Creation ====================

function createBoard() {
    boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // Board base
    const baseGeom = new THREE.BoxGeometry(BOARD_SIZE + 0.8, 0.3, BOARD_SIZE + 0.8);
    const baseMat = new THREE.MeshStandardMaterial({
        color: COLORS.border,
        roughness: 0.6,
        metalness: 0.1,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.2;
    base.receiveShadow = true;
    boardGroup.add(base);

    // Squares
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isLight = (row + col) % 2 === 0;
            const squareMat = new THREE.MeshStandardMaterial({
                color: isLight ? COLORS.lightSquare : COLORS.darkSquare,
                roughness: 0.7,
                metalness: 0.05,
            });

            const squareGeom = new THREE.BoxGeometry(SQUARE_SIZE, 0.08, SQUARE_SIZE);
            const square = new THREE.Mesh(squareGeom, squareMat);

            const x = col - BOARD_OFFSET;
            const z = row - BOARD_OFFSET;
            square.position.set(x, -0.01, z);
            square.receiveShadow = true;

            // Map algebraic notation to mesh
            const file = String.fromCharCode(97 + col); // a-h
            const rank = 8 - row; // 8-1
            const squareKey = file + rank;
            square.userData.square = squareKey;
            square.userData.row = row;
            square.userData.col = col;
            square.userData.originalColor = isLight ? COLORS.lightSquare : COLORS.darkSquare;

            squareMeshes[squareKey] = square;
            boardGroup.add(square);

            // Invisible click plane for better raycasting
            const clickGeom = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
            const clickMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
            const clickPlane = new THREE.Mesh(clickGeom, clickMat);
            clickPlane.position.set(x, 0.06, z);
            clickPlane.rotation.x = -Math.PI / 2;
            clickPlane.userData.square = squareKey;
            clickPlaneMeshes[squareKey] = clickPlane;
            boardGroup.add(clickPlane);
        }
    }

    // Rank and file labels
    createLabels();
}

function createLabels() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const files = 'abcdefgh';
    for (let i = 0; i < 8; i++) {
        // File labels (bottom)
        const fileTexture = createLabelTexture(files[i]);
        const fileMat = new THREE.MeshBasicMaterial({ map: fileTexture, transparent: true });
        const filePlane = new THREE.PlaneGeometry(0.3, 0.3);
        const fileLabel = new THREE.Mesh(filePlane, fileMat);
        fileLabel.position.set(i - BOARD_OFFSET, -0.04, BOARD_OFFSET + 0.65);
        fileLabel.rotation.x = -Math.PI / 2;
        boardGroup.add(fileLabel);

        // Rank labels (left)
        const rankTexture = createLabelTexture(String(8 - i));
        const rankMat = new THREE.MeshBasicMaterial({ map: rankTexture, transparent: true });
        const rankPlane = new THREE.PlaneGeometry(0.3, 0.3);
        const rankLabel = new THREE.Mesh(rankPlane, rankMat);
        rankLabel.position.set(-BOARD_OFFSET - 0.65, -0.04, i - BOARD_OFFSET);
        rankLabel.rotation.x = -Math.PI / 2;
        boardGroup.add(rankLabel);
    }
}

function createLabelTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c0a878';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// ==================== Piece Management ====================

function squareToWorldPos(squareKey) {
    const col = squareKey.charCodeAt(0) - 97;
    const row = 8 - parseInt(squareKey[1]);
    const x = col - BOARD_OFFSET;
    const z = row - BOARD_OFFSET;
    return new THREE.Vector3(x, 0, z);
}

function syncPiecesToBoard() {
    // Remove all existing pieces
    while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
    }
    pieceMeshes = {};

    // Create pieces from chess.js board state
    const board = chess.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const squareKey = file + rank;
                const color = piece.color === 'w' ? 'white' : 'black';

                const pieceMesh = createPiece(piece.type, color);
                if (pieceMesh) {
                    const pos = squareToWorldPos(squareKey);
                    pieceMesh.position.copy(pos);
                    pieceMesh.castShadow = true;
                    pieceMesh.userData.square = squareKey;
                    pieceMesh.userData.color = piece.color;
                    pieceMesh.userData.type = piece.type;

                    // Rotate black pieces to face the other direction
                    if (piece.color === 'b') {
                        pieceMesh.rotation.y = Math.PI;
                    }

                    piecesGroup.add(pieceMesh);
                    pieceMeshes[squareKey] = pieceMesh;
                }
            }
        }
    }
}

// ==================== Interaction ====================

function getSquareFromMouse(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check invisible click planes first (most reliable)
    const clickPlaneArray = Object.values(clickPlaneMeshes);
    const planeIntersects = raycaster.intersectObjects(clickPlaneArray);
    if (planeIntersects.length > 0) {
        return planeIntersects[0].object.userData.square;
    }

    // Fallback: check visible squares
    const squareArray = Object.values(squareMeshes);
    const intersects = raycaster.intersectObjects(squareArray);
    if (intersects.length > 0) {
        return intersects[0].object.userData.square;
    }

    // Check pieces (find which square they're on)
    const allPieceParts = [];
    piecesGroup.children.forEach(function(piece) {
        piece.traverse(function(child) {
            if (child.isMesh) {
                child.userData.parentSquare = piece.userData.square;
                allPieceParts.push(child);
            }
        });
    });
    const pieceIntersects = raycaster.intersectObjects(allPieceParts);
    if (pieceIntersects.length > 0) {
        return pieceIntersects[0].object.userData.parentSquare;
    }

    return null;
}

function onBoardClick(event) {
    if (animating) return;

    const clickedSquare = getSquareFromMouse(event);
    if (!clickedSquare) return;

    if (selectedSquare) {
        // Check if clicked square is a legal move
        const isLegal = legalMoveSquares.some(function(m) { return m.to === clickedSquare; });

        if (isLegal) {
            const move = legalMoveSquares.find(function(m) { return m.to === clickedSquare; });

            // Check for promotion
            if (move.flags && move.flags.includes('p')) {
                pendingPromotion = { from: selectedSquare, to: clickedSquare };
                document.getElementById('promotion-modal').classList.remove('hidden');
                return;
            }

            makeMove(selectedSquare, clickedSquare);
        } else if (clickedSquare === selectedSquare) {
            // Deselect
            clearSelection();
        } else {
            // Try to select new piece
            clearSelection();
            trySelectSquare(clickedSquare);
        }
    } else {
        trySelectSquare(clickedSquare);
    }
}

function trySelectSquare(squareKey) {
    const piece = chess.get(squareKey);
    if (piece && piece.color === chess.turn()) {
        selectedSquare = squareKey;

        // Highlight selected square
        highlightSquare(squareKey, COLORS.selectedSquare);

        // Get and show legal moves
        const moves = chess.moves({ square: squareKey, verbose: true });
        legalMoveSquares = moves;

        moves.forEach(function(move) {
            const targetPiece = chess.get(move.to);
            const color = targetPiece ? COLORS.captureMove : COLORS.legalMove;
            showMoveIndicator(move.to, color, !!targetPiece);
        });

        // Highlight the selected piece
        if (pieceMeshes[squareKey]) {
            setPieceMaterial(pieceMeshes[squareKey], HIGHLIGHT_MATERIALS.selected);
        }
    }
}

function clearSelection() {
    selectedSquare = null;
    legalMoveSquares = [];

    // Reset square colors
    Object.keys(squareMeshes).forEach(function(key) {
        const mesh = squareMeshes[key];
        mesh.material.color.setHex(mesh.userData.originalColor);
    });

    // Re-apply last move highlights
    lastMoveSquares.forEach(function(sq) {
        if (squareMeshes[sq]) {
            squareMeshes[sq].material.color.setHex(COLORS.lastMove);
        }
    });

    // Highlight king in check
    if (chess.in_check()) {
        highlightKingInCheck();
    }

    // Remove move indicators
    highlightMeshes.forEach(function(mesh) {
        scene.remove(mesh);
    });
    highlightMeshes = [];

    // Reset piece materials
    Object.values(pieceMeshes).forEach(function(piece) {
        if (piece) resetPieceMaterial(piece);
    });
}

function highlightSquare(squareKey, color) {
    if (squareMeshes[squareKey]) {
        squareMeshes[squareKey].material.color.setHex(color);
    }
}

function showMoveIndicator(squareKey, color, isCapture) {
    const pos = squareToWorldPos(squareKey);
    let geom, mat, mesh;

    if (isCapture) {
        // Ring for captures
        geom = new THREE.RingGeometry(0.3, 0.48, 24);
        mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, 0.08, pos.z);
        mesh.rotation.x = -Math.PI / 2;
    } else {
        // Dot for regular moves
        geom = new THREE.CircleGeometry(0.2, 16);
        mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, 0.08, pos.z);
        mesh.rotation.x = -Math.PI / 2;
    }

    scene.add(mesh);
    highlightMeshes.push(mesh);
}

function highlightKingInCheck() {
    // Find the king that's in check
    const turn = chess.turn();
    const board = chess.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'k' && piece.color === turn) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const sq = file + rank;
                highlightSquare(sq, COLORS.checkSquare);
            }
        }
    }
}

// ==================== Move Execution ====================

function makeMove(from, to, promotion) {
    const moveObj = { from: from, to: to };
    if (promotion) moveObj.promotion = promotion;

    // Track capture before making move
    const captured = chess.get(to);
    const movingPiece = chess.get(from);

    const result = chess.move(moveObj);
    if (!result) return;

    // Track en passant capture
    if (result.flags && result.flags.includes('e')) {
        const epSquare = to[0] + from[1]; // en passant captured pawn's square
        if (pieceMeshes[epSquare]) {
            piecesGroup.remove(pieceMeshes[epSquare]);
            delete pieceMeshes[epSquare];
        }
    }

    // Track captured pieces for display
    if (result.captured) {
        const capturedColor = movingPiece.color === 'w' ? 'b' : 'w';
        const capturedKey = capturedColor + result.captured;
        if (capturedColor === 'w') {
            capturedWhite.push(capturedKey);
        } else {
            capturedBlack.push(capturedKey);
        }
    }

    // Animate move
    animateMove(from, to, result);

    // Update last move highlights
    lastMoveSquares = [from, to];

    clearSelection();
    updateUI();
}

function animateMove(from, to, moveResult) {
    animating = true;
    const piece = pieceMeshes[from];
    if (!piece) { animating = false; return; }

    // Remove captured piece
    if (pieceMeshes[to]) {
        piecesGroup.remove(pieceMeshes[to]);
        delete pieceMeshes[to];
    }

    const startPos = piece.position.clone();
    const endPos = squareToWorldPos(to);
    const duration = 300; // ms
    const startTime = performance.now();

    // Lift arc
    const distance = startPos.distanceTo(endPos);
    const liftHeight = Math.min(distance * 0.3, 0.8);

    function animStep(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

        piece.position.x = startPos.x + (endPos.x - startPos.x) * eased;
        piece.position.z = startPos.z + (endPos.z - startPos.z) * eased;
        piece.position.y = startPos.y + liftHeight * Math.sin(t * Math.PI);

        if (t < 1) {
            requestAnimationFrame(animStep);
        } else {
            piece.position.copy(endPos);
            piece.position.y = 0;

            // Update piece tracking
            delete pieceMeshes[from];
            pieceMeshes[to] = piece;
            piece.userData.square = to;

            // Handle castling - move the rook
            if (moveResult.flags && (moveResult.flags.includes('k') || moveResult.flags.includes('q'))) {
                handleCastlingRook(moveResult);
            }

            // Handle promotion - replace piece
            if (moveResult.flags && moveResult.flags.includes('p')) {
                handlePromotionPiece(to, moveResult);
            }

            animating = false;
        }
    }

    requestAnimationFrame(animStep);
}

function handleCastlingRook(moveResult) {
    let rookFrom, rookTo;
    if (moveResult.flags.includes('k')) {
        // Kingside
        rookFrom = moveResult.color === 'w' ? 'h1' : 'h8';
        rookTo = moveResult.color === 'w' ? 'f1' : 'f8';
    } else {
        // Queenside
        rookFrom = moveResult.color === 'w' ? 'a1' : 'a8';
        rookTo = moveResult.color === 'w' ? 'd1' : 'd8';
    }

    const rook = pieceMeshes[rookFrom];
    if (rook) {
        const targetPos = squareToWorldPos(rookTo);
        rook.position.copy(targetPos);
        rook.position.y = 0;
        delete pieceMeshes[rookFrom];
        pieceMeshes[rookTo] = rook;
        rook.userData.square = rookTo;
    }
}

function handlePromotionPiece(square, moveResult) {
    const color = moveResult.color === 'w' ? 'white' : 'black';
    const oldPiece = pieceMeshes[square];
    if (oldPiece) piecesGroup.remove(oldPiece);

    const newPiece = createPiece(moveResult.promotion, color);
    const pos = squareToWorldPos(square);
    newPiece.position.copy(pos);
    newPiece.castShadow = true;
    newPiece.userData.square = square;
    newPiece.userData.color = moveResult.color;
    newPiece.userData.type = moveResult.promotion;
    if (moveResult.color === 'b') newPiece.rotation.y = Math.PI;

    piecesGroup.add(newPiece);
    pieceMeshes[square] = newPiece;
}

// ==================== Promotion ====================

function promoteToChoice(pieceType) {
    if (!pendingPromotion) return;
    document.getElementById('promotion-modal').classList.add('hidden');
    makeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
    pendingPromotion = null;
}

// ==================== UI Updates ====================

function updateUI() {
    // Turn indicator
    const turnText = document.getElementById('turn-text');
    const turnDot = document.getElementById('turn-dot');
    const isWhite = chess.turn() === 'w';
    turnText.textContent = isWhite ? "White's Turn" : "Black's Turn";
    turnDot.className = isWhite ? 'white' : 'black';

    // Status message
    const statusMsg = document.getElementById('status-message');
    if (chess.in_checkmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        statusMsg.textContent = 'Checkmate! ' + winner + ' wins!';
        statusMsg.style.color = '#ff4444';
    } else if (chess.in_stalemate()) {
        statusMsg.textContent = 'Stalemate! Draw.';
        statusMsg.style.color = '#ffaa44';
    } else if (chess.in_draw()) {
        statusMsg.textContent = 'Draw!';
        statusMsg.style.color = '#ffaa44';
    } else if (chess.in_threefold_repetition()) {
        statusMsg.textContent = 'Draw by repetition!';
        statusMsg.style.color = '#ffaa44';
    } else if (chess.in_check()) {
        statusMsg.textContent = 'Check!';
        statusMsg.style.color = '#ffd700';
        highlightKingInCheck();
    } else {
        statusMsg.textContent = '';
    }

    // Move history
    updateMoveHistory();

    // Captured pieces
    updateCapturedPieces();
}

function updateMoveHistory() {
    const history = chess.history();
    const container = document.getElementById('move-history');
    container.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const row = document.createElement('div');
        row.className = 'move-row';

        const numSpan = document.createElement('span');
        numSpan.className = 'move-number';
        numSpan.textContent = moveNum + '.';
        row.appendChild(numSpan);

        const whiteSpan = document.createElement('span');
        whiteSpan.className = 'move-white';
        whiteSpan.textContent = history[i];
        row.appendChild(whiteSpan);

        if (history[i + 1]) {
            const blackSpan = document.createElement('span');
            blackSpan.className = 'move-black';
            blackSpan.textContent = history[i + 1];
            row.appendChild(blackSpan);
        }

        container.appendChild(row);
    }

    container.scrollTop = container.scrollHeight;
}

function updateCapturedPieces() {
    const blackList = document.getElementById('black-captured-list');
    const whiteList = document.getElementById('white-captured-list');

    blackList.innerHTML = capturedBlack.map(function(p) {
        return '<span>' + (PIECE_UNICODE[p] || p) + '</span>';
    }).join('');

    whiteList.innerHTML = capturedWhite.map(function(p) {
        return '<span>' + (PIECE_UNICODE[p] || p) + '</span>';
    }).join('');
}

// ==================== Game Controls ====================

function resetGame() {
    chess.reset();
    selectedSquare = null;
    legalMoveSquares = [];
    capturedWhite = [];
    capturedBlack = [];
    lastMoveSquares = [];
    pendingPromotion = null;

    clearSelection();
    syncPiecesToBoard();
    updateUI();
}

function undoMove() {
    const move = chess.undo();
    if (move) {
        // Restore captured piece to the list
        if (move.captured) {
            const capturedColor = move.color === 'w' ? 'b' : 'w';
            const capturedKey = capturedColor + move.captured;
            if (capturedColor === 'w') {
                const idx = capturedWhite.lastIndexOf(capturedKey);
                if (idx !== -1) capturedWhite.splice(idx, 1);
            } else {
                const idx = capturedBlack.lastIndexOf(capturedKey);
                if (idx !== -1) capturedBlack.splice(idx, 1);
            }
        }

        lastMoveSquares = [];
        clearSelection();
        syncPiecesToBoard();
        updateUI();
    }
}

function flipBoard() {
    boardFlipped = !boardFlipped;
    // Rotate orbit controls theta by PI to flip the view
    if (window.orbitSpherical) {
        window.orbitSpherical.target.theta += Math.PI;
    }
}

// ==================== Orbit Controls (Simple) ====================

function setupOrbitControls() {
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let spherical = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 };
    let targetSpherical = { ...spherical };

    // Expose for flipBoard
    window.orbitSpherical = { current: spherical, target: targetSpherical };

    function updateCamera() {
        spherical.radius += (targetSpherical.radius - spherical.radius) * 0.1;
        spherical.theta += (targetSpherical.theta - spherical.theta) * 0.1;
        spherical.phi += (targetSpherical.phi - spherical.phi) * 0.1;

        camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = spherical.radius * Math.cos(spherical.phi);
        camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(0, 0, 0);
    }

    renderer.domElement.addEventListener('mousedown', function(e) {
        if (e.button === 2 || e.button === 1) {
            isDragging = true;
            previousMouse = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    });

    renderer.domElement.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const deltaX = e.clientX - previousMouse.x;
            const deltaY = e.clientY - previousMouse.y;

            targetSpherical.theta -= deltaX * 0.005;
            targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2 - 0.05, targetSpherical.phi + deltaY * 0.005));

            previousMouse = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', function() {
        isDragging = false;
    });

    renderer.domElement.addEventListener('wheel', function(e) {
        targetSpherical.radius = Math.max(6, Math.min(25, targetSpherical.radius + e.deltaY * 0.01));
        e.preventDefault();
    }, { passive: false });

    renderer.domElement.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Store update function for animation loop
    window.updateOrbitControls = updateCamera;
}

// ==================== Mouse Hover ====================

let hoveredSquare = null;

function onMouseMove(event) {
    const sq = getSquareFromMouse(event);

    if (sq !== hoveredSquare) {
        // Reset cursor
        renderer.domElement.style.cursor = 'default';

        if (sq) {
            const piece = chess.get(sq);
            if (selectedSquare) {
                const isLegal = legalMoveSquares.some(function(m) { return m.to === sq; });
                if (isLegal) {
                    renderer.domElement.style.cursor = 'pointer';
                } else if (piece && piece.color === chess.turn()) {
                    renderer.domElement.style.cursor = 'pointer';
                }
            } else if (piece && piece.color === chess.turn()) {
                renderer.domElement.style.cursor = 'pointer';
            }
        }

        hoveredSquare = sq;
    }
}

// ==================== Window Resize ====================

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== Animation Loop ====================

function animate() {
    requestAnimationFrame(animate);

    if (window.updateOrbitControls) {
        window.updateOrbitControls();
    }

    renderer.render(scene, camera);
}

// Make functions available globally for HTML buttons
window.resetGame = resetGame;
window.undoMove = undoMove;
window.flipBoard = flipBoard;
window.promoteToChoice = promoteToChoice;
