// Player — on foot + driving, car steal, weapons, garage upgrades.
import * as THREE from 'three';
import { CONFIG, WEAPONS, GARAGE_UPGRADES } from './config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = 0; this.y = 0; this.z = 18;
    this.yaw = 0; this.speed = 0;
    this.inCar = false; this.car = null;
    this.health = 100; this.cash = 2500;
    this.weaponIndex = 1; this.ammo = {};
    for (const w of WEAPONS) this.ammo[w.id] = w.ammo === Infinity ? Infinity : w.ammo;
    this.garageLevel = 0;
    this.storedCars = 1;
    this.slowMo = 1; this.slowMoTimer = 0;
    this.airTime = 0; this.stuntBonus = 0;
    // On-foot mesh
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.95, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0xff4d2e, roughness: 0.6 }));
    body.position.y = 1.15; this.mesh.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 }));
    head.position.y = 2.15; this.mesh.add(head);
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
    // Player car
    this.carMesh = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 4.6),
      new THREE.MeshStandardMaterial({ color: 0xff4d2e, roughness: 0.3, metalness: 0.65 }));
    cb.position.y = 0.75; this.carMesh.add(cb);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.15, metalness: 0.8 }));
    cab.position.set(0, 1.45, -0.3); this.carMesh.add(cab);
    this.carMesh.visible = false;
    this.carMesh.position.set(this.x, 0, this.z);
    scene.add(this.carMesh);
    this.stolenCarMesh = null;
  }
  get weapon() { return WEAPONS[this.weaponIndex]; }
  get garage() { return GARAGE_UPGRADES[this.garageLevel]; }
  topSpeed() { return CONFIG.carTopSpeed * this.garage.topSpeed; }
  enterCar(mesh) {
    this.inCar = true; this.car = mesh || 'own';
    this.mesh.visible = false; this.carMesh.visible = true;
    this.carMesh.position.set(this.x, 0, this.z);
    this.carMesh.rotation.y = this.yaw;
  }
  exitCar() {
    this.inCar = false; this.car = null;
    this.mesh.visible = true; this.carMesh.visible = false;
    this.x += Math.sin(this.yaw + Math.PI / 2) * 2.5;
    this.z += Math.cos(this.yaw + Math.PI / 2) * 2.5;
    this.mesh.position.set(this.x, 0, this.z);
  }
  cycleWeapon(dir) {
    this.weaponIndex = (this.weaponIndex + dir + WEAPONS.length) % WEAPONS.length;
  }
  fire() {
    const w = this.weapon;
    if (this.ammo[w.id] !== Infinity) {
      if (this.ammo[w.id] <= 0) return false;
      this.ammo[w.id]--;
    }
    return true;
  }
  update(input, dt, world, onEvent) {
    const ax = input.axis();
    const slow = input.down('shift');
    this.slowMoTimer = Math.max(0, this.slowMoTimer - dt);
    this.slowMo = (slow && this.slowMoTimer <= 0) || this.slowMoTimer > 0 ? 0.35 : 1;
    if (this.slowMo < 1 && this.slowMoTimer <= 0) this.slowMoTimer = 0.01;
    const sdt = dt * this.slowMo;
    if (this.inCar) {
      const accel = ax.y * CONFIG.carAccel * sdt;
      this.speed += accel;
      this.speed *= Math.pow(0.4, sdt);
      this.speed = Math.max(-12, Math.min(this.topSpeed(), this.speed));
      this.yaw += ax.x * 1.9 * sdt * Math.sign(this.speed || 1) * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
      const nx = this.x + Math.sin(this.yaw) * this.speed * sdt;
      const nz = this.z + Math.cos(this.yaw) * this.speed * sdt;
      if (!world.collide(nx, nz)) { this.x = nx; this.z = nz; }
      else { if (Math.abs(this.speed) > 14) onEvent && onEvent('crash'); this.speed *= -0.25; }
      // Stunt ramps: airborne bonus
      for (const r of world.ramps) {
        const dx = this.x - r.pos[0], dz = this.z - r.pos[1];
        if (dx * dx + dz * dz < 36 && Math.abs(this.speed) > 24) {
          this.airTime += sdt; this.y += Math.sin(Math.min(1, this.airTime * 2)) * 2.4 * sdt * 10;
          if (this.airTime > 0.6 && this.stuntBonus === 0) { this.stuntBonus = 150; onEvent && onEvent('stunt'); }
        }
      }
      if (this.airTime > 0) { this.airTime -= sdt; if (this.airTime <= 0) { this.y = 0; this.airTime = 0; } }
      this.carMesh.position.set(this.x, this.y, this.z);
      this.carMesh.rotation.y = this.yaw;
      if (this.stolenCarMesh) { this.stolenCarMesh.position.set(this.x, this.y, this.z); this.stolenCarMesh.rotation.y = this.yaw; }
    } else {
      this.yaw += ax.x * 2.6 * sdt;
      const sp = CONFIG.walkSpeed * sdt;
      const nx = this.x + Math.sin(this.yaw) * ax.y * sp;
      const nz = this.z + Math.cos(this.yaw) * ax.y * sp;
      if (!world.collide(nx, nz)) { this.x = nx; this.z = nz; }
      this.mesh.position.set(this.x, 0, this.z);
      this.mesh.rotation.y = this.yaw;
    }
    this.x = Math.max(-195, Math.min(195, this.x));
    this.z = Math.max(-195, Math.min(195, this.z));
  }
}
