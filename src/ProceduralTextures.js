import * as THREE from 'three';

/**
 * Generates all procedural textures on HTML5 Canvases.
 * Zero external textures or network requests.
 */
export class ProceduralTextures {
  static createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Vibrant arcade tarmac
    ctx.fillStyle = '#222733';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine texture grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle road aggregate dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 3000; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    // Outer white road edge lines
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 4;
    ctx.fillRect(24, 0, 18, 1024);
    ctx.fillRect(1024 - 42, 0, 18, 1024);

    // Dashed center yellow stripes
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = 'rgba(255, 204, 0, 0.6)';
    ctx.shadowBlur = 6;
    const dashLength = 70;
    const gapLength = 70;
    for (let y = 0; y < 1024; y += dashLength + gapLength) {
      ctx.fillRect(504, y, 16, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 45);
    texture.anisotropy = 8;
    return texture;
  }

  static createKerbTexture(isBlue = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const primaryColor = isBlue ? '#0066ff' : '#e62429';
    const stripeWidth = 32;

    for (let i = -256; i < 512; i += stripeWidth * 2) {
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripeWidth, 0);
      ctx.lineTo(i + stripeWidth + 64, 256);
      ctx.lineTo(i + 64, 256);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(i + stripeWidth, 0);
      ctx.lineTo(i + stripeWidth * 2, 0);
      ctx.lineTo(i + stripeWidth * 2 + 64, 256);
      ctx.lineTo(i + stripeWidth + 64, 256);
      ctx.closePath();
      ctx.fill();
    }

    // Bevel shadow on inner curb edge
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(0.15, 'rgba(0,0,0,0)');
    grad.addColorStop(0.85, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 90);
    return texture;
  }

  static createChequeredTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const rows = 4;
    const cols = 16;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    // Gold borders
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, canvas.width, 6);
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Mario vibrant green grass
    ctx.fillStyle = '#3eb544';
    ctx.fillRect(0, 0, 512, 512);

    // Alternating lawn mowed stripes
    const stripeW = 64;
    for (let x = 0; x < 512; x += stripeW * 2) {
      ctx.fillStyle = '#49c750';
      ctx.fillRect(x, 0, stripeW, 512);
    }

    // Subtle noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 0.5));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(30, 30);
    return texture;
  }

  static createItemBoxTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Holographic gradient
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, 'rgba(0, 220, 255, 0.85)');
    grad.addColorStop(0.35, 'rgba(180, 0, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 0, 140, 0.85)');
    grad.addColorStop(1, 'rgba(255, 230, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Glowing border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 232, 232);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 204, 204);

    // Bold "?" Question Mark
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.font = '900 135px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createCoinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Golden Coin Face
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, '#fff488');
    grad.addColorStop(0.6, '#ffd700');
    grad.addColorStop(1, '#d4af37');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center star / slot
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(58, 30, 12, 68);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createSpeedPadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Cyber / Arcade neon pad background
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#00f6ff';
    ctx.shadowColor = '#00f6ff';
    ctx.shadowBlur = 15;

    for (let y = 35; y <= 185; y += 65) {
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(215, y + 45);
      ctx.lineTo(185, y + 45);
      ctx.lineTo(128, y + 16);
      ctx.lineTo(71, y + 45);
      ctx.lineTo(41, y + 45);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createBillboardTexture(title, subtitle) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Banner
    const grad = ctx.createLinearGradient(0, 0, 512, 128);
    grad.addColorStop(0, '#e62429');
    grad.addColorStop(0.5, '#0055dd');
    grad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.font = '900 38px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 54);

    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.font = '700 24px sans-serif';
    ctx.fillText(subtitle, 256, 98);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
