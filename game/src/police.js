// Police — wanted 0-5, chase/ram, helicopter, roadblocks, safehouse decay.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Police {
  constructor(scene, rng) {
    this.scene = scene; this.rng = rng;
    this.wanted = 0; this.heat = 0;
    this.cops = []; this.roadblocks = [];
    this.heli = null; this.heliActive = false;
    this.decayTimer = 0; this.scannerDown = 0;
    this._copGeo = new THREE.BoxGeometry(2.1, 0.9, 4.4);
  }
  addHeat(n) {
    if (this.scannerDown > 0) return;
    this.heat += n;
    const w = Math.min(CONFIG.wantedMax, Math.floor(this.heat / 25));
    if (w !== this.wanted) this.setWanted(w);
  }
  setWanted(w) {
    this.wanted = Math.max(0, Math.min(CONFIG.wantedMax, w));
    this.heat = this.wanted * 25;
    this.syncUnits();
  }
  clearWanted() { this.wanted = 0; this.heat = 0; this.syncUnits(); }
  syncUnits() {
    const want = this.wanted === 0 ? 0 : this.wanted + 1;
    while (this.cops.length < want) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(this._copGeo, new THREE.MeshStandardMaterial({ color: 0x1a2a6b, roughness: 0.3, metalness: 0.6, emissive: 0x2233aa, emissiveIntensity: 0.5 }));
      body.position.y = 0.7; g.add(body);
      const light = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.8), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      light.position.y = 1.3; g.add(light);
      g.position.set(this.rng.range(-100, 100), 0, this.rng.range(-100, 100));
      this.scene.add(g);
      this.cops.push({ mesh: g, x: g.position.x, z: g.position.z, speed: 0, light, lane: (this.cops.length % 2 === 0 ? 4.5 : -4.5) });
    }
    while (this.cops.length > want) { const c = this.cops.pop(); this.scene.remove(c.mesh); }
    // Helicopter at wanted >= 3
    const wantHeli = this.wanted >= 3;
    if (wantHeli && !this.heli) {
      const h = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.6, roughness: 0.4 }));
      h.add(b);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
      rotor.position.y = 1.1; h.add(rotor); h.userData.rotor = rotor;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      beacon.position.set(0, 1.6, 0); h.add(beacon);
      // Searchlight cone so the helicopter reads clearly from the chase camera.
      const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 18, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      cone.position.y = -10; cone.rotation.x = Math.PI; h.add(cone);
      const spot = new THREE.SpotLight(0xffffff, 800, 90, 0.4, 0.5);
      spot.position.set(0, -1, 0); h.add(spot); h.add(spot.target);
      h.position.set(0, 26, 0); h.scale.setScalar(1.5); this.scene.add(h);
      this.heli = h; this.heliActive = true;
    }
    if (!wantHeli && this.heli) { this.scene.remove(this.heli); this.heli = null; this.heliActive = false; }
    // Roadblocks at wanted >= 4
    const wantBlocks = this.wanted >= 4 ? 2 : 0;
    while (this.roadblocks.length < wantBlocks) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xff5533, emissive: 0xff2200, emissiveIntensity: 0.8 }));
      m.position.set(this.rng.range(-80, 80), 0.6, this.rng.range(-80, 80));
      this.scene.add(m); this.roadblocks.push(m);
    }
    while (this.roadblocks.length > wantBlocks) { const m = this.roadblocks.pop(); this.scene.remove(m); }
  }
  update(dt, player, safehouseDecay, crewHacker) {
    if (this.scannerDown > 0) this.scannerDown -= dt;
    // Decay when not committing crimes: safehouse + hacker speed it up
    this.decayTimer += dt;
    if (this.decayTimer > 2.5) {
      this.decayTimer = 0;
      const rate = 1.2 * safehouseDecay * (crewHacker ? 1.5 : 1) * (this.scannerDown > 0 ? 2 : 1);
      if (this.heat > 0) { this.heat = Math.max(0, this.heat - rate); const w = Math.floor(this.heat / 25); if (w !== this.wanted) this.setWanted(w); }
    }
    const px = player.x, pz = player.z;
    for (const c of this.cops) {
      // Chase a point offset to the player's side so cop cars stay visible beside, not inside, the player.
      const tx = px + (c.lane || 0), tz = pz - 2;
      const dx = tx - c.x, dz = tz - c.z;
      const d = Math.hypot(dx, dz) || 1;
      const sp = (10 + this.wanted * 3.2) * (player.inCar ? 1.15 : 0.8);
      c.x += (dx / d) * sp * dt; c.z += (dz / d) * sp * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = Math.atan2(dx, dz);
      c.light.material.color.setHex(Math.floor(d * 10) % 2 === 0 ? 0xff2233 : 0x2244ff);
      if (d < 3.2 && player.inCar) { player.speed *= 0.92; }
      if (d < 2.2 && !player.inCar) { player.health = Math.max(0, player.health - 12 * dt); }
    }
    if (this.heli) {
      // Hover ahead of the player (in view) instead of directly overhead.
      const hx = px + Math.sin(player.yaw) * 45, hz = pz + Math.cos(player.yaw) * 45;
      this.heli.position.x += (hx - this.heli.position.x) * Math.min(1, dt * 0.9);
      this.heli.position.z += (hz - this.heli.position.z) * Math.min(1, dt * 0.9);
      this.heli.position.y = 18 + Math.sin(px * 0.01 + pz * 0.01) * 2;
      this.heli.userData.rotor.rotation.y += dt * 22;
      this.heli.children[4].target.position.set(px - this.heli.position.x, -18, pz - this.heli.position.z);
    }
  }
}
