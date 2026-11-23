// World — Dusk Ember coastal city. All placement from seeded RNG.
import * as THREE from 'three';
import { RNG } from './random.js';
import { CONFIG, DISTRICTS, BUSINESSES, STUNT_RAMPS } from './config.js';

const PALETTE = ['#ff5a3c', '#ff2fd6', '#2fd6ff', '#ffb347', '#ffd94d', '#7dff6a', '#b78cff'];

export class World {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new RNG(seed);
    this.buildings = [];
    this.trafficCars = [];
    this.peds = [];
    this.ramps = [];
    this.businessMarkers = [];
    this.colliders = [];
    this.build();
  }
  build() {
    const rng = this.rng;
    // Ground — sand beach south, asphalt city, water east
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.worldSize * 2, CONFIG.worldSize * 2),
      new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.worldSize * 2, 90),
      new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 1 })
    );
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.05, 190);
    this.scene.add(beach);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.worldSize * 2, 120),
      new THREE.MeshStandardMaterial({ color: 0x0a4a6b, roughness: 0.25, metalness: 0.5, emissive: 0x06283d })
    );
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, 290);
    this.scene.add(sea);
    // Volcano on northern horizon
    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(95, 110, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a2a28, roughness: 1, emissive: 0x1a0800 })
    );
    volcano.position.set(0, 55, -330); this.scene.add(volcano);
    const lava = new THREE.Mesh(
      new THREE.ConeGeometry(22, 30, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4d00, emissive: 0xff3300, emissiveIntensity: 2.2 })
    );
    lava.position.set(0, 98, -330); this.scene.add(lava);
    const glow = new THREE.PointLight(0xff4400, 9000, 420, 1.6);
    glow.position.set(0, 110, -300); this.scene.add(glow);
    // Roads grid
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.9 });
    for (let x = -168; x <= 168; x += CONFIG.roadSpacing) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(9, CONFIG.worldSize * 2), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.08, 0); this.scene.add(r);
      const r2 = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.worldSize * 2, 9), roadMat);
      r2.rotation.x = -Math.PI / 2; r2.position.set(0, 0.08, x); this.scene.add(r2);
    }
    // Buildings — seeded, centred in city blocks BETWEEN roads (roads at k*42).
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let gx = -4; gx <= 4; gx++) {
      for (let gz = -4; gz <= 4; gz++) {
        if (gx === 0 && gz === 0) continue;
        const cx = gx * CONFIG.roadSpacing + 21 + rng.range(-8, 8);
        const cz = gz * CONFIG.roadSpacing + 21 + rng.range(-8, 8);
        if (cz > 150) continue;
        // Keep safehouse (-24,-24) and business plots clear of towers.
        if (Math.hypot(cx + 24, cz + 24) < 18) continue;
        let blocked = false;
        for (const biz of BUSINESSES) { if (Math.hypot(cx - biz.pos[0], cz - (biz.pos[1] + 9)) < 17) { blocked = true; break; } }
        if (blocked) continue;
        const w = rng.range(10, 18), d = rng.range(10, 18), h = rng.range(9, 52);
        const col = new THREE.Color(rng.color(PALETTE)).multiplyScalar(0.35);
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, metalness: 0.25, emissive: new THREE.Color(rng.color(PALETTE)).multiplyScalar(0.22), emissiveIntensity: 0.9 });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d); b.position.set(cx, h / 2, cz);
        this.scene.add(b);
        this.buildings.push(b);
        this.colliders.push({ x: cx, z: cz, r: Math.max(w, d) * 0.62 });
        // Neon roof strip on tall towers
        if (h > 30) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(rng.color(PALETTE)) }));
          strip.position.set(cx, h + 0.4, cz); this.scene.add(strip);
        }
      }
    }
    // Marina piers + boats
    for (let i = 0; i < 5; i++) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 34),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }));
      pier.position.set(-150 + i * 14, 0.5, 215); this.scene.add(pier);
      const boat = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.3 }));
      boat.position.set(-150 + i * 14, 1.4, 232 + rng.range(-4, 4)); this.scene.add(boat);
    }
    // Business markers (glowing pylons + labels via sprite color)
    for (const biz of BUSINESSES) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 9, 10),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(biz.color), emissive: new THREE.Color(biz.color), emissiveIntensity: 1.6 }));
      pylon.position.set(biz.pos[0], 4.5, biz.pos[1]); this.scene.add(pylon);
      const base = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 10),
        new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.6, emissive: new THREE.Color(biz.color), emissiveIntensity: 0.35 }));
      base.position.set(biz.pos[0], 2.5, biz.pos[1] + 9); this.scene.add(base);
      this.businessMarkers.push({ ...biz, mesh: pylon });
      this.colliders.push({ x: biz.pos[0], z: biz.pos[1] + 9, r: 9 });
    }
    // Safehouse
    const sh = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 12),
      new THREE.MeshStandardMaterial({ color: 0x2e4a3a, roughness: 0.7, emissive: 0x1a5c34, emissiveIntensity: 0.5 }));
    sh.position.set(-24, 3.5, -24); this.scene.add(sh);
    this.safehouse = { x: -24, z: -24 };
    // Stunt ramps
    for (const r of STUNT_RAMPS) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8800, emissiveIntensity: 0.7, roughness: 0.5 }));
      ramp.position.set(r.pos[0], 0.8, r.pos[1]); ramp.rotation.y = r.angle; ramp.rotation.x = -0.35;
      this.scene.add(ramp); this.ramps.push({ ...r, mesh: ramp });
    }
    // District label beacons (light pillars)
    for (const d of DISTRICTS) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color), transparent: true, opacity: 0.28 }));
      beam.position.set(d.center[0], 30, d.center[1]); this.scene.add(beam);
    }
    // Traffic cars (seeded, loop on roads)
    const carColors = [0xff4444, 0x44aaff, 0xffcc33, 0x88ff88, 0xffffff, 0xff88cc];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 4.4),
        new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.35, metalness: 0.6 }));
      body.position.y = 0.7; g.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.2, metalness: 0.7 }));
      cab.position.set(0, 1.4, -0.3); g.add(cab);
      const road = (i % 9 - 4) * CONFIG.roadSpacing;
      const horizontal = i % 2 === 0;
      g.position.set(horizontal ? rng.range(-170, 170) : road, 0, horizontal ? road : rng.range(-170, 150));
      g.rotation.y = horizontal ? (rng.float() > 0.5 ? 0 : Math.PI) : (rng.float() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      this.scene.add(g);
      this.trafficCars.push({ mesh: g, horizontal, road, speed: rng.range(7, 13), dir: rng.float() > 0.5 ? 1 : -1, stolen: false });
    }
    // Pedestrians (seeded walkers)
    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.9, 3, 8),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE[i % PALETTE.length]), roughness: 0.8 }));
      p.position.set(rng.range(-160, 160), 1.1, rng.range(-160, 150));
      this.scene.add(p);
      this.peds.push({ mesh: p, angle: rng.range(0, Math.PI * 2), speed: rng.range(1, 2.4) });
    }
  }
  collide(x, z) {
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) return true;
    }
    return false;
  }
  update(dt, time) {
    // Traffic loops deterministically
    for (const car of this.trafficCars) {
      if (car.stolen) continue;
      if (car.horizontal) { car.mesh.position.x += car.speed * car.dir * dt; if (car.mesh.position.x > 175) car.mesh.position.x = -175; if (car.mesh.position.x < -175) car.mesh.position.x = 175; }
      else { car.mesh.position.z += car.speed * car.dir * dt; if (car.mesh.position.z > 165) car.mesh.position.z = -175; if (car.mesh.position.z < -175) car.mesh.position.z = 165; }
    }
    for (const p of this.peds) {
      p.mesh.position.x += Math.cos(p.angle) * p.speed * dt;
      p.mesh.position.z += Math.sin(p.angle) * p.speed * dt;
      if (Math.abs(p.mesh.position.x) > 170 || Math.abs(p.mesh.position.z) > 165) p.angle += Math.PI / 2;
      p.mesh.position.y = 1.1 + Math.abs(Math.sin(time * 6 + p.angle)) * 0.08;
    }
  }
}
