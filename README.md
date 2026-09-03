# 🏎️ Super Kart 3D Arcade

A high-performance, ultra-lightweight (~160 KB gzip) 3D arcade kart racer running natively in the browser with Three.js and WebGL.

Play directly online: **[https://marcuscaiado.github.io/super-kart-3d/](https://marcuscaiado.github.io/super-kart-3d/)**

---

## 🎮 Controls

| Action | Keyboard |
|---|---|
| **Accelerate** | `W` or `↑` |
| **Brake / Reverse** | `S` or `↓` |
| **Steer Left / Right** | `A` / `D` or `←` / `→` |
| **Hop & Drift** | `Shift` or `Space` (Hold while steering) |
| **Use Item** | `E` or `Left Click` |
| **Toggle Audio** | Top-right speaker icon |

---

## 🌟 Key Features

- **Authentic Mario Kart Drifting:** Hop initiation, tight apex carving, and 3-stage mini-turbo sparks (Blue $\rightarrow$ Orange $\rightarrow$ Purple) with explosive boost release.
- **Track-Bound Shell Physics:** Green shells ricochet smoothly off curbs within the asphalt corridor without clipping into infinity.
- **Floor Turbos (Speed Pads):** Driving over speed pads triggers rocket mushroom boost acceleration (+50% top speed).
- **Procedural Audio Synthesizer:** Real-time engine pitch modulation, drift screech, coin chimes, item explosions, and 140 BPM synth music generated entirely via Web Audio API.
- **Ultra-Lightweight & Zero External Assets:** Under 161 KB gzip total bundle. No external `.obj`, `.gltf`, or web textures.
- **Optimized Draw Calls:** Batched scenery and guardrails using `THREE.InstancedMesh` with Dynamic Resolution Scaling (DRS) for smooth 60 FPS across all devices.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```
