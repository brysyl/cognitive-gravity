import * as THREE from 'three';

import { GravitationalNode } from '../components/GravitationalNode';

export interface HandPose {
  indexTip: THREE.Vector3;
  thumbTip: THREE.Vector3;
}

export interface HandFrameLike {
  left?: HandPose;
  right?: HandPose;
}

export class HandInteractionSystem {
  public readonly pinchThreshold = 0.04;
  public readonly pullActivationDistance = 0.18;

  private pinchHistory = new Map<string, { start: THREE.Vector3; current: THREE.Vector3; active: boolean }>();

  public update(frame: HandFrameLike, nodes: GravitationalNode[]): void {
    for (const handKey of ['left', 'right'] as const) {
      const hand = frame[handKey];
      if (!hand) continue;

      const pinchDistance = hand.indexTip.distanceTo(hand.thumbTip);
      const center = hand.indexTip.clone().add(hand.thumbTip).multiplyScalar(0.5);

      if (pinchDistance <= this.pinchThreshold) {
        const nearestNode = this.findNearestNode(center, nodes);
        if (nearestNode) {
          this.pinchHistory.set(`${handKey}-pinch`, {
            start: center.clone(),
            current: center.clone(),
            active: true,
          });
          nearestNode.setVisible(true);
          nearestNode.applyImpulse(new THREE.Vector3(0, 0.015, 0));
        }
      } else {
        const previous = this.pinchHistory.get(`${handKey}-pinch`);
        if (previous?.active) {
          const delta = center.distanceTo(previous.start);
          if (delta > this.pullActivationDistance) {
            const nearestNode = this.findNearestNode(center, nodes);
            if (nearestNode) {
              nearestNode.metadata = {
                ...nearestNode.metadata,
                inspected: true,
                pullDistance: delta,
                gesture: 'pull-apart',
              };
              nearestNode.setSemanticVector([1, 1, 0.8]);
            }
          }
          previous.active = false;
        }
      }
    }
  }

  private findNearestNode(position: THREE.Vector3, nodes: GravitationalNode[]): GravitationalNode | null {
    let closest: GravitationalNode | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const node of nodes) {
      const distance = node.mesh.position.distanceTo(position);
      if (distance < minDistance && node.isActive) {
        minDistance = distance;
        closest = node;
      }
    }

    return closest;
  }
}
