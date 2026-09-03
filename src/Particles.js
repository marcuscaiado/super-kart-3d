import * as THREE from 'three';

/**
 * High-performance procedural particle system for Drift Sparks, Boost Flames,
 * Off-road Dust, Item Explosions, and Dynamic Skid Marks.
 */
export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.maxParticles = 600;
    this.particles = [];

    this.initParticlePool();
    this.initSkidMarks();
  }

  initParticlePool() {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Custom Canvas Texture for bright round glow particle
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(geo, mat);
    this.scene.add(this.pointsMesh);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
        maxLife: 1,
        size: 1,
      });
      this.sizes[i] = 0;
    }
  }

  emit(pos, vel, colorHex, life = 0.4, size = 1.0) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.copy(pos);
        p.vel.copy(vel);
        p.color.setHex(colorHex);
        p.life = life;
        p.maxLife = life;
        p.size = size;

        this.positions[i * 3] = pos.x;
        this.positions[i * 3 + 1] = pos.y;
        this.positions[i * 3 + 2] = pos.z;

        this.colors[i * 3] = p.color.r;
        this.colors[i * 3 + 1] = p.color.g;
        this.colors[i * 3 + 2] = p.color.b;

        this.sizes[i] = size;
        break;
      }
    }
  }

  emitDriftSparks(leftPos, rightPos, sparkLevel, kartTangent) {
    // sparkLevel: 1 = Blue sparks (0x00d4ff), 2 = Orange/Purple sparks (0xff7700)
    const color = sparkLevel >= 2 ? 0xff5500 : 0x00e5ff;
    const count = sparkLevel >= 2 ? 4 : 2;

    [leftPos, rightPos].forEach(pos => {
      for (let k = 0; k < count; k++) {
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          Math.random() * 1.8 + 0.5,
          (Math.random() - 0.5) * 1.5
        ).sub(kartTangent.clone().multiplyScalar(3.0));

        this.emit(pos, spread, color, 0.35 + Math.random() * 0.2, 1.2);
      }
    });
  }

  emitBoostFlames(exhaustLeft, exhaustRight, kartForward) {
    const boostColors = [0x00ffff, 0x3388ff, 0xffaa00, 0xff3300];
    [exhaustLeft, exhaustRight].forEach(pos => {
      for (let k = 0; k < 2; k++) {
        const color = boostColors[Math.floor(Math.random() * boostColors.length)];
        const vel = kartForward.clone().multiplyScalar(-18 - Math.random() * 10);
        vel.x += (Math.random() - 0.5) * 2;
        vel.y += (Math.random() - 0.5) * 2;
        vel.z += (Math.random() - 0.5) * 2;

        this.emit(pos, vel, color, 0.25, 1.8);
      }
    });
  }

  emitGrassDust(pos) {
    for (let k = 0; k < 2; k++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 4
      );
      const color = Math.random() > 0.5 ? 0x228833 : 0x775522;
      this.emit(pos, vel, color, 0.4, 0.8);
    }
  }

  emitBoxExplosion(pos) {
    const rainbow = [0x00f0ff, 0xff007f, 0xffea00, 0x00ff66, 0xaa00ff];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.3) * Math.PI;
      const speed = 8 + Math.random() * 12;
      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elev) * speed,
        Math.sin(elev) * speed + 3,
        Math.sin(angle) * Math.cos(elev) * speed
      );
      const color = rainbow[Math.floor(Math.random() * rainbow.length)];
      this.emit(pos, vel, color, 0.6 + Math.random() * 0.3, 1.6);
    }
  }

  update(dt) {
    let activeCount = 0;
    const posAttr = this.pointsMesh.geometry.attributes.position;
    const sizeAttr = this.pointsMesh.geometry.attributes.size;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          this.sizes[i] = 0;
        } else {
          p.pos.addScaledVector(p.vel, dt);
          p.vel.y -= 9.8 * dt; // gravity

          const progress = p.life / p.maxLife;
          this.positions[i * 3] = p.pos.x;
          this.positions[i * 3 + 1] = p.pos.y;
          this.positions[i * 3 + 2] = p.pos.z;
          this.sizes[i] = p.size * progress;
          activeCount++;
        }
      }
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.updateSkidMarks(dt);
  }

  // --- Dynamic Skid Mark Ribbons ---

  initSkidMarks() {
    this.maxSkidSegments = 160;
    this.skidPoints = [];
    this.skidMesh = null;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.maxSkidSegments * 6 * 3); // 2 triangles per quad segment
    const alpha = new Float32Array(this.maxSkidSegments * 6);

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));

    const mat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.skidMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.skidMesh);
    this.skidIndex = 0;
    this.lastSkidLeft = null;
    this.lastSkidRight = null;
  }

  addSkidSegment(leftContact, rightContact, isDrifting) {
    if (!isDrifting) {
      this.lastSkidLeft = null;
      this.lastSkidRight = null;
      return;
    }

    if (this.lastSkidLeft && this.lastSkidRight) {
      const posAttr = this.skidMesh.geometry.attributes.position;
      const p = posAttr.array;
      const base = (this.skidIndex % this.maxSkidSegments) * 18;

      // Quad for left tire skid
      const yOff = 0.08;
      // Triangle 1
      p[base + 0] = this.lastSkidLeft.x; p[base + 1] = this.lastSkidLeft.y + yOff; p[base + 2] = this.lastSkidLeft.z;
      p[base + 3] = leftContact.x;       p[base + 4] = leftContact.y + yOff;       p[base + 5] = leftContact.z;
      p[base + 6] = this.lastSkidRight.x;p[base + 7] = this.lastSkidRight.y + yOff;p[base + 8] = this.lastSkidRight.z;

      // Triangle 2
      p[base + 9] = leftContact.x;       p[base + 10] = leftContact.y + yOff;      p[base + 11] = leftContact.z;
      p[base + 12] = rightContact.x;     p[base + 13] = rightContact.y + yOff;     p[base + 14] = rightContact.z;
      p[base + 15] = this.lastSkidRight.x;p[base + 16] = this.lastSkidRight.y + yOff;p[base + 17] = this.lastSkidRight.z;

      posAttr.needsUpdate = true;
      this.skidIndex++;
    }

    this.lastSkidLeft = leftContact.clone();
    this.lastSkidRight = rightContact.clone();
  }

  updateSkidMarks(dt) {
    // Keep skid marks fresh
  }
}
