import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures.js';

export class ItemManager {
  constructor(scene, track, particleManager, audio) {
    this.scene = scene;
    this.track = track;
    this.particles = particleManager;
    this.audio = audio;

    this.itemBoxes = [];
    this.activeShells = [];
    this.activeBananas = [];
    this.coins = [];

    this.boxTexture = ProceduralTextures.createItemBoxTexture();
    this.coinTexture = ProceduralTextures.createCoinTexture();

    this.initItemBoxes();
    this.initTrackCoins();
  }

  initItemBoxes() {
    const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const boxMat = new THREE.MeshStandardMaterial({
      map: this.boxTexture,
      transparent: true,
      opacity: 0.88,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x1144bb,
      emissiveIntensity: 0.5,
    });

    const wireGeo = new THREE.BoxGeometry(1.65, 1.65, 1.65);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.7 });

    const clusterUs = this.track.itemBoxLocations;
    const laneOffsets = [-6.0, -2.0, 2.0, 6.0];

    clusterUs.forEach(u => {
      const centerPt = this.track.getPointAt(u);
      const normal = this.track.getSurfaceNormal(u);
      const binormal = this.track.getBinormalAt(u);

      laneOffsets.forEach(offset => {
        const group = new THREE.Group();
        const pos = centerPt.clone().addScaledVector(binormal, offset).addScaledVector(normal, 1.25);
        group.position.copy(pos);

        const mesh = new THREE.Mesh(boxGeo, boxMat);
        group.add(mesh);
        const wire = new THREE.Mesh(wireGeo, wireMat);
        group.add(wire);

        this.scene.add(group);

        this.itemBoxes.push({
          group: group,
          mesh: mesh,
          basePos: pos.clone(),
          active: true,
          respawnTimer: 0,
          rotationSpeed: 1.8 + Math.random() * 0.4,
          floatOffset: Math.random() * Math.PI * 2,
        });
      });
    });
  }

  initTrackCoins() {
    const coinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 16);
    coinGeo.rotateX(Math.PI / 2);

    const coinMat = new THREE.MeshStandardMaterial({
      map: this.coinTexture,
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x664400,
      emissiveIntensity: 0.3,
    });

    this.track.coinLocations.forEach(loc => {
      const centerPt = this.track.getPointAt(loc.u);
      const normal = this.track.getSurfaceNormal(loc.u);
      const binormal = this.track.getBinormalAt(loc.u);

      const pos = centerPt.clone().addScaledVector(binormal, loc.offset).addScaledVector(normal, 0.9);

      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      this.coins.push({
        mesh: mesh,
        basePos: pos.clone(),
        active: true,
        respawnTimer: 0,
        spinSpeed: 3.5,
        floatOffset: Math.random() * Math.PI * 2,
      });
    });
  }

  spawnDroppedCoins(pos, count = 3) {
    const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });

    for (let i = 0; i < count; i++) {
      const dropMesh = new THREE.Mesh(coinGeo, coinMat);
      const spreadPos = pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        0.5,
        (Math.random() - 0.5) * 6
      ));
      dropMesh.position.copy(spreadPos);
      this.scene.add(dropMesh);

      this.coins.push({
        mesh: dropMesh,
        basePos: spreadPos.clone(),
        active: true,
        respawnTimer: 0,
        isDropped: true,
        life: 14.0,
        spinSpeed: 4.0,
        floatOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  // --- 3D Shell & Banana Meshes ---

  createShellMesh(isRed = false) {
    const group = new THREE.Group();

    // Dome
    const domeGeo = new THREE.SphereGeometry(0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshStandardMaterial({
      color: isRed ? 0xef233c : 0x10b981, // Red or Green
      roughness: 0.25,
      metalness: 0.2,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Rim
    const rimGeo = new THREE.TorusGeometry(0.75, 0.12, 8, 20);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.05;
    group.add(rim);

    // Center Ridge
    const ridgeGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.16, 6);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: isRed ? 0xb91c1c : 0x059669 });
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.set(0, 0.7, 0);
    group.add(ridge);

    return group;
  }

  createBananaMesh() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.35, metalness: 0.1 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });

    for (let i = 0; i < 3; i++) {
      const petalGeo = new THREE.ConeGeometry(0.3, 0.95, 5);
      petalGeo.rotateZ(0.6);
      petalGeo.rotateY((i * Math.PI * 2) / 3);
      const petal = new THREE.Mesh(petalGeo, skinMat);
      petal.position.set(0, 0.15, 0);
      group.add(petal);
    }

    const coreGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.85, 8);
    const core = new THREE.Mesh(coreGeo, skinMat);
    core.position.set(0, 0.4, 0);
    group.add(core);

    const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.85, 0);
    group.add(stem);

    return group;
  }

  // --- Weapon Actions ---

  fireShell(kart) {
    const mesh = this.createShellMesh(false);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(kart.quaternion);
    const startPos = kart.position.clone().addScaledVector(forward, 3.2);

    mesh.position.copy(startPos);
    this.scene.add(mesh);

    const initialLat = this.track.getLateralOffset(kart.position, kart.currentU);
    let latSpeed = kart.inputs.steer * 14.0;
    if (Math.abs(latSpeed) < 2.0) {
      latSpeed = Math.random() > 0.5 ? 9.0 : -9.0;
    }

    this.activeShells.push({
      mesh: mesh,
      position: startPos,
      owner: kart,
      isHoming: false,
      currentU: kart.currentU,
      lateralD: initialLat,
      lateralSpeed: latSpeed,
      forwardSpeed: 68.0,
      bounces: 0,
      maxBounces: 5,
      life: 8.5,
      active: true,
    });

    if (this.audio) this.audio.playShellLaunch();
  }

  fireRedShell(kart) {
    const mesh = this.createShellMesh(true);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(kart.quaternion);
    const startPos = kart.position.clone().addScaledVector(forward, 3.2);

    mesh.position.copy(startPos);
    this.scene.add(mesh);

    const initialLat = this.track.getLateralOffset(kart.position, kart.currentU);

    this.activeShells.push({
      mesh: mesh,
      position: startPos,
      owner: kart,
      isHoming: true,
      currentU: (kart.currentU + 0.01) % 1.0,
      lateralD: initialLat,
      targetLateralD: 0,
      forwardSpeed: 78.0,
      life: 10.0,
      active: true,
    });

    if (this.audio) this.audio.playShellLaunch();
  }

  dropBanana(kart) {
    const mesh = this.createBananaMesh();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(kart.quaternion);
    const startPos = kart.position.clone().addScaledVector(forward, -2.8);

    mesh.position.copy(startPos);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.activeBananas.push({
      mesh: mesh,
      position: startPos,
      owner: kart,
      life: 35.0,
      active: true,
      currentU: kart.currentU,
    });
  }

  usePlayerItem(playerKart) {
    if (!playerKart.currentItem || playerKart.isRoulette) return false;

    const item = playerKart.currentItem;
    playerKart.currentItem = null;

    if (item === 'mushroom') {
      playerKart.triggerBoost(1.5, 2.5);
      if (this.audio) this.audio.playBoostBurst();
      return 'mushroom';
    } else if (item === 'red_shell') {
      this.fireRedShell(playerKart);
      return 'red_shell';
    } else if (item === 'shell') {
      this.fireShell(playerKart);
      return 'shell';
    } else if (item === 'banana') {
      this.dropBanana(playerKart);
      return 'banana';
    }
    return null;
  }

  // --- Main Update Loop ---

  update(dt, totalTime, allKarts) {
    this.updateBoxes(dt, totalTime, allKarts);
    this.updateCoins(dt, totalTime, allKarts);
    this.updateShells(dt, allKarts);
    this.updateBananas(dt, allKarts);
  }

  updateBoxes(dt, totalTime, allKarts) {
    for (const box of this.itemBoxes) {
      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) {
          box.active = true;
          box.group.visible = true;
          box.group.scale.set(0.01, 0.01, 0.01);
        }
      } else {
        if (box.group.scale.x < 1.0) {
          const s = Math.min(1.0, box.group.scale.x + dt * 4);
          box.group.scale.set(s, s, s);
        }

        box.group.rotation.y += box.rotationSpeed * dt;
        box.mesh.rotation.x = Math.sin(totalTime * 2 + box.floatOffset) * 0.18;
        box.group.position.y = box.basePos.y + Math.sin(totalTime * 3 + box.floatOffset) * 0.25;

        for (const kart of allKarts) {
          if (kart.position.distanceTo(box.group.position) < 2.4) {
            box.active = false;
            box.group.visible = false;
            box.respawnTimer = 5.0;

            this.particles.emitBoxExplosion(box.group.position);

            if (!kart.currentItem && !kart.isRoulette) {
              kart.isRoulette = true;
              kart.rouletteTimer = 0.8;

              const items = ['shell', 'red_shell', 'banana', 'mushroom'];
              const chosen = items[Math.floor(Math.random() * items.length)];

              if (!kart.isAI && this.audio) {
                this.audio.playItemBoxChime();
              }

              setTimeout(() => {
                kart.giveItem(chosen);
              }, 800);
            }
            break;
          }
        }
      }
    }
  }

  updateCoins(dt, totalTime, allKarts) {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];

      if (coin.isDropped) {
        coin.life -= dt;
        if (coin.life <= 0) {
          this.scene.remove(coin.mesh);
          this.coins.splice(i, 1);
          continue;
        }
      }

      if (!coin.active) {
        coin.respawnTimer -= dt;
        if (coin.respawnTimer <= 0) {
          coin.active = true;
          coin.mesh.visible = true;
        }
      } else {
        coin.mesh.rotation.y += coin.spinSpeed * dt;
        coin.mesh.position.y = coin.basePos.y + Math.sin(totalTime * 4 + coin.floatOffset) * 0.15;

        for (const kart of allKarts) {
          if (kart.position.distanceTo(coin.mesh.position) < 2.2) {
            const added = kart.addCoin();
            this.particles.emit(coin.mesh.position, new THREE.Vector3(0, 4, 0), 0xffd700, 0.4, 1.4);

            if (coin.isDropped) {
              this.scene.remove(coin.mesh);
              this.coins.splice(i, 1);
            } else {
              coin.active = false;
              coin.mesh.visible = false;
              coin.respawnTimer = 6.0;
            }
            break;
          }
        }
      }
    }
  }

  updateShells(dt, allKarts) {
    const splineLength = this.track.totalLength;
    const maxHalfW = (this.track.roadWidth * 0.5) - 0.5;

    for (let i = this.activeShells.length - 1; i >= 0; i--) {
      const shell = this.activeShells[i];
      if (!shell.active) continue;

      shell.life -= dt;
      if (shell.life <= 0) {
        this.destroyShell(i);
        continue;
      }

      if (shell.isHoming) {
        // Red Shell: Homes in on nearest kart ahead along the spline
        const deltaU = (shell.forwardSpeed * dt) / splineLength;
        shell.currentU = (shell.currentU + deltaU) % 1.0;

        // Find target kart ahead
        let targetKart = null;
        let minAheadDist = Infinity;
        for (const k of allKarts) {
          if (k !== shell.owner) {
            let diff = k.currentU - shell.currentU;
            if (diff < 0) diff += 1.0;
            if (diff > 0.005 && diff < minAheadDist) {
              minAheadDist = diff;
              targetKart = k;
            }
          }
        }

        if (targetKart) {
          const targetLat = this.track.getLateralOffset(targetKart.position, targetKart.currentU);
          shell.lateralD = THREE.MathUtils.lerp(shell.lateralD, targetLat, dt * 6.0);
        }

        const centerPt = this.track.getPointAt(shell.currentU);
        const normal = this.track.getSurfaceNormal(shell.currentU);
        const binormal = this.track.getBinormalAt(shell.currentU);

        shell.position.copy(centerPt)
          .addScaledVector(binormal, shell.lateralD)
          .addScaledVector(normal, 0.45);

        shell.mesh.position.copy(shell.position);
        shell.mesh.rotation.y += dt * 18;

      } else {
        // Green Shell: Advance along spline forward and bounce between curbs
        const deltaU = (shell.forwardSpeed * dt) / splineLength;
        shell.currentU = (shell.currentU + deltaU) % 1.0;

        shell.lateralD += shell.lateralSpeed * dt;

        // Strict boundary curb bounce
        if (Math.abs(shell.lateralD) > maxHalfW) {
          shell.lateralD = Math.sign(shell.lateralD) * maxHalfW;
          shell.lateralSpeed = -shell.lateralSpeed;
          shell.bounces++;

          if (this.audio) this.audio.playShellHit();

          if (shell.bounces > shell.maxBounces) {
            this.particles.emitBoxExplosion(shell.position);
            this.destroyShell(i);
            continue;
          }
        }

        const centerPt = this.track.getPointAt(shell.currentU);
        const normal = this.track.getSurfaceNormal(shell.currentU);
        const binormal = this.track.getBinormalAt(shell.currentU);

        shell.position.copy(centerPt)
          .addScaledVector(binormal, shell.lateralD)
          .addScaledVector(normal, 0.45);

        shell.mesh.position.copy(shell.position);
        shell.mesh.rotation.y += dt * 16;
      }

      // Check collision with karts
      for (const kart of allKarts) {
        if (kart !== shell.owner || shell.life < 7.5) {
          if (kart.position.distanceTo(shell.position) < 2.3 && kart.invulnerableTimer <= 0 && kart.spinoutTimer <= 0) {
            const lostCoins = kart.triggerSpinout();
            if (lostCoins > 0) {
              this.spawnDroppedCoins(kart.position, lostCoins);
            }
            this.particles.emitBoxExplosion(shell.position);
            this.destroyShell(i);
            break;
          }
        }
      }
    }
  }

  destroyShell(index) {
    const shell = this.activeShells[index];
    if (shell) {
      shell.active = false;
      this.scene.remove(shell.mesh);
      this.activeShells.splice(index, 1);
    }
  }

  updateBananas(dt, allKarts) {
    for (let i = this.activeBananas.length - 1; i >= 0; i--) {
      const banana = this.activeBananas[i];
      if (!banana.active) continue;

      banana.life -= dt;
      if (banana.life <= 0) {
        this.scene.remove(banana.mesh);
        this.activeBananas.splice(i, 1);
        continue;
      }

      for (const kart of allKarts) {
        if (kart.position.distanceTo(banana.position) < 1.8 && kart.invulnerableTimer <= 0 && kart.spinoutTimer <= 0) {
          const lostCoins = kart.triggerSpinout();
          if (lostCoins > 0) {
            this.spawnDroppedCoins(kart.position, lostCoins);
          }
          this.particles.emitGrassDust(banana.position);
          this.scene.remove(banana.mesh);
          this.activeBananas.splice(i, 1);
          break;
        }
      }
    }
  }

  getActiveObstacles() {
    const obs = [];
    this.activeBananas.forEach(b => obs.push(b));
    this.activeShells.forEach(s => obs.push(s));
    return obs;
  }
}
