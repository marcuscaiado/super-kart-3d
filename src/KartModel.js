import * as THREE from 'three';
import { ShaderFactory } from './Shaders.js';

/**
 * Procedural 3D Kart Models for Mario, Luigi, Peach, and Bowser.
 * Includes distinct character caps/crowns/horns, articulated steering,
 * spinning wheels with alloy rims, and dual exhaust pipes.
 */
export class KartModel {
  static createKartMesh(config = {}) {
    const {
      character = 'mario',
      primaryColor = 0xe52521,
      secondaryColor = 0xffffff,
      accentColor = 0x0055dd,
      rimColor = 0xffd700,
    } = config;

    const kartGroup = new THREE.Group();

    // Stylized Toy Enamel Materials with Fresnel Rim Lighting
    const bodyMat = ShaderFactory.createToyMaterial({
      color: primaryColor,
      metalness: 0.35,
      roughness: 0.25,
      rimColor: 0xffffff,
      rimPower: 2.4,
      rimIntensity: 0.75,
    });
    const secMat = ShaderFactory.createToyMaterial({
      color: secondaryColor,
      metalness: 0.25,
      roughness: 0.25,
      rimColor: 0xffffff,
      rimPower: 2.4,
      rimIntensity: 0.5,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.8, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.9 });
    const rimMat = ShaderFactory.createToyMaterial({
      color: rimColor,
      metalness: 0.75,
      roughness: 0.18,
      rimColor: 0xffeedd,
      rimPower: 2.0,
      rimIntensity: 0.85,
    });

    // 1. Chassis Floorpan & Cockpit Tub
    const floorGeo = new THREE.BoxGeometry(2.6, 0.25, 4.4);
    const floor = new THREE.Mesh(floorGeo, darkMat);
    floor.position.set(0, 0.45, 0);
    floor.castShadow = true;
    kartGroup.add(floor);

    const tubGeo = new THREE.BoxGeometry(1.8, 0.7, 3.0);
    const tub = new THREE.Mesh(tubGeo, bodyMat);
    tub.position.set(0, 0.8, -0.2);
    tub.castShadow = true;
    kartGroup.add(tub);

    // Front Nosecone & Bumper
    const noseGeo = new THREE.BoxGeometry(1.5, 0.45, 1.5);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0.6, 1.8);
    nose.rotation.x = 0.14;
    nose.castShadow = true;
    kartGroup.add(nose);

    // White circular emblem on nose
    const emblemGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.05, 16);
    emblemGeo.rotateX(Math.PI / 2 + 0.14);
    const emblem = new THREE.Mesh(emblemGeo, secMat);
    emblem.position.set(0, 0.82, 1.8);
    kartGroup.add(emblem);

    const bumperGeo = new THREE.BoxGeometry(2.8, 0.22, 0.6);
    const bumper = new THREE.Mesh(bumperGeo, secMat);
    bumper.position.set(0, 0.48, 2.5);
    bumper.castShadow = true;
    kartGroup.add(bumper);

    // Side Pods
    const sidePodGeo = new THREE.BoxGeometry(0.5, 0.55, 2.3);
    const podL = new THREE.Mesh(sidePodGeo, bodyMat);
    podL.position.set(-1.25, 0.7, -0.1);
    podL.castShadow = true;
    kartGroup.add(podL);

    const podR = new THREE.Mesh(sidePodGeo, bodyMat);
    podR.position.set(1.25, 0.7, -0.1);
    podR.castShadow = true;
    kartGroup.add(podR);

    // Engine Cover
    const engineGeo = new THREE.BoxGeometry(1.4, 0.7, 1.1);
    const engine = new THREE.Mesh(engineGeo, darkMat);
    engine.position.set(0, 0.9, -1.5);
    engine.castShadow = true;
    kartGroup.add(engine);

    // Rear Wing / Spoiler
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
    const strutL = new THREE.Mesh(strutGeo, darkMat);
    strutL.position.set(-0.75, 1.3, -2.0);
    strutL.rotation.x = -0.22;
    kartGroup.add(strutL);

    const strutR = new THREE.Mesh(strutGeo, darkMat);
    strutR.position.set(0.75, 1.3, -2.0);
    strutR.rotation.x = -0.22;
    kartGroup.add(strutR);

    const wingGeo = new THREE.BoxGeometry(2.7, 0.15, 0.85);
    const wing = new THREE.Mesh(wingGeo, secMat);
    wing.position.set(0, 1.75, -2.15);
    wing.rotation.x = -0.1;
    wing.castShadow = true;
    kartGroup.add(wing);

    // Dual Chrome Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.75, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    const exL = new THREE.Mesh(exhaustGeo, chromeMat);
    exL.position.set(-0.5, 0.6, -2.25);
    kartGroup.add(exL);

    const exR = new THREE.Mesh(exhaustGeo, chromeMat);
    exR.position.set(0.5, 0.6, -2.25);
    kartGroup.add(exR);

    // Steering Column & Wheel
    const steerPivot = new THREE.Group();
    steerPivot.position.set(0, 0.9, 0.6);
    const colGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
    colGeo.rotateX(Math.PI / 4);
    const col = new THREE.Mesh(colGeo, darkMat);
    col.position.set(0, 0.15, -0.15);
    steerPivot.add(col);

    const wheelGeo = new THREE.TorusGeometry(0.28, 0.05, 8, 16);
    const wheelM = new THREE.Mesh(wheelGeo, darkMat);
    wheelM.position.set(0, 0.35, -0.35);
    wheelM.rotation.x = -Math.PI / 4;
    steerPivot.add(wheelM);
    kartGroup.add(steerPivot);

    // 2. Character Driver Figure
    const driverGroup = new THREE.Group();
    driverGroup.position.set(0, 0.95, -0.15);

    // Torso / Overalls
    const suitMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 });
    const torsoGeo = new THREE.BoxGeometry(0.9, 0.75, 0.65);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.set(0, 0.38, 0);
    driverGroup.add(torso);

    // Driver Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.6 });
    const headGeo = new THREE.SphereGeometry(0.44, 16, 16);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.05, 0);
    head.castShadow = true;
    driverGroup.add(head);

    // Character Headgear Customization
    if (character === 'peach') {
      // Golden Crown
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
      const crownGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.35, 5);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 1.5, 0);
      driverGroup.add(crown);
    } else if (character === 'bowser') {
      // Horns on head & Spiked Shell back
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const hornGeo = new THREE.ConeGeometry(0.12, 0.5, 6);
      const hornL = new THREE.Mesh(hornGeo, hornMat);
      hornL.position.set(-0.35, 1.4, -0.1);
      hornL.rotation.z = 0.5;
      driverGroup.add(hornL);

      const hornR = new THREE.Mesh(hornGeo, hornMat);
      hornR.position.set(0.35, 1.4, -0.1);
      hornR.rotation.z = -0.5;
      driverGroup.add(hornR);

      // Green Spiked Shell on back
      const shellGeo = new THREE.SphereGeometry(0.75, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const shellMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.4 });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.rotation.x = -Math.PI / 2;
      shell.position.set(0, 0.45, -0.45);
      driverGroup.add(shell);
    } else {
      // Mario / Luigi Cap
      const capMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
      const capGeo = new THREE.SphereGeometry(0.46, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 1.15, 0);
      driverGroup.add(cap);

      // Cap Visor Bill
      const billGeo = new THREE.BoxGeometry(0.55, 0.08, 0.35);
      const bill = new THREE.Mesh(billGeo, capMat);
      bill.position.set(0, 1.15, 0.4);
      bill.rotation.x = -0.15;
      driverGroup.add(bill);
    }

    // Driver Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.65);
    armGeo.rotateX(Math.PI / 3);
    const armL = new THREE.Mesh(armGeo, suitMat);
    armL.position.set(-0.48, 0.45, 0.25);
    driverGroup.add(armL);

    const armR = new THREE.Mesh(armGeo, suitMat);
    armR.position.set(0.48, 0.45, 0.25);
    driverGroup.add(armR);

    kartGroup.add(driverGroup);

    // 3. Wheels (4 Independent Assemblies)
    const createWheel = (radius, width) => {
      const g = new THREE.Group();
      const tGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
      tGeo.rotateZ(Math.PI / 2);
      const tMesh = new THREE.Mesh(tGeo, tireMat);
      tMesh.castShadow = true;
      g.add(tMesh);

      const rGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width + 0.02, 12);
      rGeo.rotateZ(Math.PI / 2);
      const rMesh = new THREE.Mesh(rGeo, rimMat);
      g.add(rMesh);

      const hGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.06, 8);
      hGeo.rotateZ(Math.PI / 2);
      const hMesh = new THREE.Mesh(hGeo, chromeMat);
      g.add(hMesh);

      return g;
    };

    // Front Wheels
    const rFront = 0.5, wFront = 0.48;
    const axZF = 1.45, axXF = 1.45;

    const frontLeftSteer = new THREE.Group();
    frontLeftSteer.position.set(-axXF, rFront, axZF);
    const wheelFL = createWheel(rFront, wFront);
    frontLeftSteer.add(wheelFL);
    kartGroup.add(frontLeftSteer);

    const frontRightSteer = new THREE.Group();
    frontRightSteer.position.set(axXF, rFront, axZF);
    const wheelFR = createWheel(rFront, wFront);
    frontRightSteer.add(wheelFR);
    kartGroup.add(frontRightSteer);

    // Rear Wheels (Wide racing slicks)
    const rRear = 0.58, wRear = 0.7;
    const axZR = -1.45, axXR = 1.5;

    const wheelRL = createWheel(rRear, wRear);
    wheelRL.position.set(-axXR, rRear, axZR);
    kartGroup.add(wheelRL);

    const wheelRR = createWheel(rRear, wRear);
    wheelRR.position.set(axXR, rRear, axZR);
    kartGroup.add(wheelRR);

    return {
      root: kartGroup,
      frontLeftSteer,
      frontRightSteer,
      wheelFL,
      wheelFR,
      wheelRL,
      wheelRR,
      steerPivot,
      driverGroup,
      exhaustLeftPos: new THREE.Vector3(-0.5, 0.6, -2.4),
      exhaustRightPos: new THREE.Vector3(0.5, 0.6, -2.4),
      tireLeftContact: new THREE.Vector3(-axXR, 0.1, axZR),
      tireRightContact: new THREE.Vector3(axXR, 0.1, axZR),
    };
  }
}
