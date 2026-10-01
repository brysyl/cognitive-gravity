import * as THREE from 'three';

import { GravitationalNode, type SemanticNodeData } from './components/GravitationalNode';
import { GravityPhysicsSystem } from './systems/GravityPhysicsSystem';
import { HandInteractionSystem } from './systems/HandInteractionSystem';
import { WebSocketClient } from './services/WebSocketClient';

const appRoot = document.getElementById('app');
if (!appRoot) throw new Error('Missing root element #app');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#070b17');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 50);
camera.position.set(0, 1.6, 2.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor('#070b17');
appRoot.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const pointLight = new THREE.PointLight(0x7ec8ff, 1.1, 10);
pointLight.position.set(0, 1.6, 1.0);
scene.add(pointLight);

const gravitySystem = new GravityPhysicsSystem();
const handSystem = new HandInteractionSystem();
const nodes: GravitationalNode[] = [];

function createNode(label: string, semanticVector: number[], position: THREE.Vector3): GravitationalNode {
  const nodeData: SemanticNodeData = {
    id: `${label}-${Math.random().toString(36).slice(2, 9)}`,
    mass: 1 + Math.random() * 0.8,
    semanticVector,
    label,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
    ),
    position,
    metadata: { cluster: 'default' },
  };

  const node = new GravitationalNode(nodeData);
  scene.add(node.mesh);
  nodes.push(node);
  return node;
}

const firstNode = createNode('Cognition', [1, 0.3, 0.5], new THREE.Vector3(-0.22, 0.1, -0.15));
const secondNode = createNode('Motion', [0.7, 1, 0.2], new THREE.Vector3(0.17, -0.08, -0.12));
const thirdNode = createNode('Narrative', [0.2, 0.7, 1], new THREE.Vector3(0.03, 0.18, -0.24));

const wsClient = new WebSocketClient('ws://localhost:8080/ws/synthesis');
wsClient.on('open', () => console.info('Backend websocket connected'));
wsClient.on('message', (message) => console.info('Synthesis message:', message));
wsClient.connect();

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  gravitySystem.update(nodes, dt);

  handSystem.update(
    {
      left: {
        indexTip: new THREE.Vector3(-0.08, 0.03, -0.12),
        thumbTip: new THREE.Vector3(-0.02, 0.1, -0.12),
      },
      right: {
        indexTip: new THREE.Vector3(0.08, 0.03, -0.12),
        thumbTip: new THREE.Vector3(0.02, 0.1, -0.12),
      },
    },
    nodes,
  );

  for (const node of nodes) {
    node.updateVisuals();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const orbitTarget = new THREE.Vector3(0, 0, -0.1);
camera.lookAt(orbitTarget);

animate();

firstNode.setSemanticVector([1, 0.3, 0.6]);
secondNode.setSemanticVector([0.8, 1, 0.28]);
thirdNode.setSemanticVector([0.2, 0.7, 1]);

console.info('Cognitive Gravity runtime initialized.');
