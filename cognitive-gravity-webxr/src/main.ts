import WebXRPolyfill from 'webxr-polyfill';
new WebXRPolyfill();

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

const BACKEND_URL = 'https://cognitive-gravity-backend-x2n3kru2ja-uc.a.run.app';

interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  category?: string;
  isSynthesized?: boolean;
}

// 1. HUD Overlay
const infoCard = document.createElement('div');
infoCard.id = 'node-info-card';
infoCard.style.position = 'absolute';
infoCard.style.top = '20px';
infoCard.style.left = '20px';
infoCard.style.padding = '12px 16px';
infoCard.style.background = 'rgba(5, 10, 25, 0.88)';
infoCard.style.color = '#00ff88';
infoCard.style.fontFamily = 'monospace';
infoCard.style.fontSize = '13px';
infoCard.style.borderRadius = '8px';
infoCard.style.border = '1px solid #00ff88';
infoCard.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.2)';
infoCard.style.pointerEvents = 'none';
infoCard.style.zIndex = '1000';
infoCard.innerHTML = '<strong>Cognitive Gravity WebXR</strong><br/>Drag or pinch two nodes together to collide & synthesize.';
document.body.appendChild(infoCard);

// 2. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03030c);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Enable Hand-Tracking Feature Request
document.body.appendChild(VRButton.createButton(renderer, {
  optionalFeatures: ['hand-tracking']
}));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(3, 5, 3);
scene.add(dirLight, new THREE.AmbientLight(0x223355, 1.5));

// 3. Native Quest Hand Models
const handModelFactory = new XRHandModelFactory();
const hand1 = renderer.xr.getHand(0);
const hand2 = renderer.xr.getHand(1);

hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));

scene.add(hand1);
scene.add(hand2);

// 4. State & Node Store
const nodeMeshes: THREE.Mesh[] = [];
const activeCollisions = new Set<string>();
let constellationLines: THREE.LineSegments | null = null;

const INITIAL_NODES: NodeData[] = [
  { id: 'vec-001', label: 'RevOps Engine', x: -0.5, y: 1.5, z: -1.2, category: 'Infrastructure' },
  { id: 'vec-002', label: 'BioMesh Telemetry', x: 0.5, y: 1.5, z: -1.2, category: 'Biometrics' },
  { id: 'vec-003', label: 'Zero-Trust Protocol', x: 1.2, y: 1.1, z: -1.8, category: 'Governance' },
  { id: 'vec-004', label: 'AST Code Graph', x: -1.2, y: 1.0, z: -1.8, category: 'GraphWard' },
];

// 5. Dynamic Constellations
function buildConstellations() {
  if (constellationLines) scene.remove(constellationLines);

  const points: THREE.Vector3[] = [];
  const maxDistance = 2.2;

  for (let i = 0; i < nodeMeshes.length; i++) {
    for (let j = i + 1; j < nodeMeshes.length; j++) {
      const p1 = nodeMeshes[i].position;
      const p2 = nodeMeshes[j].position;
      if (p1.distanceTo(p2) <= maxDistance) {
        points.push(p1.clone(), p2.clone());
      }
    }
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.35
  });

  constellationLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(constellationLines);
}

// 6. Spawn Node Helper
function spawnNode(node: NodeData, isNew = false) {
  const geometry = new THREE.SphereGeometry(node.isSynthesized ? 0.22 : 0.18, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: node.isSynthesized ? 0xff00ea : 0x00ff88,
    wireframe: true,
    roughness: 0.2,
    metalness: 0.9
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(node.x, node.y, node.z);
  mesh.userData = node;

  if (isNew) {
    mesh.scale.set(0.1, 0.1, 0.1);
  }

  scene.add(mesh);
  nodeMeshes.push(mesh);
  buildConstellations();
  return mesh;
}

// 7. Node Collision & AI Synthesis Trigger
async function triggerSynthesis(meshA: THREE.Mesh, meshB: THREE.Mesh) {
  const dataA = meshA.userData as NodeData;
  const dataB = meshB.userData as NodeData;

  const pairKey = [dataA.id, dataB.id].sort().join('::');
  if (activeCollisions.has(pairKey)) return;
  activeCollisions.add(pairKey);

  infoCard.innerHTML = `<strong style="color:#ffaa00;">Synthesizing Concept...</strong><br/>Merging ${dataA.label} + ${dataB.label}`;

  const midPoint = new THREE.Vector3().addVectors(meshA.position, meshB.position).multiplyScalar(0.5);

  let synthResult: NodeData = {
    id: `synth-${Date.now()}`,
    label: `${dataA.label} × ${dataB.label}`,
    x: midPoint.x,
    y: midPoint.y,
    z: midPoint.z,
    category: 'AI Synthesizer',
    isSynthesized: true
  };

  try {
    const res = await fetch(`${BACKEND_URL}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_a_id: dataA.id, node_b_id: dataB.id })
    });
    if (res.ok) {
      const apiData = await res.json();
      if (apiData.label) synthResult.label = apiData.label;
    }
  } catch (err) {
    console.warn('Backend endpoint offline, spawning spatial fallback', err);
  }

  spawnNode(synthResult, true);
  infoCard.innerHTML = `<strong style="color:#ff00ea;">Synthesized: ${synthResult.label}</strong><br/>Created at [${midPoint.x.toFixed(2)}, ${midPoint.y.toFixed(2)}, ${midPoint.z.toFixed(2)}]`;
}

function checkNodeCollisions() {
  const collisionThreshold = 0.35;
  for (let i = 0; i < nodeMeshes.length; i++) {
    for (let j = i + 1; j < nodeMeshes.length; j++) {
      const dist = nodeMeshes[i].position.distanceTo(nodeMeshes[j].position);
      if (dist < collisionThreshold) {
        triggerSynthesis(nodeMeshes[i], nodeMeshes[j]);
      }
    }
  }
}

// 8. Touch / Pointer Drag Mechanics
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let draggedMesh: THREE.Mesh | null = null;

function onPointerDown(e: MouseEvent | TouchEvent) {
  let cx = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
  let cy = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;

  pointer.x = (cx / window.innerWidth) * 2 - 1;
  pointer.y = -(cy / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(nodeMeshes);
  if (intersects.length > 0) {
    draggedMesh = intersects[0].object as THREE.Mesh;
    controls.enabled = false;
  }
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  if (!draggedMesh) return;
  let cx = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
  let cy = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;

  pointer.x = (cx / window.innerWidth) * 2 - 1;
  pointer.y = -(cy / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const targetPos = new THREE.Vector3();
  raycaster.ray.at(2.2, targetPos);
  draggedMesh.position.copy(targetPos);
  buildConstellations();
}

function onPointerUp() {
  draggedMesh = null;
  controls.enabled = true;
}

window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

// 9. Bare Hand Pinch Vectors (Quest XRHand)
function checkHandPinches(hand: THREE.Group) {
  const joints = (hand as any).joints;
  if (!joints || !joints['index-finger-tip'] || !joints['thumb-tip']) return;

  const indexTip = joints['index-finger-tip'].position;
  const thumbTip = joints['thumb-tip'].position;
  const pinchDistance = indexTip.distanceTo(thumbTip);

  if (pinchDistance < 0.03) { // Finger pinch threshold (3cm)
    const pinchMidpoint = new THREE.Vector3().addVectors(indexTip, thumbTip).multiplyScalar(0.5);
    for (const mesh of nodeMeshes) {
      if (mesh.position.distanceTo(pinchMidpoint) < 0.25) {
        mesh.position.copy(pinchMidpoint);
        buildConstellations();
        break;
      }
    }
  }
}

// Initialize Initial Node Set
INITIAL_NODES.forEach((n) => spawnNode(n));

// 10. Animation & Interaction Loop
renderer.setAnimationLoop(() => {
  nodeMeshes.forEach((mesh) => {
    mesh.rotation.y += 0.01;
    if ((mesh.userData as NodeData).isSynthesized && mesh.scale.x < 1.0) {
      mesh.scale.addScalar(0.04); // Pulsing entrance animation
    }
  });

  if (renderer.xr.isPresenting) {
    checkHandPinches(hand1);
    checkHandPinches(hand2);
  }

  checkNodeCollisions();
  controls.update();
  renderer.render(scene, camera);
});
