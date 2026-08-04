// Three.js scene: renderer, camera, lights, majlis table.
import * as THREE from 'three';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15100c');
  scene.fog = new THREE.Fog('#15100c', 18, 32);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 8.4, 7.2);
  camera.lookAt(0, 0, -0.4);

  // Lighting.
  scene.add(new THREE.AmbientLight('#fff2d6', 0.55));
  const key = new THREE.DirectionalLight('#fff0cc', 1.15);
  key.position.set(4, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.PointLight('#e9c46a', 0.5, 40);
  rim.position.set(-6, 5, -6);
  scene.add(rim);

  // Floor (majlis carpet).
  const floorTex = makeCarpetTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  floor.receiveShadow = true;
  scene.add(floor);

  // Table: round green-felt top with wooden rim.
  const table = new THREE.Group();
  const feltMat = new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 0.9 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.35, 64), feltMat);
  top.position.y = -0.18; top.receiveShadow = true;
  table.add(top);
  const rimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(6.4, 0.42, 20, 80),
    new THREE.MeshStandardMaterial({ color: '#4a2f1b', roughness: 0.5, metalness: 0.1 })
  );
  rimMesh.rotation.x = Math.PI / 2; rimMesh.position.y = -0.05;
  rimMesh.castShadow = true; rimMesh.receiveShadow = true;
  table.add(rimMesh);
  scene.add(table);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera };
}

function makeCarpetTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#5a1a1a'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#8a2c2c'; ctx.lineWidth = 6;
  for (let i = 0; i < 512; i += 64) { ctx.strokeRect(i, 0, 0, 512); ctx.strokeRect(0, i, 512, 0); }
  ctx.strokeStyle = '#c99a3a'; ctx.lineWidth = 3;
  for (let i = 32; i < 512; i += 64)
    for (let j = 32; j < 512; j += 64) {
      ctx.beginPath();
      ctx.moveTo(i, j - 14); ctx.lineTo(i + 14, j); ctx.lineTo(i, j + 14); ctx.lineTo(i - 14, j);
      ctx.closePath(); ctx.stroke();
    }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFeltTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 150);
  g.addColorStop(0, '#1f7d4a'); g.addColorStop(1, '#0e5230');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
