import * as THREE from 'three';

export interface SemanticNodeData {
  id: string;
  mass: number;
  semanticVector: number[];
  label: string;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  metadata?: Record<string, unknown>;
}

export class GravitationalNode {
  public readonly id: string;
  public mass: number;
  public semanticVector: number[];
  public label: string;
  public velocity: THREE.Vector3;
  public position: THREE.Vector3;
  public metadata: Record<string, unknown>;
  public mesh: THREE.Mesh;
  public isActive = true;

  constructor(data: SemanticNodeData) {
    this.id = data.id;
    this.mass = data.mass;
    this.semanticVector = [...data.semanticVector];
    this.label = data.label;
    this.velocity = data.velocity.clone();
    this.position = data.position.clone();
    this.metadata = data.metadata ?? {};

    const geometry = new THREE.SphereGeometry(0.06 + this.mass * 0.02, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#1d4ed8',
      emissiveIntensity: 0.4,
      metalness: 0.35,
      roughness: 0.25,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.userData.nodeId = this.id;
  }

  public updateVisuals(): void {
    this.mesh.position.addScaledVector(this.velocity, 1);
    this.mesh.scale.setScalar(1 + this.mass * 0.12);
    this.mesh.rotation.x += 0.01;
    this.mesh.rotation.y += 0.015;
  }

  public applyImpulse(force: THREE.Vector3): void {
    this.velocity.addScaledVector(force, 1 / Math.max(this.mass, 0.2));
  }

  public setSemanticVector(vector: number[]): void {
    this.semanticVector = Array.from(vector).slice(0, 3);
    const colorScale = vector[0] ?? 0.5;
    const hue = 0.56 + colorScale * 0.22;
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.color.setHSL(hue, 0.75, 0.62);
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    this.isActive = visible;
  }
}
