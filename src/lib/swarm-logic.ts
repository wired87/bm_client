import * as THREE from 'three';
import type { SwarmParams, Bounds } from '@/components/swarm-scape/types';

export class Boid {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mesh: THREE.Mesh;
  params: SwarmParams;
  bounds: Bounds;

  constructor(x: number, y: number, z: number, params: SwarmParams, bounds: Bounds) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    this.velocity.setLength(Math.random() * (params.speedLimit / 2) + (params.speedLimit / 2));
    this.acceleration = new THREE.Vector3();
    this.params = params;
    this.bounds = bounds;

    const geometry = new THREE.ConeGeometry(0.3, 1, 8); // Base radius, height, radial segments
    geometry.rotateX(Math.PI / 2); // Point cone along Z-axis initially
    const material = new THREE.MeshStandardMaterial({ color: 0x64B5F6, emissive: 0x26A69A, emissiveIntensity: 0.3 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
  }

  update(boids: Boid[]) {
    this.flock(boids);
    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, this.params.speedLimit);
    this.position.add(this.velocity);
    this.acceleration.multiplyScalar(0);
    this.checkBounds();

    this.mesh.position.copy(this.position);
    // Orient boid to face its velocity vector
    if (this.velocity.lengthSq() > 0.0001) {
      this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.velocity.clone().normalize());
    }
  }

  applyForce(force: THREE.Vector3) {
    this.acceleration.add(force);
  }

  flock(boids: Boid[]) {
    const separationForce = this.separate(boids).multiplyScalar(this.params.separation);
    const alignmentForce = this.align(boids).multiplyScalar(this.params.alignment);
    const cohesionForce = this.cohesion(boids).multiplyScalar(this.params.cohesion);

    this.applyForce(separationForce);
    this.applyForce(alignmentForce);
    this.applyForce(cohesionForce);
  }

  seek(target: THREE.Vector3) {
    const desired = new THREE.Vector3().subVectors(target, this.position);
    desired.setLength(this.params.speedLimit);
    const steer = new THREE.Vector3().subVectors(desired, this.velocity);
    steer.clampLength(0, this.params.forceLimit);
    return steer;
  }

  separate(boids: Boid[]): THREE.Vector3 {
    const steer = new THREE.Vector3();
    let count = 0;
    for (const other of boids) {
      if (other === this) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < this.params.perceptionRadius / 2) { // Separation radius smaller than general perception
        const diff = new THREE.Vector3().subVectors(this.position, other.position);
        diff.normalize();
        diff.divideScalar(d); // Weight by distance
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.divideScalar(count);
    }
    if (steer.lengthSq() > 0) {
      steer.setLength(this.params.speedLimit);
      steer.sub(this.velocity);
      steer.clampLength(0, this.params.forceLimit);
    }
    return steer;
  }

  align(boids: Boid[]): THREE.Vector3 {
    const sum = new THREE.Vector3();
    let count = 0;
    for (const other of boids) {
      if (other === this) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < this.params.perceptionRadius) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.divideScalar(count);
      sum.setLength(this.params.speedLimit);
      const steer = sum.sub(this.velocity);
      steer.clampLength(0, this.params.forceLimit);
      return steer;
    }
    return new THREE.Vector3();
  }

  cohesion(boids: Boid[]): THREE.Vector3 {
    const sum = new THREE.Vector3();
    let count = 0;
    for (const other of boids) {
      if (other === this) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < this.params.perceptionRadius) {
        sum.add(other.position);
        count++;
      }
    }
    if (count > 0) {
      sum.divideScalar(count);
      return this.seek(sum);
    }
    return new THREE.Vector3();
  }

  checkBounds() {
    if (this.position.x < this.bounds.xMin) this.position.x = this.bounds.xMax;
    if (this.position.x > this.bounds.xMax) this.position.x = this.bounds.xMin;
    if (this.position.y < this.bounds.yMin) this.position.y = this.bounds.yMax; // Allow some vertical movement
    if (this.position.y > this.bounds.yMax) this.position.y = this.bounds.yMin;
    if (this.position.z < this.bounds.zMin) this.position.z = this.bounds.zMax;
    if (this.position.z > this.bounds.zMax) this.position.z = this.bounds.zMin;
  }
}
