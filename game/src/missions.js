// Missions — 10 story, 5 syndicate contracts, 3 street races.
import { MISSIONS, CONTRACTS, RACES, DISTRICTS } from './config.js';

export class Missions {
  constructor() {
    this.list = MISSIONS.map(m => ({ ...m, done: false }));
    this.contracts = CONTRACTS.map(c => ({ ...c, done: false }));
    this.races = RACES.map(r => ({ ...r, done: false }));
    this.currentIndex = 0;
    this.activeContract = null;
    this.activeRace = null;
    this.progress = 0; // e.g. debts collected
    this.districts = DISTRICTS.map(d => ({ ...d }));
  }
  get current() { return this.list[this.currentIndex] || null; }
  get objectivePos() {
    const m = this.current;
    if (!m) return { x: 0, z: 0 };
    const d = this.districts.find(x => x.id === m.district);
    return d ? { x: d.center[0], z: d.center[1] } : { x: 0, z: 0 };
  }
  completeCurrent(player, economy) {
    const m = this.current; if (!m) return 0;
    m.done = true;
    player.cash += m.reward;
    const d = this.districts.find(x => x.id === m.district);
    if (d) { d.standing = Math.min(100, d.standing + m.standing); if (d.standing >= 50) d.controlled = true; }
    this.currentIndex++;
    this.progress = 0;
    return m.reward;
  }
  completeContract(id, player) {
    const c = this.contracts.find(x => x.id === id); if (!c || c.done) return 0;
    c.done = true; player.cash += c.reward; return c.reward;
  }
  completeRace(id, player) {
    const r = this.races.find(x => x.id === id); if (!r || r.done) return 0;
    r.done = true; player.cash += r.reward; return r.reward;
  }
  get completedCount() { return this.list.filter(m => m.done).length; }
  get allDone() { return this.currentIndex >= this.list.length; }
}
