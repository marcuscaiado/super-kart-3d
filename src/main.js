import * as THREE from 'three';
import { SoundEngine } from './Audio.js';
import { Track } from './Track.js';
import { Kart } from './Kart.js';
import { AIKart } from './AIKart.js';
import { ParticleManager } from './Particles.js';
import { ItemManager } from './ItemManager.js';
import { CameraRig } from './CameraRig.js';
import { HUD } from './HUD.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');

    this.clock = new THREE.Clock();
    this.totalRaceTime = 0.0;
    this.gameState = 'COUNTDOWN';
    this.countdownTimer = 3.2;
    this.lastCountSecond = 4;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.audio = new SoundEngine();
    this.track = null;
    this.particles = null;
    this.itemManager = null;
    this.cameraRig = null;
    this.hud = null;

    this.playerKart = null;
    this.aiKarts = [];
    this.allKarts = [];

    this.keys = {};
    this.touchInputs = {
      throttle: 0,
      steer: 0,
      drift: false,
      useItem: false,
    };

    this.initThree();
    this.initWorld();
    this.initInputListeners();
    this.initTouchControls();
    this.startCountdown();

    window.__gameApp = this;

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x60a5fa); // Mario Sky Blue
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      950
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.targetPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.currentPixelRatio = this.targetPixelRatio;
    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.container.appendChild(this.renderer.domElement);

    // Dynamic Sunlight & Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x337733, 0.9);
    hemiLight.position.set(0, 180, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaee, 1.35);
    sunLight.position.set(130, 220, 110);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 550;
    sunLight.shadow.camera.left = -180;
    sunLight.shadow.camera.right = 180;
    sunLight.shadow.camera.top = 180;
    sunLight.shadow.camera.bottom = -180;
    sunLight.shadow.bias = -0.00005;
    sunLight.shadow.normalBias = 0.03;
    this.scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.35);
    this.scene.add(ambientLight);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    this.track = new Track(this.scene);
    this.particles = new ParticleManager(this.scene);
    this.itemManager = new ItemManager(this.scene, this.track, this.particles, this.audio);

    // 1. Mario (#1 Red Kart - Player)
    this.playerKart = new Kart(this.scene, this.track, this.particles, this.audio, false, {
      character: 'mario',
      name: 'Mario',
      primaryColor: 0xe52521,
      secondaryColor: 0xffffff,
      accentColor: 0x0055dd,
      rimColor: 0xffd700,
    });

    // 2. AI Competitors (Luigi, Peach, Bowser)
    const aiConfigs = [
      {
        character: 'luigi',
        name: 'Luigi',
        primaryColor: 0x00a82d,
        secondaryColor: 0xffffff,
        accentColor: 0x0055dd,
        rimColor: 0xcccccc,
        lanePreference: -3.6,
        speedVariation: 1.02,
      },
      {
        character: 'peach',
        name: 'Peach',
        primaryColor: 0xff69b4,
        secondaryColor: 0xffffff,
        accentColor: 0xffd700,
        rimColor: 0xffaa00,
        lanePreference: 3.6,
        speedVariation: 0.99,
      },
      {
        character: 'bowser',
        name: 'Bowser',
        primaryColor: 0xff8800,
        secondaryColor: 0x228833,
        accentColor: 0x333333,
        rimColor: 0xcc2200,
        lanePreference: 0.5,
        speedVariation: 1.04,
      },
    ];

    this.aiKarts = aiConfigs.map(cfg => new AIKart(this.scene, this.track, this.particles, this.audio, cfg));
    this.allKarts = [this.playerKart, ...this.aiKarts];

    this.cameraRig = new CameraRig(this.camera);
    this.hud = new HUD(this.track, () => this.restartRace());

    this.resetGridPositions();
  }

  resetGridPositions() {
    // Start line is at u=0.040. Stagger karts slightly behind the gantry arch:
    this.playerKart.setStartPosition(0.038, -3.4);
    this.aiKarts[0].setStartPosition(0.034, 3.4);
    this.aiKarts[1].setStartPosition(0.030, -3.4);
    this.aiKarts[2].setStartPosition(0.026, 3.4);

    this.cameraRig.reset(this.playerKart);
  }

  startCountdown() {
    this.gameState = 'COUNTDOWN';
    this.countdownTimer = 3.2;
    this.lastCountSecond = 4;
    this.totalRaceTime = 0.0;
    this.hud.hideVictoryModal();
    this.track.updateStartLights(3);
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      this.keys[e.code] = true;
      if (e.key) this.keys[e.key.toLowerCase()] = true;

      if (e.code === 'KeyE' || e.code === 'Enter' || e.key === 'e' || e.key === 'E') {
        this.usePlayerItem();
      }
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        const isMuted = this.audio.toggleMute();
        const muteBtn = document.getElementById('hud-mute-btn');
        if (muteBtn) muteBtn.textContent = isMuted ? '🔇' : '🔊';
      }
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        this.restartRace();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key) this.keys[e.key.toLowerCase()] = false;
    });

    this.container.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      if (e.button === 0 && !e.target.closest('.interactive-btn') && !e.target.closest('#hud-victory-modal')) {
        this.usePlayerItem();
      }
    });

    const muteBtn = document.getElementById('hud-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }
  }

  initTouchControls() {
    const bindTouch = (id, onStart, onEnd) => {
      const el = document.getElementById(id);
      if (!el) return;

      const handleStart = (e) => {
        e.preventDefault();
        this.audio.unlock();
        onStart();
        el.classList.add('active');
      };

      const handleEnd = (e) => {
        e.preventDefault();
        onEnd();
        el.classList.remove('active');
      };

      el.addEventListener('touchstart', handleStart, { passive: false });
      el.addEventListener('touchend', handleEnd, { passive: false });
      el.addEventListener('mousedown', handleStart);
      el.addEventListener('mouseup', handleEnd);
      el.addEventListener('mouseleave', handleEnd);
    };

    bindTouch('btn-left', () => { this.touchInputs.steer = -1; }, () => { this.touchInputs.steer = 0; });
    bindTouch('btn-right', () => { this.touchInputs.steer = 1; }, () => { this.touchInputs.steer = 0; });
    bindTouch('btn-gas', () => { this.touchInputs.throttle = 1; }, () => { this.touchInputs.throttle = 0; });
    bindTouch('btn-brake', () => { this.touchInputs.throttle = -1; }, () => { this.touchInputs.throttle = 0; });
    bindTouch('btn-drift', () => { this.touchInputs.drift = true; }, () => { this.touchInputs.drift = false; });
    bindTouch('btn-item', () => { this.usePlayerItem(); }, () => {});
  }

  usePlayerItem() {
    if (this.gameState !== 'RACING') return;
    this.itemManager.usePlayerItem(this.playerKart);
  }

  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return null;

    const stickX = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
    const dpadLeft = gp.buttons[14]?.pressed ? -1 : 0;
    const dpadRight = gp.buttons[15]?.pressed ? 1 : 0;
    const steer = stickX !== 0 ? stickX : (dpadLeft + dpadRight);

    const isGas = gp.buttons[7]?.pressed || gp.buttons[0]?.pressed || (gp.buttons[7]?.value > 0.1);
    const isBrake = gp.buttons[6]?.pressed || gp.buttons[1]?.pressed || (gp.buttons[6]?.value > 0.1);
    const isDrift = gp.buttons[5]?.pressed || gp.buttons[2]?.pressed;
    const isItem = gp.buttons[4]?.pressed || gp.buttons[3]?.pressed;

    return {
      throttle: isGas ? 1 : (isBrake ? -1 : 0),
      steer: THREE.MathUtils.clamp(steer, -1, 1),
      drift: isDrift,
      useItem: isItem,
    };
  }

  updateInputs() {
    const gp = this.pollGamepad();

    const keyUp = this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'];
    const keyDown = this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'];
    const keyLeft = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'];
    const keyRight = this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'];
    const keyDrift = this.keys['Space'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys[' '];

    let throttle = 0;
    if (keyUp) throttle += 1;
    if (keyDown) throttle -= 1;

    let steer = 0;
    if (keyLeft) steer -= 1;
    if (keyRight) steer += 1;

    let drift = keyDrift;

    if (this.touchInputs.throttle !== 0) throttle = this.touchInputs.throttle;
    if (this.touchInputs.steer !== 0) steer = this.touchInputs.steer;
    if (this.touchInputs.drift) drift = true;

    if (gp) {
      if (gp.throttle !== 0) throttle = gp.throttle;
      if (Math.abs(gp.steer) > 0.1) steer = gp.steer;
      if (gp.drift) drift = true;
      if (gp.useItem && !this.lastGpItem) {
        this.usePlayerItem();
      }
      this.lastGpItem = gp.useItem;
    }

    if (this.gameState === 'COUNTDOWN') {
      this.playerKart.inputs.throttle = 0;
      this.playerKart.inputs.steer = steer;
      this.playerKart.inputs.drift = false;
      if (keyUp && this.audio) {
        this.audio.updateEngine(0.35, true, false);
      }
      return;
    }

    if (this.gameState === 'FINISHED') {
      this.playerKart.inputs.throttle = 0.35;
      this.playerKart.inputs.steer = 0;
      this.playerKart.inputs.drift = false;
      return;
    }

    this.playerKart.inputs.throttle = throttle;
    this.playerKart.inputs.steer = steer;
    this.playerKart.inputs.drift = drift;
  }

  updateCountdown(dt) {
    if (this.gameState !== 'COUNTDOWN') return;

    this.countdownTimer -= dt;
    const currentSec = Math.ceil(this.countdownTimer);

    if (currentSec !== this.lastCountSecond && currentSec > 0 && currentSec <= 3) {
      this.lastCountSecond = currentSec;
      this.hud.showCountdown(currentSec);
      this.track.updateStartLights(currentSec);
      this.audio.playCountdownBeep(false);
    }

    if (this.countdownTimer <= 0) {
      this.gameState = 'RACING';
      this.hud.showCountdown(0, 'GO!');
      this.track.updateStartLights(0);
      this.audio.playCountdownBeep(true);
      this.playerKart.lapStartTime = 0;
    }
  }

  restartRace() {
    this.gameState = 'COUNTDOWN';
    this.countdownTimer = 3.2;
    this.lastCountSecond = 4;
    this.totalRaceTime = 0.0;

    this.allKarts.forEach(kart => {
      kart.speed = 0;
      kart.lap = 1;
      kart.currentCheckpoint = 0;
      kart.checkpointsPassed = 0;
      kart.coins = 0;
      kart.lapTimes = [];
      kart.bestLapTime = Infinity;
      kart.raceFinished = false;
      kart.finishTime = 0;
      kart.currentItem = null;
      kart.isRoulette = false;
      kart.spinoutTimer = 0;
      kart.boostTimer = 0;
      kart.isDrifting = false;
    });

    this.itemManager.activeShells.forEach(s => this.scene.remove(s.mesh));
    this.itemManager.activeShells = [];
    this.itemManager.activeBananas.forEach(b => this.scene.remove(b.mesh));
    this.itemManager.activeBananas = [];

    this.resetGridPositions();
    this.hud.hideVictoryModal();
    this.track.updateStartLights(3);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.033);

    this.updateCountdown(dt);

    if (this.gameState === 'RACING') {
      this.totalRaceTime += dt;
    }

    this.updateInputs();

    // Update AI Karts (Strict Frenet Spline Pathing)
    const activeObstacles = this.itemManager.getActiveObstacles();
    this.aiKarts.forEach(ai => {
      if (this.gameState === 'RACING' || this.gameState === 'FINISHED') {
        ai.updateAI(dt, this.totalRaceTime, this.playerKart, activeObstacles, this.itemManager);
      }
    });

    // Update Player Kart
    this.playerKart.update(dt, this.totalRaceTime);

    // Update Items & Track Coins
    this.itemManager.update(dt, this.totalRaceTime, this.allKarts);

    // Update Particles
    this.particles.update(dt);

    // Check Race Finish
    if (this.playerKart.raceFinished && this.gameState === 'RACING') {
      this.gameState = 'FINISHED';
      this.hud.showVictoryModal(this.allKarts, this.totalRaceTime);
    }

    // Final Lap Alert
    if (this.playerKart.lap === 3 && !this.playerKart.hasShownFinalLapBanner) {
      this.playerKart.hasShownFinalLapBanner = true;
      this.hud.showFinalLapAlert();
    }

    // Camera
    const isFinished = this.gameState === 'FINISHED';
    this.cameraRig.update(dt, this.playerKart, isFinished);

    // HUD
    this.hud.update(
      this.playerKart,
      this.allKarts,
      this.totalRaceTime,
      this.gameState === 'COUNTDOWN'
    );

    // Dynamic Resolution Scaling (DRS) to guarantee 60 FPS across all devices
    this.fpsFrameCount = (this.fpsFrameCount || 0) + 1;
    this.fpsAccumTime = (this.fpsAccumTime || 0) + rawDt;
    if (this.fpsFrameCount >= 50) {
      const avgDt = this.fpsAccumTime / this.fpsFrameCount;
      if (avgDt > 0.021 && this.currentPixelRatio > 0.85) {
        this.currentPixelRatio = Math.max(0.85, this.currentPixelRatio - 0.15);
        this.renderer.setPixelRatio(this.currentPixelRatio);
      } else if (avgDt < 0.0165 && this.currentPixelRatio < this.targetPixelRatio) {
        this.currentPixelRatio = Math.min(this.targetPixelRatio, this.currentPixelRatio + 0.1);
        this.renderer.setPixelRatio(this.currentPixelRatio);
      }
      this.fpsFrameCount = 0;
      this.fpsAccumTime = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
