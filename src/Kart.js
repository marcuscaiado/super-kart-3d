import * as THREE from 'three';
import { KartModel } from './KartModel.js';

export class Kart {
  constructor(scene, track, particleManager, audio, isAI = false, config = {}) {
    this.scene = scene;
    this.track = track;
    this.particles = particleManager;
    this.audio = audio;
    this.isAI = isAI;
    this.character = config.character || 'mario';

    // Model
    this.modelData = KartModel.createKartMesh(config);
    this.mesh = this.modelData.root;
    this.scene.add(this.mesh);

    // Physics Constants
    this.acceleration = 28.0;
    this.reverseSpeed = -10.0;
    this.baseMaxSpeed = 48.0;
    this.maxSpeed = this.baseMaxSpeed;
    this.drag = 0.985;
    this.brakeDecel = 35.0;
    this.steerSpeed = 2.4;

    // Kinematics
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.speed = 0.0;
    this.heading = 0.0;

    // Drift & Hop Mechanics
    this.isDrifting = false;
    this.driftDirection = 0; // -1 = Left, 1 = Right
    this.driftTimer = 0.0;
    this.driftSparkLevel = 0; // 0 = None, 1 = Blue, 2 = Orange, 3 = Purple
    this.driftAngle = 0.0;
    this.hopTimer = 0.0;
    this.hopOffsetY = 0.0;

    // Boost
    this.boostTimer = 0.0;
    this.boostMultiplier = 1.0;

    // Coins
    this.coins = 0;
    this.maxCoins = 10;

    // Spinout / Knockout
    this.spinoutTimer = 0.0;
    this.invulnerableTimer = 0.0;
    this.isSpinning = false;

    // Items
    this.currentItem = null; // 'shell' | 'red_shell' | 'banana' | 'mushroom'
    this.isRoulette = false;
    this.rouletteTimer = 0.0;

    // Progress
    this.currentU = 0.0;
    this.currentCheckpoint = 0;
    this.checkpointsPassed = 0;
    this.lap = 1;
    this.maxLaps = 3;
    this.lapStartTime = 0;
    this.lapTimes = [];
    this.bestLapTime = Infinity;
    this.raceFinished = false;
    this.finishTime = 0;
    this.totalSplineProgress = 0.0;

    // Inputs
    this.inputs = {
      throttle: 0,
      steer: 0,
      drift: false,
      useItem: false,
    };

    this.wheelRotation = 0;
  }

  setStartPosition(u, lateralOffset) {
    this.currentU = u;
    const pt = this.track.getPointAt(u);
    const tangent = this.track.getTangentAt(u);
    const normal = this.track.getSurfaceNormal(u);
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    this.position.copy(pt).addScaledVector(binormal, lateralOffset).addScaledVector(normal, 0.4);
    this.mesh.position.copy(this.position);

    const lookTarget = new THREE.Vector3().copy(this.position).add(tangent);
    this.mesh.lookAt(lookTarget);
    this.quaternion.copy(this.mesh.quaternion);

    this.heading = Math.atan2(tangent.x, tangent.z);
    this.speed = 0.0;
    this.lap = 1;
    this.currentCheckpoint = 0;
    this.checkpointsPassed = 0;
    this.coins = 0;
  }

  update(dt, totalTime) {
    if (this.spinoutTimer > 0) {
      this.updateSpinout(dt);
      return;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      this.mesh.visible = Math.floor(totalTime * 20) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // Speed Pad (Floor Turbo) Check
    if (this.speedPadCooldown > 0) {
      this.speedPadCooldown -= dt;
    }
    if (this.track && this.track.checkSpeedPad(this)) {
      this.triggerBoost(1.5, 2.5);
      if (!this.isAI && this.audio) {
        this.audio.playBoostBurst();
      }
    }

    this.updateCoinsAndSpeed();
    this.updateBoost(dt);
    this.updateDriftAndHop(dt);
    this.updateMovement(dt);
    this.updateSurfaceClamping(dt);
    this.updateProgress(totalTime);
    this.updateVisuals(dt);
  }

  updateCoinsAndSpeed() {
    // Each coin adds +0.5 units to top speed (up to +5.0)
    const coinBonus = this.coins * 0.5;
    this.baseMaxSpeed = 48.0 + coinBonus;
  }

  addCoin() {
    if (this.coins < this.maxCoins) {
      this.coins++;
      if (!this.isAI && this.audio) {
        this.audio.playCoinChime();
      }
      return true;
    }
    return false;
  }

  updateBoost(dt) {
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      this.maxSpeed = this.baseMaxSpeed * this.boostMultiplier;

      const exL = this.modelData.exhaustLeftPos.clone().applyMatrix4(this.mesh.matrixWorld);
      const exR = this.modelData.exhaustRightPos.clone().applyMatrix4(this.mesh.matrixWorld);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
      this.particles.emitBoostFlames(exL, exR, fwd);
    } else {
      this.boostMultiplier = 1.0;
      this.maxSpeed = this.baseMaxSpeed;
    }

    // Grass slowdown
    const onTrack = this.track.isOnTrack(this.position, this.currentU);
    if (!onTrack) {
      this.maxSpeed = Math.min(this.maxSpeed, 19.0);
      if (Math.abs(this.speed) > 5) {
        const tireL = this.modelData.tireLeftContact.clone().applyMatrix4(this.mesh.matrixWorld);
        const tireR = this.modelData.tireRightContact.clone().applyMatrix4(this.mesh.matrixWorld);
        this.particles.emitGrassDust(tireL);
        this.particles.emitGrassDust(tireR);
      }
    }
  }

  updateDriftAndHop(dt) {
    const isSteering = Math.abs(this.inputs.steer) > 0.1;
    const wantsDrift = this.inputs.drift && this.speed > 10.0;

    // 1. Hop initiation
    if (wantsDrift && !this.isDrifting) {
      this.isDrifting = true;
      this.driftDirection = isSteering ? Math.sign(this.inputs.steer) : (this.lastSteerDir || 1);
      this.driftTimer = 0.0;
      this.driftSparkLevel = 0;
      this.hopTimer = 0.12;

      if (!this.isAI && this.audio) {
        this.audio.playHopSound();
      }
    }

    if (Math.abs(this.inputs.steer) > 0.1) {
      this.lastSteerDir = Math.sign(this.inputs.steer);
    }

    // Handle hop arc
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      const progress = 1.0 - (this.hopTimer / 0.12);
      this.hopOffsetY = Math.sin(progress * Math.PI) * 0.35;
    } else {
      this.hopOffsetY = 0.0;
    }

    // 2. Active Drift
    if (wantsDrift && this.isDrifting) {
      this.driftTimer += dt;

      // 3-Stage Mini-Turbo Sparks: Blue -> Orange -> Purple
      if (this.driftTimer >= 3.5) {
        this.driftSparkLevel = 3; // Purple Ultra Mini-Turbo
      } else if (this.driftTimer >= 2.2) {
        this.driftSparkLevel = 2; // Orange Mini-Turbo
      } else if (this.driftTimer >= 1.0) {
        this.driftSparkLevel = 1; // Blue Mini-Turbo
      }

      // Smooth visual chassis lean
      const targetDriftAngle = this.driftDirection * 0.35;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, targetDriftAngle, dt * 8);

      if (this.driftSparkLevel > 0) {
        const tireL = this.modelData.tireLeftContact.clone().applyMatrix4(this.mesh.matrixWorld);
        const tireR = this.modelData.tireRightContact.clone().applyMatrix4(this.mesh.matrixWorld);
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
        this.particles.emitDriftSparks(tireL, tireR, this.driftSparkLevel, fwd);
      }

      const tL = this.modelData.tireLeftContact.clone().applyMatrix4(this.mesh.matrixWorld);
      const tR = this.modelData.tireRightContact.clone().applyMatrix4(this.mesh.matrixWorld);
      this.particles.addSkidSegment(tL, tR, true);

    } else {
      // Releasing drift -> Mini-Turbo Trigger!
      if (this.isDrifting) {
        if (this.driftSparkLevel === 3) {
          this.triggerBoost(1.68, 3.2);
          if (!this.isAI && this.audio) this.audio.playBoostBurst();
        } else if (this.driftSparkLevel === 2) {
          this.triggerBoost(1.50, 2.2);
          if (!this.isAI && this.audio) this.audio.playBoostBurst();
        } else if (this.driftSparkLevel === 1) {
          this.triggerBoost(1.35, 1.4);
          if (!this.isAI && this.audio) this.audio.playBoostBurst();
        }
      }

      this.isDrifting = false;
      this.driftTimer = 0.0;
      this.driftSparkLevel = 0;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, dt * 10);
      this.particles.addSkidSegment(null, null, false);
    }
  }

  updateMovement(dt) {
    if (this.inputs.throttle > 0) {
      this.speed += this.acceleration * this.inputs.throttle * dt;
    } else if (this.inputs.throttle < 0) {
      if (this.speed > 0) {
        this.speed -= this.brakeDecel * dt;
      } else {
        this.speed -= this.acceleration * 0.5 * dt;
      }
    } else {
      this.speed *= Math.pow(this.drag, dt * 60);
    }

    this.speed = Math.max(this.reverseSpeed, Math.min(this.maxSpeed, this.speed));

    // Steering with smooth, controllable Mario Kart drift arc
    if (Math.abs(this.speed) > 0.5) {
      let turnMultiplier = this.inputs.steer;

      if (this.isDrifting) {
        const steerWithDrift = this.inputs.steer * this.driftDirection;
        if (steerWithDrift > 0.1) {
          // Steering into the turn: tight apex carving
          turnMultiplier = this.driftDirection * 1.45 + this.inputs.steer * 0.25;
        } else if (steerWithDrift < -0.1) {
          // Counter-steering: widen drift line smoothly
          turnMultiplier = this.driftDirection * 0.45 + this.inputs.steer * 0.2;
        } else {
          // Neutral: gentle natural drift arc
          turnMultiplier = this.driftDirection * 0.95;
        }
      }

      const steerDir = this.speed >= 0 ? -1 : 1;
      const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 32.0, 0.5, 1.0);
      this.heading += turnMultiplier * this.steerSpeed * steerDir * speedFactor * dt;
    }

    const moveQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(moveQuat);

    // Forward drive (Clean, smooth velocity - no violent lateral teleporting!)
    this.position.addScaledVector(forward, this.speed * dt);
  }

  updateSurfaceClamping(dt) {
    this.currentU = this.track.getClosestParam(this.position, this.currentU);

    // Contain kart inside track road bounds (guardrails prevent falling into empty space)
    const boundResult = this.track.clampToRoadBounds(this.position, this.currentU);
    if (boundResult.clamped) {
      this.speed = Math.max(8.0, this.speed * 0.96);
    }

    const surface = this.track.getClampedSurfaceData(this.position, this.currentU);

    // Smooth Y height lerp (completely eliminates vertical flickering / jitter!)
    const targetY = surface.groundY + 0.35 + this.hopOffsetY;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, Math.min(1.0, dt * 25));
    this.mesh.position.copy(this.position);

    const moveQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(moveQuat);

    const normal = surface.normal;
    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
    const alignedForward = new THREE.Vector3().crossVectors(right, normal).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, normal, alignedForward);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

    // Smooth orientation slerp
    this.quaternion.slerp(targetQuat, Math.min(1.0, dt * 18));
    this.mesh.quaternion.copy(this.quaternion);

    if (Math.abs(this.driftAngle) > 0.001) {
      this.mesh.rotateY(this.driftAngle);
    }
  }

  updateProgress(totalTime) {
    if (this.raceFinished) return;

    const chk = this.track.checkpoints[this.currentCheckpoint];
    const distToChk = this.position.distanceTo(chk.position);

    if (distToChk < chk.radius * 1.8) {
      this.checkpointsPassed++;
      const nextCheckpoint = (this.currentCheckpoint + 1) % this.track.checkpointCount;

      // Completed a full lap when wrapping from last checkpoint to 0 after passing at least 45 checkpoints
      if (this.currentCheckpoint === this.track.checkpointCount - 1 && nextCheckpoint === 0 && this.checkpointsPassed >= 45) {
        if (this.lapStartTime > 0) {
          const lapDuration = totalTime - this.lapStartTime;
          this.lapTimes.push(lapDuration);
          if (lapDuration < this.bestLapTime) {
            this.bestLapTime = lapDuration;
          }
          if (!this.isAI && this.audio) this.audio.playLapFanfare();
        }
        this.lapStartTime = totalTime;
        this.lap++;
        this.checkpointsPassed = 0;

        if (this.lap > this.maxLaps) {
          this.lap = this.maxLaps;
          this.raceFinished = true;
          this.finishTime = totalTime;
        }
      }

      this.currentCheckpoint = nextCheckpoint;
    }

    this.totalSplineProgress = (this.lap - 1) + this.currentU;
  }

  updateVisuals(dt) {
    const wheelSpinRate = (this.speed / 0.5) * dt;
    this.wheelRotation += wheelSpinRate;

    this.modelData.wheelFL.rotation.x = this.wheelRotation;
    this.modelData.wheelFR.rotation.x = this.wheelRotation;
    this.modelData.wheelRL.rotation.x = this.wheelRotation;
    this.modelData.wheelRR.rotation.x = this.wheelRotation;

    const targetSteerVisual = -this.inputs.steer * 0.45;
    this.modelData.frontLeftSteer.rotation.y = THREE.MathUtils.lerp(
      this.modelData.frontLeftSteer.rotation.y,
      targetSteerVisual,
      dt * 12
    );
    this.modelData.frontRightSteer.rotation.y = this.modelData.frontLeftSteer.rotation.y;
    this.modelData.steerPivot.rotation.z = -this.modelData.frontLeftSteer.rotation.y * 1.8;
    this.modelData.driverGroup.rotation.z = -this.inputs.steer * 0.18;

    if (!this.isAI && this.audio) {
      const normSpeed = Math.abs(this.speed) / this.baseMaxSpeed;
      const isAcc = this.inputs.throttle > 0;
      this.audio.updateEngine(normSpeed, isAcc, this.isDrifting);
    }
  }

  triggerBoost(multiplier = 1.35, duration = 1.5) {
    this.boostMultiplier = Math.max(this.boostMultiplier, multiplier);
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.speed = Math.max(this.speed, this.baseMaxSpeed * multiplier * 0.9);
  }

  triggerSpinout() {
    if (this.invulnerableTimer > 0 || this.spinoutTimer > 0) return;

    this.spinoutTimer = 1.8;
    this.isSpinning = true;
    this.speed = 0.0;
    this.boostTimer = 0.0;
    this.isDrifting = false;

    // Drop 3 coins
    const lostCoins = Math.min(this.coins, 3);
    this.coins -= lostCoins;

    if (!this.isAI && this.audio) {
      this.audio.playBananaSlip();
    }

    return lostCoins;
  }

  updateSpinout(dt) {
    this.spinoutTimer -= dt;
    this.speed = 0.0;

    const spinProgress = 1.0 - (this.spinoutTimer / 1.8);
    this.mesh.rotation.y = this.heading + spinProgress * Math.PI * 4;

    if (this.spinoutTimer <= 0) {
      this.isSpinning = false;
      this.invulnerableTimer = 1.5;
      this.mesh.quaternion.copy(this.quaternion);
    }
  }

  giveItem(itemType) {
    this.currentItem = itemType;
    this.isRoulette = false;
  }
}
