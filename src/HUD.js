/**
 * Mario Kart 3D Arcade HUD Overlay and UI System.
 * Manages Position counter, Lap timer, Coin counter, Item roulette slot,
 * 3-Stage Drift Gauge, Speedometer, Mini-map with character dots,
 * Start Traffic Lights, and Final Podium Standings.
 */
export class HUD {
  constructor(track, onRestart) {
    this.track = track;
    this.onRestart = onRestart;

    // DOM Elements
    this.posEl = document.getElementById('hud-pos');
    this.posSuffixEl = document.getElementById('hud-pos-suffix');
    this.lapEl = document.getElementById('hud-lap');
    this.timeEl = document.getElementById('hud-time');
    this.bestLapEl = document.getElementById('hud-best-lap');
    this.coinsEl = document.getElementById('hud-coins-val');

    this.itemSlotEl = document.getElementById('hud-item-slot');
    this.itemIconEl = document.getElementById('hud-item-icon');
    this.itemHintEl = document.getElementById('hud-item-hint');

    this.speedDigEl = document.getElementById('hud-speed-val');
    this.speedBarEl = document.getElementById('hud-speed-bar');
    this.driftBarEl = document.getElementById('hud-drift-bar');

    this.countdownEl = document.getElementById('hud-countdown');
    this.finalLapBanner = document.getElementById('hud-final-lap-banner');
    this.speedLinesEl = document.getElementById('hud-speed-lines');

    this.victoryModal = document.getElementById('hud-victory-modal');
    this.victoryRankEl = document.getElementById('hud-victory-rank');
    this.victoryTableEl = document.getElementById('hud-victory-table');
    this.restartBtn = document.getElementById('hud-restart-btn');

    this.radarCanvas = document.getElementById('hud-radar-canvas');
    if (this.radarCanvas) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }

    this.setupListeners();
  }

  setupListeners() {
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        if (this.onRestart) this.onRestart();
      });
    }
  }

  showCountdown(count, text = null) {
    if (!this.countdownEl) return;
    this.countdownEl.style.display = 'block';

    if (count > 0) {
      this.countdownEl.textContent = count;
      this.countdownEl.className = 'countdown-pop count-' + count;
    } else {
      this.countdownEl.textContent = text || 'GO!';
      this.countdownEl.className = 'countdown-pop count-go';
      setTimeout(() => {
        if (this.countdownEl) this.countdownEl.style.display = 'none';
      }, 1000);
    }
  }

  showFinalLapAlert() {
    if (!this.finalLapBanner) return;
    this.finalLapBanner.style.display = 'block';
    setTimeout(() => {
      if (this.finalLapBanner) this.finalLapBanner.style.display = 'none';
    }, 2500);
  }

  formatTime(seconds) {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '--:--.---';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  update(playerKart, allKarts, raceTime, isCountdown) {
    // 1. Position Counter
    const sortedKarts = [...allKarts].sort((a, b) => b.totalSplineProgress - a.totalSplineProgress);
    const playerRank = sortedKarts.findIndex(k => k === playerKart) + 1;

    if (this.posEl) {
      this.posEl.textContent = playerRank;
      if (this.posSuffixEl) {
        const suffixes = ['', 'ST', 'ND', 'RD', 'TH'];
        this.posSuffixEl.textContent = suffixes[playerRank] || 'TH';
      }
    }

    // 2. Lap & Stopwatch
    if (this.lapEl) {
      this.lapEl.textContent = `${Math.min(playerKart.lap, 3)} / 3`;
    }

    if (this.timeEl) {
      this.timeEl.textContent = this.formatTime(raceTime);
    }
    if (this.bestLapEl && playerKart.bestLapTime < Infinity) {
      this.bestLapEl.textContent = this.formatTime(playerKart.bestLapTime);
    }

    // 3. Coin Counter
    if (this.coinsEl) {
      this.coinsEl.textContent = `${playerKart.coins} / 10`;
    }

    // 4. Speedometer
    const kmh = Math.round(Math.abs(playerKart.speed) * 3.0);
    if (this.speedDigEl) {
      this.speedDigEl.textContent = kmh;
    }
    if (this.speedBarEl) {
      const pct = Math.min(100, (kmh / 155) * 100);
      this.speedBarEl.style.width = `${pct}%`;
    }

    // 5. 3-Stage Drift Mini-Turbo Gauge
    if (this.driftBarEl) {
      if (playerKart.isDrifting) {
        const pct = Math.min(100, (playerKart.driftTimer / 3.8) * 100);
        this.driftBarEl.style.width = `${pct}%`;

        if (playerKart.driftSparkLevel === 3) {
          this.driftBarEl.className = 'drift-gauge-bar purple-spark';
        } else if (playerKart.driftSparkLevel === 2) {
          this.driftBarEl.className = 'drift-gauge-bar orange-spark';
        } else if (playerKart.driftSparkLevel === 1) {
          this.driftBarEl.className = 'drift-gauge-bar blue-spark';
        } else {
          this.driftBarEl.className = 'drift-gauge-bar charging';
        }
      } else {
        this.driftBarEl.style.width = '0%';
        this.driftBarEl.className = 'drift-gauge-bar';
      }
    }

    // 6. Item Slot Display
    this.updateItemSlot(playerKart);

    // 7. Boost Speed Lines
    if (this.speedLinesEl) {
      this.speedLinesEl.style.opacity = playerKart.boostTimer > 0 ? '1' : '0';
    }

    // 8. Mini-map Radar
    this.updateRadar(allKarts);
  }

  updateItemSlot(playerKart) {
    if (!this.itemSlotEl || !this.itemIconEl) return;

    if (playerKart.isRoulette) {
      const icons = ['🟢 Green Shell', '🔴 Red Shell', '🍌 Banana', '🍄 Mushroom'];
      const randIcon = icons[Math.floor(Math.random() * icons.length)];
      this.itemIconEl.textContent = randIcon;
      this.itemSlotEl.classList.add('roulette-spin');
      if (this.itemHintEl) this.itemHintEl.textContent = '...';
    } else if (playerKart.currentItem) {
      this.itemSlotEl.classList.remove('roulette-spin');
      if (playerKart.currentItem === 'red_shell') {
        this.itemIconEl.textContent = '🔴 RED SHELL';
      } else if (playerKart.currentItem === 'shell') {
        this.itemIconEl.textContent = '🟢 GREEN SHELL';
      } else if (playerKart.currentItem === 'banana') {
        this.itemIconEl.textContent = '🍌 BANANA PEEL';
      } else if (playerKart.currentItem === 'mushroom') {
        this.itemIconEl.textContent = '🍄 SUPER MUSHROOM';
      }
      if (this.itemHintEl) this.itemHintEl.textContent = '[E] / CLICK TO USE';
    } else {
      this.itemSlotEl.classList.remove('roulette-spin');
      this.itemIconEl.textContent = 'EMPTY';
      if (this.itemHintEl) this.itemHintEl.textContent = 'HIT [?] BOX';
    }
  }

  updateRadar(allKarts) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const minX = -170, maxX = 270;
    const minZ = -310, maxZ = 250;

    const mapX = (x) => ((x - minX) / (maxX - minX)) * (w - 24) + 12;
    const mapY = (z) => ((z - minZ) / (maxZ - minZ)) * (h - 24) + 12;

    // Track ribbon line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < this.track.sampledPoints.length; i++) {
      const pt = this.track.sampledPoints[i];
      const px = mapX(pt.x);
      const py = mapY(pt.z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Start line indicator
    const startPt = this.track.sampledPoints[0];
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(mapX(startPt.x), mapY(startPt.z), 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Character Badges
    allKarts.forEach(k => {
      const kx = mapX(k.position.x);
      const ky = mapY(k.position.z);

      ctx.beginPath();
      ctx.arc(kx, ky, 7, 0, Math.PI * 2);

      let color = '#e52521';
      let label = 'M';
      if (k.character === 'luigi') { color = '#00a82d'; label = 'L'; }
      else if (k.character === 'peach') { color = '#ff69b4'; label = 'P'; }
      else if (k.character === 'bowser') { color = '#ff8800'; label = 'B'; }

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, kx, ky);
    });
  }

  showVictoryModal(allKarts, totalRaceTime) {
    if (!this.victoryModal) return;
    this.victoryModal.style.display = 'flex';

    const sorted = [...allKarts].sort((a, b) => {
      if (a.raceFinished && b.raceFinished) return a.finishTime - b.finishTime;
      return b.totalSplineProgress - a.totalSplineProgress;
    });

    const playerRank = sorted.findIndex(k => !k.isAI) + 1;
    if (this.victoryRankEl) {
      const titles = ['', '🏆 1ST PLACE - MARIO CHAMPION!', '🥈 2ND PLACE - PODIUM FINISH!', '🥉 3RD PLACE - GOOD TRY!', '4TH PLACE - PRACTICE MORE!'];
      this.victoryRankEl.textContent = titles[playerRank] || 'RACE COMPLETE!';
      this.victoryRankEl.className = `podium-rank rank-${playerRank}`;
    }

    if (this.victoryTableEl) {
      this.victoryTableEl.innerHTML = '';
      sorted.forEach((k, idx) => {
        const row = document.createElement('div');
        row.className = `standings-row ${!k.isAI ? 'player-row' : ''}`;

        let charName = 'MARIO (You)';
        if (k.character === 'luigi') charName = 'LUIGI (CPU)';
        else if (k.character === 'peach') charName = 'PEACH (CPU)';
        else if (k.character === 'bowser') charName = 'BOWSER (CPU)';

        const best = k.bestLapTime < Infinity ? this.formatTime(k.bestLapTime) : '--:--.---';
        const total = k.raceFinished ? this.formatTime(k.finishTime) : 'DNF';

        row.innerHTML = `
          <span class="rank-badge">${idx + 1}</span>
          <span class="driver-name">${charName}</span>
          <span class="coins-collected">🪙 ${k.coins}</span>
          <span class="best-lap">${best}</span>
          <span class="total-time">${total}</span>
        `;
        this.victoryTableEl.appendChild(row);
      });
    }
  }

  hideVictoryModal() {
    if (this.victoryModal) {
      this.victoryModal.style.display = 'none';
    }
  }
}
