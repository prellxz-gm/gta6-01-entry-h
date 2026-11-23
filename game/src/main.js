// Ember Coast — main game loop. Fixed timestep, seeded RNG, player-driven economy.
import * as THREE from 'three';
import { CONFIG, DISTRICTS, BUSINESSES, SAFEHOUSE_LEVELS, GARAGE_UPGRADES, WEAPONS, CREW } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer, drawMinimap } from './render.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

export class Economy {
  constructor(missions) {
    this.missions = missions;
    this.businesses = BUSINESSES.map(b => ({ ...b, level: 0 }));
    this.safehouseLevel = 0;
    this.incomePerSec = 0;
    this.earnedTotal = 0;
    this.recompute();
  }
  get safehouse() { return SAFEHOUSE_LEVELS[this.safehouseLevel]; }
  get controlledCount() { return this.missions.districts.filter(d => d.controlled).length; }
  standingOf(bizId) {
    const map = { bar: 'marina', garage: 'neon', club: 'neon' };
    const d = this.missions.districts.find(x => x.id === map[bizId]);
    return d ? d.standing : 0;
  }
  districtControlled(bizId) {
    const map = { bar: 'marina', garage: 'neon', club: 'neon' };
    const d = this.missions.districts.find(x => x.id === map[bizId]);
    return d ? d.controlled : false;
  }
  // Dynamic profit scaling: standing + territory control + total control bonus.
  incomeOf(biz) {
    if (biz.level === 0) return 0;
    const lvlMult = [0, 1, 2.3, 4.0][biz.level];
    const standing = this.standingOf(biz.id);
    const mult = 1 + standing / 100 + (this.districtControlled(biz.id) ? 0.6 : 0) + this.controlledCount * 0.15;
    return biz.baseIncome * lvlMult * mult;
  }
  recompute() {
    this.incomePerSec = this.businesses.reduce((s, b) => s + this.incomeOf(b), 0);
  }
  buyBusiness(id, player, audio) {
    const b = this.businesses.find(x => x.id === id);
    if (!b || b.level >= 3) return 'MAX LEVEL';
    const cost = b.cost[b.level];
    if (player.cash < cost) return 'NOT ENOUGH CASH — need $' + cost;
    player.cash -= cost; b.level++;
    this.recompute(); audio.buy();
    return 'BOUGHT ' + b.name + ' Lv.' + b.level + ' — income $' + this.incomeOf(b).toFixed(1) + '/s';
  }
  upgradeSafehouse(player, audio) {
    if (this.safehouseLevel >= 3) return 'SAFEHOUSE MAX';
    const next = SAFEHOUSE_LEVELS[this.safehouseLevel + 1];
    if (player.cash < next.cost) return 'NOT ENOUGH CASH — need $' + next.cost;
    player.cash -= next.cost; this.safehouseLevel++;
    this.recompute(); audio.buy();
    return 'SAFEHOUSE Lv.' + this.safehouseLevel + ' — wanted decays ' + next.wantedDecay + 'x, ' + next.slots + ' car slots, crew: ' + next.crewUnlocked + '/2';
  }
  upgradeGarage(player, audio) {
    if (player.garageLevel >= 3) return 'GARAGE MAX';
    const next = GARAGE_UPGRADES[player.garageLevel + 1];
    if (player.cash < next.cost) return 'NOT ENOUGH CASH — need $' + next.cost;
    player.cash -= next.cost; player.garageLevel++;
    audio.buy();
    return 'GARAGE ' + next.name + ' — top speed x' + next.topSpeed + ', armor x' + next.armor;
  }
  tick(dt, player) {
    if (this.incomePerSec <= 0) return 0;
    const gain = this.incomePerSec * dt;
    player.cash += gain; this.earnedTotal += gain;
    return gain;
  }
}

class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = parseInt(params.get('seed') || String(CONFIG.seed), 10);
    this.shot = params.get('shot') || '';
    this.rng = new RNG(this.seed);
    this.input = new Input();
    this.audio = new AudioEngine();
    this.renderer = new Renderer($('game-canvas'));
    this.world = new World(this.renderer.scene, this.seed);
    this.player = new Player(this.renderer.scene);
    this.police = new Police(this.renderer.scene, this.rng);
    this.missions = new Missions();
    this.economy = new Economy(this.missions);
    this.started = false; this.paused = false;
    this.frozen = false; // shot mode: render a fixed composed frame, no simulation
    this.time = 0; this.acc = 0; this.lastTs = 0;
    this.message = ''; this.messageTimer = 0;
    this.hackerCooldown = 0;
    this.saveTimer = 0;
    this.loadSave();
    this.bindUI();
    if (this.shot) { applyShot(this, this.shot); this.updateHUD(); }
    if (params.get('autostart') === '1') this.start();
    window.__game = this;
    window.__emberReady = false;
    requestAnimationFrame((ts) => this.loop(ts));
  }
  bindUI() {
    const startBtn = $('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => { this.audio.ensure(); this.start(); });
    const resumeBtn = $('resume-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.started) { this.audio.ensure(); this.start(); }
      if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && this.started) this.togglePause();
      if (e.key === 'm' || e.key === 'M') this.audio.toggleMusic();
    });
    window.addEventListener('mousedown', () => { this.audio.ensure(); if (this.started && !this.paused) this.tryFire(); });
    const buyBtns = document.querySelectorAll('[data-buy]');
    buyBtns.forEach(b => b.addEventListener('click', () => {
      const msg = this.economy.buyBusiness(b.getAttribute('data-buy'), this.player, this.audio);
      this.say(msg); this.updateHUD();
    }));
    const shBtn = $('upgrade-safehouse');
    if (shBtn) shBtn.addEventListener('click', () => { this.say(this.economy.upgradeSafehouse(this.player, this.audio)); this.updateHUD(); });
    const gBtn = $('upgrade-garage');
    if (gBtn) gBtn.addEventListener('click', () => { this.say(this.economy.upgradeGarage(this.player, this.audio)); this.updateHUD(); });
  }
  start() {
    this.started = true;
    const s = $('start-screen'); if (s) s.style.display = 'none';
    this.say('Welcome to Dusk Ember. Follow the gold beacon — Mission 1: ' + (this.missions.current ? this.missions.current.title : 'Free roam'));
    this.updateHUD();
  }
  togglePause(force) {
    this.paused = force !== undefined ? force : !this.paused;
    const p = $('pause-screen'); if (p) p.style.display = this.paused ? 'flex' : 'none';
  }
  say(t) { this.message = t; this.messageTimer = 5; const m = $('message'); if (m) m.textContent = t; }
  nearestBusiness() {
    let best = null, bd = 1e9;
    for (const b of this.economy.businesses) {
      const d = Math.hypot(this.player.x - b.pos[0], this.player.z - b.pos[1]);
      if (d < bd) { bd = d; best = b; }
    }
    return bd < 16 ? best : null;
  }
  nearSafehouse() { return Math.hypot(this.player.x - this.world.safehouse.x, this.player.z - this.world.safehouse.z) < 14; }
  tryFire() {
    if (!this.player.fire()) { this.say('OUT OF AMMO — ' + this.player.weapon.name); return; }
    this.audio.shoot();
    this.police.addHeat(2);
    // Hit nearest cop within range for feedback
    const w = this.player.weapon;
    for (const c of this.police.cops) {
      const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (d < w.range) { this.say(w.name + ' hit! Cop down — wanted rising.'); this.police.addHeat(6); break; }
    }
  }
  trySteal() {
    if (this.player.inCar) return;
    let best = null, bd = 1e9;
    for (const car of this.world.trafficCars) {
      if (car.stolen) continue;
      const d = Math.hypot(car.mesh.position.x - this.player.x, car.mesh.position.z - this.player.z);
      if (d < bd) { bd = d; best = car; }
    }
    if (best && bd < 6) {
      best.stolen = true;
      this.player.x = best.mesh.position.x; this.player.z = best.mesh.position.z;
      this.player.stolenCarMesh = best.mesh;
      this.player.enterCar(best.mesh);
      this.police.addHeat(12);
      this.audio.crash();
      this.say('Car stolen! Wanted rising — lose the cops.');
    } else if (bd < 30) {
      this.say('Get closer to steal that car (E).');
    } else {
      this.player.enterCar();
      this.say('Your Ember ride. Drive with WASD.');
    }
  }
  checkMission() {
    const m = this.missions.current; if (!m) return;
    const pos = this.missions.objectivePos;
    const d = Math.hypot(this.player.x - pos.x, this.player.z - pos.z);
    if (d < 14) {
      const reward = this.missions.completeCurrent(this.player, this.economy);
      this.economy.recompute();
      this.audio.mission(); this.audio.cash();
      this.say('MISSION COMPLETE: ' + m.title + ' +$' + reward + ' — Standing +' + m.standing + ' in ' + m.district + '. Next: ' + (this.missions.current ? this.missions.current.title : 'King of Ember Coast!'));
      this.saveGame();
    }
  }
  saveGame() {
    try {
      const s = {
        cash: Math.floor(this.player.cash), health: this.player.health,
        missionIndex: this.missions.currentIndex,
        biz: this.economy.businesses.map(b => b.level),
        safehouse: this.economy.safehouseLevel, garage: this.player.garageLevel,
        districts: this.missions.districts.map(d => ({ standing: d.standing, controlled: d.controlled })),
      };
      localStorage.setItem(CONFIG.saveKey, JSON.stringify(s));
    } catch (e) { /* storage unavailable in headless — ignore */ }
  }
  loadSave() {
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.cash === 'number') this.player.cash = s.cash;
      if (typeof s.missionIndex === 'number') this.missions.currentIndex = Math.min(s.missionIndex, 10);
      if (Array.isArray(s.biz)) s.biz.forEach((lv, i) => { if (this.economy.businesses[i]) this.economy.businesses[i].level = lv; });
      if (typeof s.safehouse === 'number') this.economy.safehouseLevel = s.safehouse;
      if (typeof s.garage === 'number') this.player.garageLevel = s.garage;
      if (Array.isArray(s.districts)) s.districts.forEach((d, i) => { if (this.missions.districts[i]) { this.missions.districts[i].standing = d.standing; this.missions.districts[i].controlled = d.controlled; } });
      this.economy.recompute();
    } catch (e) { /* ignore corrupt save */ }
  }
  updateHUD() {
    const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
    set('cash', '$' + Math.floor(this.player.cash).toLocaleString('en-US'));
    set('income', '+$' + this.economy.incomePerSec.toFixed(1) + '/s');
    set('health', 'HP ' + Math.floor(this.player.health));
    set('weapon', this.player.weapon.name + (this.player.weapon.ammo === Infinity ? ' ∞' : ' · ' + this.player.ammo[this.player.weapon.id]));
    set('wanted', '★'.repeat(this.police.wanted) + '☆'.repeat(5 - this.police.wanted));
    const m = this.missions.current;
    set('objective', m ? ('MISSION ' + (this.missions.currentIndex + 1) + '/10 — ' + m.title + ': ' + m.objective + '  ·  $' + m.reward) : 'ALL MISSIONS DONE — King of Ember Coast 👑');
    set('districts', this.missions.districts.map(d => d.name + ' ' + d.standing + (d.controlled ? ' ✓' : '')).join('  ·  '));
    set('biz-line', this.economy.businesses.map(b => b.name + ' Lv.' + b.level + ' $' + this.economy.incomeOf(b).toFixed(1) + '/s').join('  ·  '));
    set('safehouse-line', 'Safehouse Lv.' + this.economy.safehouseLevel + ' · Garage ' + this.player.garage.name + ' · Crew ' + this.economy.safehouse.crewUnlocked + '/2 · Territory ' + this.economy.controlledCount + '/5');
    set('mission-count', 'Missions ' + this.missions.completedCount + '/10 · Contracts ' + this.missions.contracts.filter(c => c.done).length + '/5 · Races ' + this.missions.races.filter(r => r.done).length + '/3');
    const panel = $('business-panel');
    if (panel) {
      panel.innerHTML = this.economy.businesses.map(b => {
        const next = b.level >= 3 ? 'MAX' : '$' + b.cost[b.level];
        return '<div class="biz"><b>' + b.name + '</b> Lv.' + b.level + ' · $' + this.economy.incomeOf(b).toFixed(1) + '/s · <button data-buy="' + b.id + '">Buy/Upgrade ' + next + '</button></div>';
      }).join('');
      panel.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => {
        this.say(this.economy.buyBusiness(btn.getAttribute('data-buy'), this.player, this.audio));
        this.updateHUD();
      }));
    }
    const mm = $('minimap');
    if (mm) drawMinimap(mm, this.player, this.police.cops, this.missions.objectivePos, this.economy.businesses, this.missions.districts);
  }
  update(dt) {
    this.time += dt;
    this.world.update(dt, this.time);
    const crewDriver = this.economy.safehouseLevel >= 1;
    const crewHacker = this.economy.safehouseLevel >= 2;
    // Input edges
    if (this.input.wasPressed('e')) this.trySteal();
    if (this.input.wasPressed('f') && this.player.inCar) { this.player.exitCar(); this.say('On foot. Press E near a car to steal it.'); }
    if (this.input.wasPressed('q')) { this.player.cycleWeapon(1); this.say('Weapon: ' + this.player.weapon.name); }
    for (let i = 1; i <= 5; i++) if (this.input.wasPressed(String(i))) { this.player.weaponIndex = i - 1; this.say('Weapon: ' + this.player.weapon.name); }
    if (this.input.wasPressed('b')) { const b = this.nearestBusiness(); this.say(b ? this.economy.buyBusiness(b.id, this.player, this.audio) : 'No business nearby — go to a glowing pylon (Bar / Workshop / Club).'); }
    if (this.input.wasPressed('u') && this.nearSafehouse()) this.say(this.economy.upgradeSafehouse(this.player, this.audio));
    if (this.input.wasPressed('g')) this.say(this.economy.upgradeGarage(this.player, this.audio));
    if (this.input.wasPressed('h') && crewHacker && this.hackerCooldown <= 0) {
      this.police.scannerDown = 45; this.hackerCooldown = 90; this.audio.pickup();
      this.say('ZERO killed the police scanner for 45s. Wanted will decay fast.');
    }
    if (this.input.wasPressed(' ')) this.tryFire();
    this.hackerCooldown = Math.max(0, this.hackerCooldown - dt);
    // Player + police
    this.player.update(this.input, dt, this.world, (ev) => {
      if (ev === 'crash') { this.audio.crash(); this.police.addHeat(4); }
      if (ev === 'stunt') { this.player.cash += 150; this.say('STUNT! +$150 airtime bonus. Slow-mo with SHIFT.'); this.audio.pickup(); }
    });
    if (crewDriver && this.police.wanted > 0 && this.player.inCar) this.player.speed *= (1 + 0.02 * dt * 10);
    this.police.update(dt, this.player, this.economy.safehouse.wantedDecay, crewHacker);
    // Economy tick — businesses pay every second
    this.economy.tick(dt, this.player);
    this.checkMission();
    // Beacon follows current objective
    const pos = this.missions.objectivePos;
    this.renderer.setBeacon(pos.x, pos.z);
    // Camera follow (unless a shot fixed it — follow still keeps chase framing)
    this.renderer.follow({ x: this.player.x, y: this.player.y, z: this.player.z }, this.player.yaw, this.player.inCar, dt);
    if (this.messageTimer > 0) { this.messageTimer -= dt; if (this.messageTimer <= 0) { const m = $('message'); if (m) m.textContent = ''; } }
    this.saveTimer += dt;
    if (this.saveTimer > 10) { this.saveTimer = 0; this.saveGame(); }
    this.input.endFrame();
    this.updateHUD();
  }
  loop(ts) {
    requestAnimationFrame((t) => this.loop(t));
    if (!this.lastTs) this.lastTs = ts;
    let frameDt = Math.min(0.1, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    if (this.started && !this.paused && !this.frozen) {
      this.acc += frameDt;
      const step = CONFIG.fixedDt;
      let n = 0;
      while (this.acc >= step && n < 5) { this.update(step); this.acc -= step; n++; }
      if (n === 5) this.acc = 0;
    } else {
      // Idle scene still animates world slightly for the start screen
      this.world.update(CONFIG.fixedDt, this.time);
      this.time += CONFIG.fixedDt;
      this.input.endFrame();
    }
    this.renderer.render();
    if (!window.__emberReady) window.__emberReady = true;
  }
}

try {
  new Game();
} catch (err) {
  document.body.insertAdjacentHTML('beforeend', '<pre id="boot-error" style="color:#f66;background:#111;padding:12px">BOOT ERROR: ' + String(err && err.message || err) + '</pre>');
  console.error(err);
  window.__bootError = String(err && err.message || err);
}
