/**
 * 3D Chess Piece Factory
 * Creates detailed 3D chess pieces using Three.js geometries via lathe/extrude.
 */

const PIECE_SCALE = 0.38;

const PIECE_MATERIALS = {
    white: {
        body: new THREE.MeshStandardMaterial({
            color: 0xf5f0e8,
            roughness: 0.3,
            metalness: 0.1,
        }),
        accent: new THREE.MeshStandardMaterial({
            color: 0xe8e0d0,
            roughness: 0.4,
            metalness: 0.05,
        }),
    },
    black: {
        body: new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.25,
            metalness: 0.2,
        }),
        accent: new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.35,
            metalness: 0.15,
        }),
    },
};

const HIGHLIGHT_MATERIALS = {
    selected: new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0xffd700,
        emissiveIntensity: 0.3,
    }),
};

function createLatheProfile(points, segments) {
    const vec2Points = points.map(p => new THREE.Vector2(p[0], p[1]));
    return new THREE.LatheGeometry(vec2Points, segments || 24);
}

function createPawn(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    // Base
    const baseProfile = [
        [0, 0], [0.45, 0], [0.45, 0.08], [0.4, 0.12],
        [0.28, 0.15], [0.22, 0.2], [0.2, 0.5],
        [0.18, 0.55], [0.22, 0.6], [0.22, 0.65],
        [0.18, 0.7], [0.15, 0.8],
    ];
    const baseGeom = createLatheProfile(baseProfile, 20);
    const baseMesh = new THREE.Mesh(baseGeom, mat);
    group.add(baseMesh);

    // Head sphere
    const headGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const head = new THREE.Mesh(headGeom, mat);
    head.position.y = 0.95;
    group.add(head);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'p';
    return group;
}

function createRook(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    // Base and tower
    const profile = [
        [0, 0], [0.5, 0], [0.5, 0.1], [0.42, 0.15],
        [0.3, 0.18], [0.25, 0.25], [0.23, 0.7],
        [0.28, 0.75], [0.3, 0.8], [0.3, 1.0],
        [0.35, 1.0], [0.35, 1.15], [0.25, 1.15], [0.25, 1.05],
        [0.15, 1.05], [0.15, 1.15], [0, 1.15],
    ];
    const geom = createLatheProfile(profile, 4);
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'r';
    return group;
}

function createKnight(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    // Base
    const baseProfile = [
        [0, 0], [0.5, 0], [0.5, 0.1], [0.42, 0.15],
        [0.28, 0.18], [0.24, 0.25], [0.22, 0.4], [0, 0.4],
    ];
    const baseGeom = createLatheProfile(baseProfile, 20);
    const baseMesh = new THREE.Mesh(baseGeom, mat);
    group.add(baseMesh);

    // Knight head - using a box + sphere combo for a stylized look
    const headShape = new THREE.Shape();
    headShape.moveTo(0, 0.4);
    headShape.lineTo(0.18, 0.4);
    headShape.bezierCurveTo(0.25, 0.5, 0.28, 0.7, 0.22, 0.9);
    headShape.bezierCurveTo(0.2, 1.0, 0.25, 1.1, 0.3, 1.15);
    headShape.bezierCurveTo(0.32, 1.2, 0.2, 1.3, 0.1, 1.35);
    headShape.bezierCurveTo(0.0, 1.38, -0.1, 1.35, -0.15, 1.25);
    headShape.bezierCurveTo(-0.2, 1.15, -0.18, 1.0, -0.15, 0.85);
    headShape.bezierCurveTo(-0.13, 0.7, -0.12, 0.5, -0.1, 0.4);
    headShape.lineTo(0, 0.4);

    const extrudeSettings = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 };
    const headGeom = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    const headMesh = new THREE.Mesh(headGeom, mat);
    headMesh.position.z = -0.125;
    group.add(headMesh);

    // Ear
    const earGeom = new THREE.ConeGeometry(0.06, 0.15, 8);
    const ear = new THREE.Mesh(earGeom, mat);
    ear.position.set(0.05, 1.3, 0);
    ear.rotation.z = -0.3;
    group.add(ear);

    // Eye
    const eyeGeom = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: color === 'white' ? 0x222222 : 0xcccccc });
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(0.15, 1.15, 0.13);
    group.add(eye);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'n';
    return group;
}

function createBishop(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    const profile = [
        [0, 0], [0.48, 0], [0.48, 0.08], [0.4, 0.13],
        [0.28, 0.16], [0.22, 0.22], [0.2, 0.5],
        [0.18, 0.55], [0.22, 0.6], [0.22, 0.65],
        [0.18, 0.7], [0.15, 0.8], [0.2, 0.9],
        [0.18, 1.0], [0.12, 1.1], [0.06, 1.2],
        [0.02, 1.3], [0, 1.35],
    ];
    const geom = createLatheProfile(profile, 20);
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Top ball
    const ballGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const ball = new THREE.Mesh(ballGeom, mat);
    ball.position.y = 1.4;
    group.add(ball);

    // Slit on bishop hat
    const slitGeom = new THREE.BoxGeometry(0.22, 0.02, 0.04);
    const slitMat = new THREE.MeshStandardMaterial({ color: color === 'white' ? 0x888888 : 0x555555 });
    const slit = new THREE.Mesh(slitGeom, slitMat);
    slit.position.set(0, 1.15, 0.1);
    slit.rotation.z = 0.5;
    group.add(slit);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'b';
    return group;
}

function createQueen(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    const profile = [
        [0, 0], [0.52, 0], [0.52, 0.1], [0.44, 0.15],
        [0.32, 0.18], [0.26, 0.25], [0.24, 0.5],
        [0.22, 0.55], [0.26, 0.6], [0.26, 0.68],
        [0.22, 0.73], [0.18, 0.85], [0.22, 0.95],
        [0.2, 1.1], [0.15, 1.25], [0.1, 1.4],
        [0.08, 1.5], [0.12, 1.55], [0.1, 1.6],
        [0.05, 1.62], [0, 1.63],
    ];
    const geom = createLatheProfile(profile, 24);
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Crown points
    const crownMat = PIECE_MATERIALS[color].accent;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const pointGeom = new THREE.SphereGeometry(0.04, 8, 8);
        const point = new THREE.Mesh(pointGeom, crownMat);
        point.position.set(
            Math.cos(angle) * 0.1,
            1.6,
            Math.sin(angle) * 0.1
        );
        group.add(point);
    }

    // Top orb
    const orbGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const orb = new THREE.Mesh(orbGeom, mat);
    orb.position.y = 1.68;
    group.add(orb);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'q';
    return group;
}

function createKing(color) {
    const group = new THREE.Group();
    const mat = PIECE_MATERIALS[color].body;

    const profile = [
        [0, 0], [0.52, 0], [0.52, 0.1], [0.44, 0.15],
        [0.32, 0.18], [0.26, 0.25], [0.24, 0.5],
        [0.22, 0.55], [0.26, 0.6], [0.26, 0.68],
        [0.22, 0.73], [0.18, 0.85], [0.22, 0.95],
        [0.2, 1.1], [0.15, 1.3], [0.12, 1.45],
        [0.1, 1.55], [0.14, 1.6], [0.12, 1.65],
        [0.06, 1.68], [0, 1.7],
    ];
    const geom = createLatheProfile(profile, 24);
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Cross on top
    const crossVertGeom = new THREE.BoxGeometry(0.04, 0.22, 0.04);
    const crossVert = new THREE.Mesh(crossVertGeom, mat);
    crossVert.position.y = 1.82;
    group.add(crossVert);

    const crossHorizGeom = new THREE.BoxGeometry(0.16, 0.04, 0.04);
    const crossHoriz = new THREE.Mesh(crossHorizGeom, mat);
    crossHoriz.position.y = 1.86;
    group.add(crossHoriz);

    group.scale.setScalar(PIECE_SCALE);
    group.userData.pieceType = 'k';
    return group;
}

function createPiece(type, color) {
    switch (type) {
        case 'p': return createPawn(color);
        case 'r': return createRook(color);
        case 'n': return createKnight(color);
        case 'b': return createBishop(color);
        case 'q': return createQueen(color);
        case 'k': return createKing(color);
        default: return null;
    }
}

function setPieceMaterial(pieceGroup, material) {
    pieceGroup.traverse(function(child) {
        if (child.isMesh) {
            child.userData.originalMaterial = child.userData.originalMaterial || child.material;
            child.material = material;
        }
    });
}

function resetPieceMaterial(pieceGroup) {
    pieceGroup.traverse(function(child) {
        if (child.isMesh && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
        }
    });
}

// Unicode symbols for captured pieces display
const PIECE_UNICODE = {
    'wp': '\u2659', 'wr': '\u2656', 'wn': '\u2658',
    'wb': '\u2657', 'wq': '\u2655', 'wk': '\u2654',
    'bp': '\u265F', 'br': '\u265C', 'bn': '\u265E',
    'bb': '\u265D', 'bq': '\u265B', 'bk': '\u265A',
};
