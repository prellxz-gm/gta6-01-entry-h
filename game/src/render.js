// Render — three.js scene, ember sunset sky, minimap.
import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(1280, 720, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    // Ember sunset sky: gradient via background color + fog + big sun disc
    this.scene.background = new THREE.Color(0x2a0e2e);
    this.scene.fog = new THREE.Fog(0x3a1526, 120, 420);
    const hemi = new THREE.HemisphereLight(0xff9a5c, 0x1a0a2a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xff7a2e, 2.4);
    sun.position.set(-80, 60, 120); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 32),
      new THREE.MeshBasicMaterial({ color: 0xff6a1a, fog: false }));
    sunDisc.position.set(-140, 42, -320); sunDisc.lookAt(0, 20, 0);
    this.scene.add(sunDisc);
    this.camera = new THREE.PerspectiveCamera(68, 1280 / 720, 0.1, 900);
    this.camera.position.set(0, 14, 26);
    // Objective beacon
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 80, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.45 }));
    this.beacon.position.set(-120, 40, -120);
    this.scene.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xffd94d, 300, 60, 1.8);
    this.beaconLight.position.set(-120, 6, -120);
    this.scene.add(this.beaconLight);
  }
  setBeacon(x, z) { this.beacon.position.set(x, 40, z); this.beaconLight.position.set(x, 6, z); }
  follow(target, yaw, inCar, dt) {
    const dist = inCar ? 11 : 9;
    const h = inCar ? 4.6 : 3.8;
    const tx = target.x - Math.sin(yaw) * dist;
    const tz = target.z - Math.cos(yaw) * dist;
    this.camera.position.x += (tx - this.camera.position.x) * Math.min(1, dt * 6);
    this.camera.position.y += ((target.y + h) - this.camera.position.y) * Math.min(1, dt * 6);
    this.camera.position.z += (tz - this.camera.position.z) * Math.min(1, dt * 6);
    this.camera.lookAt(target.x, target.y + 1.6, target.z);
  }
  setShotCamera(x, y, z, lx, ly, lz) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(lx, ly, lz);
  }
  render() { this.renderer.render(this.scene, this.camera); }
  resize(w, h) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
}

export function drawMinimap(canvas, player, cops, beacon, businesses, districts) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10,8,20,0.85)'; ctx.fillRect(0, 0, W, H);
  const map = (x, z) => [((x + 200) / 400) * W, ((z + 200) / 400) * H];
  // districts
  for (const d of districts) {
    const [dx, dy] = map(d.center[0], d.center[1]);
    ctx.fillStyle = d.controlled ? d.color : 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(dx, dy, d.controlled ? 13 : 9, 0, Math.PI * 2); ctx.fill();
  }
  // businesses
  for (const b of businesses) {
    const [bx, by] = map(b.pos[0], b.pos[1]);
    ctx.fillStyle = b.level > 0 ? b.color : 'rgba(255,255,255,0.5)';
    ctx.fillRect(bx - 4, by - 4, 8, 8);
  }
  // beacon
  if (beacon) { const [bx, by] = map(beacon.x, beacon.z); ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill(); }
  // cops
  ctx.fillStyle = '#3d7bff';
  for (const c of cops) { const [cx, cy] = map(c.x, c.z); ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill(); }
  // player
  const [px, py] = map(player.x, player.z);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ff4d2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
}
