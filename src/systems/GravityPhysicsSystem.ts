import * as THREE from 'three';

import { GravitationalNode } from '../components/GravitationalNode';

export interface CollisionEvent {
  aId: string;
  bId: string;
  strength: number;
  distance: number;
  position: THREE.Vector3;
}

export class GravityPhysicsSystem {
  public static readonly MAX_ACTIVE_NODES = 47;
  public static readonly COLLISION_DISTANCE = 0.15;

  private readonly attractionStrength = 0.065;
  private readonly damping = 0.98;
  private collisionIndex = 0;

  public update(nodes: GravitationalNode[], deltaSeconds: number): CollisionEvent[] {
    const activeNodes = nodes.filter((node) => node.isActive).slice(0, GravityPhysicsSystem.MAX_ACTIVE_NODES);
    const collisions: CollisionEvent[] = [];

    for (let i = 0; i < activeNodes.length; i += 1) {
      const current = activeNodes[i];

      for (let j = i + 1; j < activeNodes.length; j += 1) {
        const other = activeNodes[j];
        const delta = other.mesh.position.clone().sub(current.mesh.position);
        const distanceSq = delta.lengthSq();
        const distance = Math.sqrt(distanceSq) || 0.0001;
        const collisionDistance = GravityPhysicsSystem.COLLISION_DISTANCE;

        if (distance < collisionDistance) {
          const force = (collisionDistance - distance) * 0.15;
          const direction = delta.normalize();

          current.applyImpulse(direction.clone().multiplyScalar(-force));
          other.applyImpulse(direction.clone().multiplyScalar(force));

          collisions.push({
            aId: current.id,
            bId: other.id,
            strength: force,
            distance,
            position: current.mesh.position.clone().add(other.mesh.position).multiplyScalar(0.5),
          });
        }

        const attraction = Math.min(0.02, this.attractionStrength / (distance + 0.1));
        const attractionVector = delta.normalize().multiplyScalar(attraction * deltaSeconds * 60);
        current.applyImpulse(attractionVector.clone());
        other.applyImpulse(attractionVector.clone().multiplyScalar(-1));
      }

      current.velocity.multiplyScalar(this.damping);
      current.velocity.clampLength(0, 0.08);
    }

    this.collisionIndex += 1;
    return collisions;
  }
}
