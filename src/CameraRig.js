import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.baseFov = 60;
    this.boostFov = 75;

    // Follow offsets
    this.followDistance = 11.5;
    this.followHeight = 4.8;
    this.lookAhead = 5.5;

    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();

    this.shakeIntensity = 0.0;
    this.orbitAngle = 0.0;
    this.isOrbiting = false;
  }

  reset(playerKart) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerKart.quaternion);
    this.currentPosition.copy(playerKart.position)
      .addScaledVector(forward, -this.followDistance)
      .add(new THREE.Vector3(0, this.followHeight, 0));

    this.currentTarget.copy(playerKart.position).addScaledVector(forward, this.lookAhead);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.isOrbiting = false;
  }

  update(dt, playerKart, isRaceFinished = false) {
    if (isRaceFinished) {
      this.updateCinematicOrbit(dt, playerKart);
      return;
    }

    // 1. Dynamic FOV on boost
    const isBoosting = playerKart.boostTimer > 0;
    const targetFov = isBoosting ? this.boostFov : this.baseFov;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 5.0);
    this.camera.updateProjectionMatrix();

    // 2. Camera Shake Calculation
    let targetShake = 0.0;
    if (playerKart.isDrifting) {
      targetShake += 0.06 * (playerKart.driftSparkLevel + 1);
    }
    if (isBoosting) {
      targetShake += 0.08;
    }
    const onTrack = playerKart.track.isOnTrack(playerKart.position, playerKart.currentU);
    if (!onTrack && Math.abs(playerKart.speed) > 10) {
      targetShake += 0.12;
    }

    this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, targetShake, dt * 10);
    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity
    );

    // 3. Follow Target Position & Look-At Calculation
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerKart.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerKart.quaternion);

    // Offset camera behind and above
    const idealPos = new THREE.Vector3().copy(playerKart.position)
      .addScaledVector(forward, -this.followDistance)
      .addScaledVector(up, this.followHeight);

    const idealTarget = new THREE.Vector3().copy(playerKart.position)
      .addScaledVector(forward, this.lookAhead)
      .addScaledVector(up, 1.2);

    // Smooth dampening (0.08 lerp factor)
    const lerpSpeed = Math.min(1.0, dt * 8.5);
    this.currentPosition.lerp(idealPos, lerpSpeed);
    this.currentTarget.lerp(idealTarget, lerpSpeed * 1.2);

    this.camera.position.copy(this.currentPosition).add(shakeOffset);
    this.camera.lookAt(this.currentTarget);
  }

  updateCinematicOrbit(dt, playerKart) {
    this.orbitAngle += dt * 0.8;
    const radius = 14.0;
    const height = 5.0;

    const orbitPos = new THREE.Vector3(
      playerKart.position.x + Math.sin(this.orbitAngle) * radius,
      playerKart.position.y + height + Math.sin(this.orbitAngle * 0.5) * 1.5,
      playerKart.position.z + Math.cos(this.orbitAngle) * radius
    );

    this.camera.position.lerp(orbitPos, dt * 4.0);
    this.camera.lookAt(playerKart.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  }
}
