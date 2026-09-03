import * as THREE from 'three';
import { Kart } from './Kart.js';

/**
 * Frenet-space AI Racing Engine.
 * AI karts strictly follow spline racing lines (s, d) with apex cutting,
 * drafting, rubber-banding, dynamic obstacle avoidance, and tactical item combat.
 * Guarantees zero free-roaming into off-road grass.
 */
export class AIKart extends Kart {
  constructor(scene, track, particleManager, audio, config = {}) {
    super(scene, track, particleManager, audio, true, config);

    this.aiName = config.name || 'CPU';
    this.character = config.character || 'luigi';
    this.lanePreference = config.lanePreference || 0.0;
    this.speedVariation = config.speedVariation || 1.0;
    this.baseMaxSpeed = 37.0 * this.speedVariation;
    this.maxSpeed = this.baseMaxSpeed;

    // Frenet Track Coordinates
    this.splineS = 0.0;
    this.lateralD = 0.0;
    this.targetLateralD = 0.0;
    this.lateralVelocity = 0.0;

    this.itemUseTimer = 2.0 + Math.random() * 3.0;
    this.aggression = config.aggression || 0.8;
  }

  setStartPosition(u, lateralOffset) {
    super.setStartPosition(u, lateralOffset);
    this.splineS = u;
    this.lateralD = lateralOffset;
    this.targetLateralD = lateralOffset;
  }

  updateAI(dt, totalTime, playerKart, activeObstacles = [], itemManager = null) {
    if (this.spinoutTimer > 0) {
      this.update(dt, totalTime);
      return;
    }

    // Speed pad (floor turbo) check for AI karts
    if (this.speedPadCooldown > 0) {
      this.speedPadCooldown -= dt;
    }
    if (this.track && this.track.checkSpeedPad(this)) {
      this.triggerBoost(1.4, 2.2);
    }

    // 1. Balanced Mario Kart Rubber-Banding
    const distToPlayer = (this.totalSplineProgress - playerKart.totalSplineProgress) * this.track.totalLength;
    let rubberBandFactor = 1.0;

    if (distToPlayer < -25.0) {
      // Trailing behind player -> catch-up surge
      rubberBandFactor = 1.12;
    } else if (distToPlayer > 20.0) {
      // Well ahead of player -> ease off so player can contest 1st
      rubberBandFactor = 0.82;
    } else if (distToPlayer > 8.0) {
      // Slightly ahead -> moderate speed
      rubberBandFactor = 0.90;
    }

    this.baseMaxSpeed = (37.0 * this.speedVariation + this.coins * 0.3) * rubberBandFactor;

    // 2. Dynamic Racing Line Calculation (Apex Clipping)
    const lookAheadU = (this.splineS + 0.035) % 1.0;
    const tangentCurrent = this.track.getTangentAt(this.splineS);
    const tangentAhead = this.track.getTangentAt(lookAheadU);
    const curveCross = new THREE.Vector3().crossVectors(tangentCurrent, tangentAhead);

    // Negative Y = Turning right (apex is right: +d), Positive Y = Turning left (apex is left: -d)
    let apexBias = 0.0;
    if (curveCross.y > 0.02) {
      apexBias = -4.5; // Turn left: cut inside left
    } else if (curveCross.y < -0.02) {
      apexBias = 4.5;  // Turn right: cut inside right
    } else {
      apexBias = this.lanePreference; // Straightaway cruising line
    }

    // 3. Obstacle Avoidance (Bananas / Shells)
    let avoidanceBias = 0.0;
    for (const obs of activeObstacles) {
      if (obs.active && obs.position) {
        const toObs = new THREE.Vector3().subVectors(obs.position, this.position);
        const fwd = tangentCurrent;
        const distFwd = toObs.dot(fwd);

        if (distFwd > 1.0 && distFwd < 24.0) {
          const binormal = this.track.getBinormalAt(this.splineS);
          const latDist = toObs.dot(binormal);
          if (Math.abs(latDist - this.lateralD) < 3.2) {
            avoidanceBias = latDist > this.lateralD ? -5.0 : 5.0;
            break;
          }
        }
      }
    }

    // Blend target lateral lane
    this.targetLateralD = THREE.MathUtils.clamp(apexBias + avoidanceBias, -7.5, 7.5);

    // Smooth lateral movement toward target line
    const lateralDiff = this.targetLateralD - this.lateralD;
    this.lateralVelocity = THREE.MathUtils.lerp(this.lateralVelocity, lateralDiff * 3.8, dt * 6.0);
    this.lateralD += this.lateralVelocity * dt;
    this.lateralD = THREE.MathUtils.clamp(this.lateralD, -8.0, 8.0);

    // 4. Longitudinal Speed & Braking on Sharp Turns
    let targetSpeed = this.baseMaxSpeed;
    const isSharpCorner = Math.abs(curveCross.y) > 0.06;

    if (isSharpCorner) {
      targetSpeed = this.baseMaxSpeed * 0.82;
      this.isDrifting = true;
      this.driftDirection = curveCross.y > 0 ? -1 : 1;
      this.driftTimer += dt;
      if (this.driftTimer > 2.0) this.driftSparkLevel = 2;
      else if (this.driftTimer > 1.0) this.driftSparkLevel = 1;
    } else {
      if (this.isDrifting) {
        // Mini-Turbo boost exit!
        this.triggerBoost(1.35, 1.2);
      }
      this.isDrifting = false;
      this.driftTimer = 0.0;
      this.driftSparkLevel = 0;
    }

    if (this.boostTimer > 0) {
      targetSpeed = this.baseMaxSpeed * this.boostMultiplier;
    }

    // Accelerate smoothly
    if (this.speed < targetSpeed) {
      this.speed += this.acceleration * dt;
    } else {
      this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, dt * 4.0);
    }

    // 5. Advance Spline Distance (Strictly along track)
    const splineLength = this.track.totalLength;
    const deltaS = (this.speed * dt) / splineLength;
    this.splineS = (this.splineS + deltaS) % 1.0;
    this.currentU = this.splineS;

    // 6. Compute Clamped 3D World Position from Spline + Frenet Lateral Offset
    const centerPt = this.track.getPointAt(this.splineS);
    const normal = this.track.getSurfaceNormal(this.splineS);
    const binormal = this.track.getBinormalAt(this.splineS);

    const targetPos = new THREE.Vector3().copy(centerPt)
      .addScaledVector(binormal, this.lateralD)
      .addScaledVector(normal, 0.35);

    this.position.lerp(targetPos, Math.min(1.0, dt * 25));
    this.mesh.position.copy(this.position);

    // Orientation: tangent direction + lateral velocity tilt
    const forwardDir = tangentCurrent.clone()
      .addScaledVector(binormal, this.lateralVelocity / (this.speed + 0.1))
      .normalize();

    const rightDir = new THREE.Vector3().crossVectors(normal, forwardDir).normalize();
    const alignedFwd = new THREE.Vector3().crossVectors(rightDir, normal).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(rightDir, normal, alignedFwd);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
    this.quaternion.slerp(targetQuat, Math.min(1.0, dt * 18));
    this.mesh.quaternion.copy(this.quaternion);

    if (this.isDrifting) {
      this.mesh.rotateY(this.driftDirection * 0.35);
      // Emit drift sparks
      if (this.driftSparkLevel > 0) {
        const tL = this.modelData.tireLeftContact.clone().applyMatrix4(this.mesh.matrixWorld);
        const tR = this.modelData.tireRightContact.clone().applyMatrix4(this.mesh.matrixWorld);
        this.particles.emitDriftSparks(tL, tR, this.driftSparkLevel, forwardDir);
      }
    }

    // 7. Tactical Item Deployment
    this.updateItemDecision(dt, playerKart, itemManager);

    // 8. Track Lap & Checkpoints
    this.updateProgress(totalTime);
    this.updateVisuals(dt);
  }

  updateItemDecision(dt, playerKart, itemManager) {
    if (!this.currentItem || !itemManager) return;

    this.itemUseTimer -= dt;
    if (this.itemUseTimer > 0) return;

    const toPlayer = new THREE.Vector3().subVectors(playerKart.position, this.position);
    const distToPlayer = toPlayer.length();
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const dotPlayerFwd = toPlayer.dot(fwd);

    if (this.currentItem === 'mushroom') {
      this.triggerBoost(1.5, 2.5);
      this.currentItem = null;
      this.itemUseTimer = 3.5;
    } else if (this.currentItem === 'red_shell') {
      // Fire homing red shell at racer ahead
      itemManager.fireRedShell(this);
      this.currentItem = null;
      this.itemUseTimer = 4.0;
    } else if (this.currentItem === 'shell') {
      if (dotPlayerFwd > 8.0 && distToPlayer < 65.0) {
        itemManager.fireShell(this);
        this.currentItem = null;
        this.itemUseTimer = 3.5;
      }
    } else if (this.currentItem === 'banana') {
      if (dotPlayerFwd < -5.0 && distToPlayer < 30.0) {
        itemManager.dropBanana(this);
        this.currentItem = null;
        this.itemUseTimer = 3.5;
      }
    }
  }
}
