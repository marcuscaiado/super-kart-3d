import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.roadWidth = 22.0;
    this.kerbWidth = 2.4;
    this.numSamples = 480;
    this.checkpointCount = 60;

    this.curve = null;
    this.sampledPoints = [];
    this.sampledTangents = [];
    this.sampledNormals = [];
    this.sampledBinormals = [];
    this.checkpoints = [];
    this.itemBoxLocations = [];
    this.speedPadLocations = [];
    this.coinLocations = [];

    this.startLights = []; // 3 Red, 1 Green light meshes on arch

    this.initSpline();
    this.sampleSplineData();
    this.buildRoadMeshes();
    this.buildCheckpoints();
    this.buildStartGantry();
    this.buildGrandstand();
    this.buildPipesAndScenery();
    this.buildHotAirBalloon();
    this.buildSpeedPads();
    this.initCoinLocations();
  }

  initSpline() {
    // Authentic Mario Circuit layout: wide, flowing, varied elevation, zero overlapping loops
    const controlPoints = [
      new THREE.Vector3(0, 0, -40),        // Start straight start
      new THREE.Vector3(0, 0, 40),         // Start / Finish Line
      new THREE.Vector3(0, 0, 110),        // Long high speed straight
      new THREE.Vector3(30, 4, 180),       // Gentle uphill rise
      new THREE.Vector3(90, 8, 230),       // Turn 1 Sweeping Right
      new THREE.Vector3(170, 12, 230),     // Turn 1 Apex (hilltop)
      new THREE.Vector3(230, 8, 170),      // Turn 1 Exit downhill
      new THREE.Vector3(240, 4, 80),       // Fast straight descent
      new THREE.Vector3(210, 2, -10),      // Chicane entry
      new THREE.Vector3(150, 4, -70),      // Chicane left
      new THREE.Vector3(170, 8, -140),     // Chicane right
      new THREE.Vector3(180, 14, -220),    // Mountain climb
      new THREE.Vector3(130, 16, -280),    // Mountain hairpin apex
      new THREE.Vector3(60, 12, -290),     // Hairpin exit
      new THREE.Vector3(-20, 6, -240),     // Downhill valley sweep
      new THREE.Vector3(-90, 2, -180),     // Banked left curve
      new THREE.Vector3(-140, 6, -110),    // Sweeping outer turn
      new THREE.Vector3(-130, 4, -20),     // Descent toward start
      new THREE.Vector3(-80, 1, 40),       // S-curve into final straight
      new THREE.Vector3(-30, 0, 0),        // Alignment straight back to finish
    ];

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);
    this.totalLength = this.curve.getLength();
  }

  sampleSplineData() {
    this.sampledPoints = [];
    this.sampledTangents = [];
    this.sampledNormals = [];
    this.sampledBinormals = [];

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.numSamples; i++) {
      const u = i / this.numSamples;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();

      let binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      if (binormal.lengthSq() < 0.001) {
        binormal = new THREE.Vector3(1, 0, 0);
      }
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      this.sampledPoints.push(pt);
      this.sampledTangents.push(tangent);
      this.sampledNormals.push(normal);
      this.sampledBinormals.push(binormal);
    }
  }

  /**
   * Spatial clearance check: guarantees pos is at least minDistance
   * away from the entire road ribbon, kerbs, and all 480 spline points.
   */
  isClearOfTrack(pos, minMargin = 8.0) {
    const minRequiredDist = (this.roadWidth * 0.5) + this.kerbWidth + minMargin;
    const minRequiredDistSq = minRequiredDist * minRequiredDist;

    for (let i = 0; i < this.sampledPoints.length; i++) {
      const dSq = pos.distanceToSquared(this.sampledPoints[i]);
      if (dSq < minRequiredDistSq) {
        return false;
      }
    }
    return true;
  }

  buildRoadMeshes() {
    const asphaltTex = ProceduralTextures.createAsphaltTexture();
    const kerbRedTex = ProceduralTextures.createKerbTexture(false);
    const kerbBlueTex = ProceduralTextures.createKerbTexture(true);

    const roadGeo = new THREE.BufferGeometry();
    const kerbLeftGeo = new THREE.BufferGeometry();
    const kerbRightGeo = new THREE.BufferGeometry();

    const roadPos = [], roadUv = [], roadIdx = [];
    const kerbLPos = [], kerbLUv = [], kerbLIdx = [];
    const kerbRPos = [], kerbRUv = [], kerbRIdx = [];

    const halfW = this.roadWidth * 0.5;
    const kerbW = this.kerbWidth;

    for (let i = 0; i <= this.numSamples; i++) {
      const idx = i % this.numSamples;
      const pt = this.sampledPoints[idx];
      const binormal = this.sampledBinormals[idx];
      const normal = this.sampledNormals[idx];

      const vUv = (i / this.numSamples) * 60;

      // Road Left & Right
      const pL = new THREE.Vector3().copy(pt).addScaledVector(binormal, -halfW);
      const pR = new THREE.Vector3().copy(pt).addScaledVector(binormal, halfW);

      roadPos.push(pL.x, pL.y, pL.z);
      roadPos.push(pR.x, pR.y, pR.z);
      roadUv.push(0, vUv, 1, vUv);

      // Kerb Left
      const pKL = new THREE.Vector3().copy(pL).addScaledVector(binormal, -kerbW).addScaledVector(normal, 0.28);
      kerbLPos.push(pL.x, pL.y, pL.z);
      kerbLPos.push(pKL.x, pKL.y, pKL.z);
      kerbLUv.push(0, vUv * 2, 1, vUv * 2);

      // Kerb Right
      const pKR = new THREE.Vector3().copy(pR).addScaledVector(binormal, kerbW).addScaledVector(normal, 0.28);
      kerbRPos.push(pR.x, pR.y, pR.z);
      kerbRPos.push(pKR.x, pKR.y, pKR.z);
      kerbRUv.push(0, vUv * 2, 1, vUv * 2);

      if (i < this.numSamples) {
        const base = i * 2;
        roadIdx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        kerbLIdx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        kerbRIdx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUv, 2));
    roadGeo.setIndex(roadIdx);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.75,
      metalness: 0.1,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    // Kerbs
    const kerbMatRed = new THREE.MeshStandardMaterial({ map: kerbRedTex, roughness: 0.6 });
    const kerbMatBlue = new THREE.MeshStandardMaterial({ map: kerbBlueTex, roughness: 0.6 });

    kerbLeftGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbLPos, 3));
    kerbLeftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kerbLUv, 2));
    kerbLeftGeo.setIndex(kerbLIdx);
    kerbLeftGeo.computeVertexNormals();
    this.kerbMeshLeft = new THREE.Mesh(kerbLeftGeo, kerbMatRed);
    this.kerbMeshLeft.receiveShadow = true;
    this.scene.add(this.kerbMeshLeft);

    kerbRightGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbRPos, 3));
    kerbRightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kerbRUv, 2));
    kerbRightGeo.setIndex(kerbRIdx);
    kerbRightGeo.computeVertexNormals();
    this.kerbMeshRight = new THREE.Mesh(kerbRightGeo, kerbMatBlue);
    this.kerbMeshRight.receiveShadow = true;
    this.scene.add(this.kerbMeshRight);

    // 3. Solid Concrete Foundation Skirts Underneath Road & Kerbs (eliminates floating in mid-air!)
    const skirtGeo = new THREE.BufferGeometry();
    const skirtPos = [], skirtUv = [], skirtIdx = [];
    const skirtDepth = 6.0;

    for (let i = 0; i <= this.numSamples; i++) {
      const idx = i % this.numSamples;
      const pt = this.sampledPoints[idx];
      const binormal = this.sampledBinormals[idx];
      const normal = this.sampledNormals[idx];

      const pKL = new THREE.Vector3().copy(pt).addScaledVector(binormal, -halfW - kerbW).addScaledVector(normal, 0.28);
      const pKR = new THREE.Vector3().copy(pt).addScaledVector(binormal, halfW + kerbW).addScaledVector(normal, 0.28);

      const pKL_bot = new THREE.Vector3().copy(pKL).sub(new THREE.Vector3(0, Math.max(skirtDepth, pKL.y + 1.0), 0));
      const pKR_bot = new THREE.Vector3().copy(pKR).sub(new THREE.Vector3(0, Math.max(skirtDepth, pKR.y + 1.0), 0));

      const base = i * 4;
      skirtPos.push(pKL.x, pKL.y, pKL.z);
      skirtPos.push(pKL_bot.x, pKL_bot.y, pKL_bot.z);
      skirtPos.push(pKR.x, pKR.y, pKR.z);
      skirtPos.push(pKR_bot.x, pKR_bot.y, pKR_bot.z);

      skirtUv.push(0, 0, 0, 1, 1, 0, 1, 1);

      if (i < this.numSamples) {
        // Left outer skirt wall
        skirtIdx.push(base, base + 1, base + 4);
        skirtIdx.push(base + 1, base + 5, base + 4);

        // Right outer skirt wall
        skirtIdx.push(base + 2, base + 6, base + 3);
        skirtIdx.push(base + 3, base + 6, base + 7);
      }
    }

    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPos, 3));
    skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUv, 2));
    skirtGeo.setIndex(skirtIdx);
    skirtGeo.computeVertexNormals();

    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Concrete slate foundation
      roughness: 0.85,
      metalness: 0.1,
    });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.receiveShadow = true;
    this.scene.add(skirtMesh);

    // 4. Continuous Outer Crash Guardrails along elevated curves
    this.buildOuterGuardrails();

    // Lush rolling green terrain underneath
    const terrainGeo = new THREE.PlaneGeometry(900, 900, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      let vy = Math.sin(vx * 0.012) * Math.cos(vz * 0.012) * 8 - 2.5;
      if (Math.sqrt(vx * vx + vz * vz) < 140) vy -= 1.5;
      posAttr.setY(i, vy);
    }
    terrainGeo.computeVertexNormals();

    const grassTex = ProceduralTextures.createGrassTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.6;
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  buildOuterGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.3,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });

    const halfW = this.roadWidth * 0.5 + this.kerbWidth + 0.3;
    // Support posts as a single InstancedMesh (1 draw call instead of 120!)
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
    const postCount = Math.floor(this.numSamples / 8) * 2;
    const postInstanced = new THREE.InstancedMesh(postGeo, postMat, postCount);
    postInstanced.castShadow = true;
    postInstanced.receiveShadow = true;

    let postIdx = 0;
    const dummyMat = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const posL = [], posR = [];

    for (let i = 0; i < this.numSamples; i++) {
      const idx = i;
      const pt = this.sampledPoints[idx];
      const binormal = this.sampledBinormals[idx];
      const normal = this.sampledNormals[idx];

      const pL = new THREE.Vector3().copy(pt).addScaledVector(binormal, -halfW).addScaledVector(normal, 0.9);
      const pR = new THREE.Vector3().copy(pt).addScaledVector(binormal, halfW).addScaledVector(normal, 0.9);

      posL.push(pL.x, pL.y, pL.z);
      posR.push(pR.x, pR.y, pR.z);

      if (i % 8 === 0 && postIdx < postCount) {
        dummyPos.copy(pL).addScaledVector(normal, -0.45);
        dummyMat.setPosition(dummyPos);
        postInstanced.setMatrixAt(postIdx++, dummyMat);

        dummyPos.copy(pR).addScaledVector(normal, -0.45);
        dummyMat.setPosition(dummyPos);
        postInstanced.setMatrixAt(postIdx++, dummyMat);
      }
    }
    postInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(postInstanced);

    // Double tube rails
    const curveL = new THREE.CatmullRomCurve3(this.pointsFromFlatArray(posL), true);
    const curveR = new THREE.CatmullRomCurve3(this.pointsFromFlatArray(posR), true);

    const tubeGeoL = new THREE.TubeGeometry(curveL, 300, 0.18, 6, true);
    const tubeGeoR = new THREE.TubeGeometry(curveR, 300, 0.18, 6, true);

    const tubeL = new THREE.Mesh(tubeGeoL, railMat);
    const tubeR = new THREE.Mesh(tubeGeoR, railMat);
    this.scene.add(tubeL);
    this.scene.add(tubeR);
  }

  pointsFromFlatArray(arr) {
    const pts = [];
    for (let i = 0; i < arr.length; i += 3) {
      pts.push(new THREE.Vector3(arr[i], arr[i + 1], arr[i + 2]));
    }
    return pts;
  }

  buildCheckpoints() {
    this.checkpoints = [];
    for (let i = 0; i < this.checkpointCount; i++) {
      const u = i / this.checkpointCount;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      this.checkpoints.push({
        index: i,
        u: u,
        position: pt,
        tangent: tangent,
        binormal: binormal,
        radius: this.roadWidth * 0.75,
      });
    }

    this.itemBoxLocations = [0.15, 0.40, 0.65, 0.88];
    this.speedPadLocations = [0.28, 0.76];
  }

  initCoinLocations() {
    // 24 collectible coins placed in 4 strategic racing lines
    this.coinLocations = [];
    const clusters = [
      { startU: 0.06, count: 6, offset: -4.0 },  // Straightaway left lane
      { startU: 0.22, count: 6, offset: 4.0 },   // Turn 1 inside apex line
      { startU: 0.52, count: 6, offset: 0.0 },   // Chicane center line
      { startU: 0.82, count: 6, offset: -3.5 },  // Valley corner apex
    ];

    clusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        const u = (c.startU + i * 0.014) % 1.0;
        this.coinLocations.push({ u, offset: c.offset });
      }
    });
  }

  buildStartGantry() {
    const cheqTex = ProceduralTextures.createChequeredTexture();

    // Start / Finish Line Decal on the road
    const startPt = this.curve.getPointAt(0.04); // z=40
    const startTangent = this.curve.getTangentAt(0.04).normalize();
    const startNormal = this.getSurfaceNormal(0.04);
    const startBinormal = new THREE.Vector3().crossVectors(startTangent, startNormal).normalize();

    const finishGeo = new THREE.PlaneGeometry(this.roadWidth + 2, 7);
    const finishMat = new THREE.MeshStandardMaterial({
      map: cheqTex,
      roughness: 0.5,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const finishMesh = new THREE.Mesh(finishGeo, finishMat);
    finishMesh.position.copy(startPt).addScaledVector(startNormal, 0.04);
    const rotMat = new THREE.Matrix4().makeBasis(startBinormal, startTangent, startNormal);
    finishMesh.quaternion.setFromRotationMatrix(rotMat);
    this.scene.add(finishMesh);

    // Overhead Mario Kart Gantry Arch
    const archGroup = new THREE.Group();
    archGroup.position.copy(startPt);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
    const postGeo = new THREE.CylinderGeometry(0.7, 0.7, 11, 16);

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-this.roadWidth * 0.5 - 2.5, 5.5, 0);
    archGroup.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(this.roadWidth * 0.5 + 2.5, 5.5, 0);
    archGroup.add(postR);

    // Red/White Checkered Crossbeam
    const beamGeo = new THREE.BoxGeometry(this.roadWidth + 7, 2.8, 1.6);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xe62429, metalness: 0.5, roughness: 0.3 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 9.8, 0);
    archGroup.add(beam);

    // Banner
    const bannerTex = ProceduralTextures.createBillboardTexture('MARIO KART GP', '★ MARIO CIRCUIT SPEEDWAY ★');
    const bannerGeo = new THREE.PlaneGeometry(this.roadWidth + 4, 2.6);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 9.8, 0.85);
    archGroup.add(banner);

    // Start Lights (3 Red lights, 1 Green light) on bottom of beam
    this.startLights = [];
    const lightOffsets = [-4.5, -1.5, 1.5, 4.5];
    lightOffsets.forEach((xOff, idx) => {
      const lightHousingGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
      lightHousingGeo.rotateX(Math.PI / 2);
      const lightHousing = new THREE.Mesh(lightHousingGeo, postMat);
      lightHousing.position.set(xOff, 7.8, 0.6);
      archGroup.add(lightHousing);

      const bulbGeo = new THREE.SphereGeometry(0.38, 16, 16);
      const isGreenBulb = idx === 3;
      const bulbMat = new THREE.MeshStandardMaterial({
        color: isGreenBulb ? 0x004400 : 0x440000,
        emissive: 0x000000,
        roughness: 0.3,
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(xOff, 7.8, 0.75);
      archGroup.add(bulb);

      this.startLights.push({
        mesh: bulb,
        isGreen: isGreenBulb,
        activeColor: isGreenBulb ? 0x00ff44 : 0xff1122,
        offColor: isGreenBulb ? 0x004400 : 0x440000,
      });
    });

    const archRot = new THREE.Matrix4().makeBasis(startBinormal, startNormal, startTangent);
    archGroup.quaternion.setFromRotationMatrix(archRot);
    this.scene.add(archGroup);
  }

  updateStartLights(countdownSec) {
    // countdownSec: 3 -> light 0 on, 2 -> light 1 on, 1 -> light 2 on, 0 (GO) -> light 3 (green) on!
    this.startLights.forEach((light, i) => {
      let turnOn = false;
      if (countdownSec === 3 && i === 0) turnOn = true;
      else if (countdownSec === 2 && i <= 1) turnOn = true;
      else if (countdownSec === 1 && i <= 2) turnOn = true;
      else if (countdownSec <= 0) turnOn = (i === 3);

      if (turnOn) {
        light.mesh.material.color.setHex(light.activeColor);
        light.mesh.material.emissive.setHex(light.activeColor);
        light.mesh.material.emissiveIntensity = 1.0;
      } else {
        light.mesh.material.color.setHex(light.offColor);
        light.mesh.material.emissive.setHex(0x000000);
        light.mesh.material.emissiveIntensity = 0.0;
      }
    });
  }

  buildGrandstand() {
    // Safely positioned at x = -36, z = 45, completely clear of road (road edge is at x = -13.4)
    const group = new THREE.Group();
    group.position.set(-36, 0, 45);

    // 1. Concrete Safety Barrier along the track side (x = 18 relative to grandstand)
    const barrierGeo = new THREE.BoxGeometry(1.2, 1.6, 70);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(18, 0.8, 0);
    group.add(barrier);

    // Double Horizontal Crash Guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const railGeo = new THREE.CylinderGeometry(0.12, 0.12, 70, 8);
    railGeo.rotateX(Math.PI / 2);

    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(18, 2.0, 0);
    group.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(18, 2.8, 0);
    group.add(rail2);

    // Vertical support posts
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8);
    for (let z = -32; z <= 32; z += 8) {
      const p = new THREE.Mesh(postGeo, railMat);
      p.position.set(18, 2.0, z);
      group.add(p);
    }

    // 2. Grandstand steps
    const stepGeo = new THREE.BoxGeometry(34, 1.5, 3.2);
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });

    const specColors = [0xff2222, 0x2288ff, 0xffdd22, 0x22cc66, 0xff77aa, 0xffffff];
    const specGeo = new THREE.SphereGeometry(0.45, 6, 6);

    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(0, s * 1.5 + 0.75, s * 3.2);
      group.add(step);

      // Spectators on bleachers
      for (let p = -14; p <= 14; p += 2.0) {
        if (Math.random() > 0.15) {
          const color = specColors[Math.floor(Math.random() * specColors.length)];
          const specMat = new THREE.MeshBasicMaterial({ color: color });
          const spec = new THREE.Mesh(specGeo, specMat);
          spec.position.set(p + (Math.random() - 0.5) * 0.4, s * 1.5 + 2.1, s * 3.2);
          group.add(spec);
        }
      }
    }

    // Roof canopy
    const roofGeo = new THREE.BoxGeometry(36, 0.6, 20);
    const roof = new THREE.Mesh(roofGeo, canopyMat);
    roof.position.set(0, 11, 8);
    roof.rotation.x = -0.15;
    group.add(roof);

    this.scene.add(group);
  }

  buildPipesAndScenery() {
    // 1. Green Warp Pipes placed strictly outside the track
    const pipeConfigs = [
      new THREE.Vector3(-24, 0, 100),
      new THREE.Vector3(26, 0, -20),
      new THREE.Vector3(120, 8, 140),
      new THREE.Vector3(200, 4, 30),
      new THREE.Vector3(-100, 2, -140),
      new THREE.Vector3(-80, 0, 10),
    ];

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x00cc44, roughness: 0.2, metalness: 0.3 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x009933, roughness: 0.2, metalness: 0.3 });

    pipeConfigs.forEach(pos => {
      if (!this.isClearOfTrack(pos, 4.0)) return;

      const pipeGroup = new THREE.Group();
      pipeGroup.position.copy(pos);

      // Main pipe cylinder
      const pipeGeo = new THREE.CylinderGeometry(2.0, 2.0, 5, 20);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.y = 2.5;
      pipe.castShadow = true;
      pipeGroup.add(pipe);

      // Pipe top collar rim
      const collarGeo = new THREE.CylinderGeometry(2.5, 2.5, 1.2, 20);
      const collar = new THREE.Mesh(collarGeo, rimMat);
      collar.position.y = 4.8;
      pipeGroup.add(collar);

      // Black inside
      const insideGeo = new THREE.CircleGeometry(2.1, 20);
      insideGeo.rotateX(-Math.PI / 2);
      const insideMat = new THREE.MeshBasicMaterial({ color: 0x051a05 });
      const inside = new THREE.Mesh(insideGeo, insideMat);
      inside.position.y = 5.41;
      pipeGroup.add(inside);

      this.scene.add(pipeGroup);
    });

    // 2. Procedural Trees with InstancedMesh (2 draw calls for all trees!)
    const maxTrees = 80;
    const treeGeoCone = new THREE.ConeGeometry(3.5, 9, 7);
    const treeMatFoliage = new THREE.MeshStandardMaterial({ color: 0x1e7e34, roughness: 0.8, flatShading: true });
    const treeGeoTrunk = new THREE.CylinderGeometry(0.6, 0.8, 4, 6);
    const treeMatTrunk = new THREE.MeshStandardMaterial({ color: 0x5a381e, roughness: 0.9 });

    const foliageInstanced = new THREE.InstancedMesh(treeGeoCone, treeMatFoliage, maxTrees);
    const trunkInstanced = new THREE.InstancedMesh(treeGeoTrunk, treeMatTrunk, maxTrees);
    foliageInstanced.castShadow = true;
    foliageInstanced.receiveShadow = true;
    trunkInstanced.castShadow = true;
    trunkInstanced.receiveShadow = true;

    let placedTrees = 0;
    let attempts = 0;
    const dummyMat = new THREE.Matrix4();
    const dummyScale = new THREE.Vector3();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();

    while (placedTrees < maxTrees && attempts < 450) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 48 + Math.random() * 260;
      const testPos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      // Strictly ensure clearance from ALL track points (margin 8.0 units!)
      if (this.isClearOfTrack(testPos, 8.0)) {
        const s = 0.8 + Math.random() * 0.6;
        dummyScale.set(s, s, s);

        // Trunk
        dummyPos.set(testPos.x, testPos.y + 2.0 * s, testPos.z);
        dummyMat.compose(dummyPos, dummyQuat, dummyScale);
        trunkInstanced.setMatrixAt(placedTrees, dummyMat);

        // Foliage
        dummyPos.set(testPos.x, testPos.y + 7.0 * s, testPos.z);
        dummyMat.compose(dummyPos, dummyQuat, dummyScale);
        foliageInstanced.setMatrixAt(placedTrees, dummyMat);

        placedTrees++;
      }
    }

    trunkInstanced.count = placedTrees;
    foliageInstanced.count = placedTrees;
    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;

    this.scene.add(trunkInstanced);
    this.scene.add(foliageInstanced);
  }

  buildHotAirBalloon() {
    const balloonGroup = new THREE.Group();
    balloonGroup.position.set(60, 95, 20);

    // Colorful segmented balloon envelope
    const sphereGeo = new THREE.SphereGeometry(16, 24, 18);
    sphereGeo.scale(1, 1.35, 1);
    const balloonMat = new THREE.MeshStandardMaterial({
      color: 0xff3344,
      roughness: 0.4,
      metalness: 0.1,
    });
    const balloon = new THREE.Mesh(sphereGeo, balloonMat);
    balloonGroup.add(balloon);

    // Basket underneath
    const basketGeo = new THREE.BoxGeometry(4, 3, 4);
    const basketMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const basket = new THREE.Mesh(basketGeo, basketMat);
    basket.position.y = -22;
    balloonGroup.add(basket);

    this.scene.add(balloonGroup);
    this.hotAirBalloon = balloonGroup;
  }

  buildSpeedPads() {
    this.speedPads = [];
    const padTex = ProceduralTextures.createSpeedPadTexture();
    const padMat = new THREE.MeshBasicMaterial({
      map: padTex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.speedPadLocations.forEach(u => {
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = this.getSurfaceNormal(u);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const padGeo = new THREE.PlaneGeometry(8, 12);
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.copy(pt).addScaledVector(normal, 0.06);

      const rotMat = new THREE.Matrix4().makeBasis(binormal, tangent, normal);
      padMesh.quaternion.setFromRotationMatrix(rotMat);

      this.scene.add(padMesh);

      this.speedPads.push({
        u: u,
        position: pt,
        radius: 6.0,
      });
    });
  }

  checkSpeedPad(kart) {
    if (kart.speedPadCooldown > 0) return false;
    for (const pad of this.speedPads) {
      if (kart.position.distanceTo(pad.position) < pad.radius) {
        kart.speedPadCooldown = 1.8;
        return true;
      }
    }
    return false;
  }

  // --- Spline Queries ---

  getPointAt(u) {
    const wrappedU = ((u % 1.0) + 1.0) % 1.0;
    return this.curve.getPointAt(wrappedU);
  }

  getTangentAt(u) {
    const wrappedU = ((u % 1.0) + 1.0) % 1.0;
    return this.curve.getTangentAt(wrappedU).normalize();
  }

  getBinormalAt(u) {
    const tangent = this.getTangentAt(u);
    const normal = this.getSurfaceNormal(u);
    return new THREE.Vector3().crossVectors(tangent, normal).normalize();
  }

  getSurfaceNormal(u) {
    const wrappedU = ((u % 1.0) + 1.0) % 1.0;
    const tangent = this.curve.getTangentAt(wrappedU).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    return new THREE.Vector3().crossVectors(binormal, tangent).normalize();
  }

  getClosestParam(pos, currentU = 0) {
    let closestU = currentU;
    let minDistSq = Infinity;
    const searchRange = 0.08;
    const steps = 24;

    for (let i = -steps; i <= steps; i++) {
      const testU = (((currentU + (i / steps) * searchRange) % 1.0) + 1.0) % 1.0;
      const pt = this.getPointAt(testU);
      const dSq = pos.distanceToSquared(pt);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestU = testU;
      }
    }

    // Continuous Sub-Sample Refinement (eliminates all discrete jumping & flickering!)
    let stepSize = searchRange / steps;
    for (let iter = 0; iter < 4; iter++) {
      const u1 = (((closestU - stepSize * 0.5) % 1.0) + 1.0) % 1.0;
      const u2 = (((closestU + stepSize * 0.5) % 1.0) + 1.0) % 1.0;
      const d1 = pos.distanceToSquared(this.getPointAt(u1));
      const d2 = pos.distanceToSquared(this.getPointAt(u2));
      if (d1 < minDistSq) {
        minDistSq = d1;
        closestU = u1;
      } else if (d2 < minDistSq) {
        minDistSq = d2;
        closestU = u2;
      }
      stepSize *= 0.5;
    }

    return closestU;
  }

  getLateralOffset(pos, u) {
    const centerPt = this.getPointAt(u);
    const binormal = this.getBinormalAt(u);
    return new THREE.Vector3().subVectors(pos, centerPt).dot(binormal);
  }

  isOnTrack(pos, u) {
    const lateralDist = Math.abs(this.getLateralOffset(pos, u));
    return lateralDist <= (this.roadWidth * 0.5 + this.kerbWidth * 0.5);
  }

  getClampedSurfaceData(pos, u) {
    const centerPt = this.getPointAt(u);
    const normal = this.getSurfaceNormal(u);
    const binormal = this.getBinormalAt(u);
    return {
      groundY: centerPt.y,
      normal: normal,
      tangent: this.getTangentAt(u),
      binormal: binormal,
    };
  }

  /**
   * Prevents karts or shells from falling off elevated road edges into the void
   */
  clampToRoadBounds(pos, u) {
    const centerPt = this.getPointAt(u);
    const binormal = this.getBinormalAt(u);
    const normal = this.getSurfaceNormal(u);
    const maxHalfW = (this.roadWidth * 0.5) + this.kerbWidth - 0.2;

    const latOffset = new THREE.Vector3().subVectors(pos, centerPt).dot(binormal);
    if (Math.abs(latOffset) > maxHalfW) {
      const clampedOffset = Math.sign(latOffset) * maxHalfW;
      pos.copy(centerPt).addScaledVector(binormal, clampedOffset).addScaledVector(normal, 0.35);
      return { clamped: true, bounceDir: -Math.sign(latOffset) };
    }
    return { clamped: false, bounceDir: 0 };
  }
}
