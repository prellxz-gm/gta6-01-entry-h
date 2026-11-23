// Ember Coast — config (fresh, seeded, deterministic)
export const CONFIG = {
  seed: 20261124,
  worldSize: 420,
  roadSpacing: 42,
  fixedDt: 1 / 60,
  walkSpeed: 9,
  carTopSpeed: 42,
  carAccel: 26,
  wantedMax: 5,
  saveKey: 'ember-coast-save-v1',
  title: 'EMBER COAST',
  city: 'DUSK EMBER',
};

export const DISTRICTS = [
  { id: 'marina', name: 'Marina', color: '#2fd6ff', center: [-120, -120], standing: 0, controlled: false },
  { id: 'neon', name: 'Neon Row', color: '#ff2fd6', center: [110, -90], standing: 0, controlled: false },
  { id: 'beach', name: 'Ember Beach', color: '#ffb347', center: [-130, 110], standing: 0, controlled: false },
  { id: 'oldtown', name: 'Old Town', color: '#ffd94d', center: [120, 110], standing: 0, controlled: false },
  { id: 'volcano', name: 'Ashgate', color: '#ff4d2e', center: [0, -170], standing: 0, controlled: false },
];

export const BUSINESSES = [
  { id: 'bar', name: 'Ember Bar', icon: 'BAR', cost: [4000, 9000, 18000], baseIncome: 4.2, pos: [-96, -88], color: '#ff9a3d', desc: 'Bar tepi marina. Pendapatan stabil.' },
  { id: 'garage', name: 'Coast Workshop', icon: 'SHOP', cost: [6000, 13000, 26000], baseIncome: 6.8, pos: [88, -64], color: '#3dd6ff', desc: 'Bengkel modifikasi. Bonus garage.' },
  { id: 'club', name: 'Neon Club VOLT', icon: 'CLUB', cost: [12000, 26000, 52000], baseIncome: 12.5, pos: [96, -108], color: '#ff2fd6', desc: 'Klub malam Neon Row. Income tertinggi.' },
];

export const SAFEHOUSE_LEVELS = [
  { level: 0, name: 'Safehouse Lv.0', cost: 0, wantedDecay: 1.0, slots: 1, crewUnlocked: 0 },
  { level: 1, name: 'Safehouse Lv.1', cost: 5000, wantedDecay: 1.6, slots: 2, crewUnlocked: 1 },
  { level: 2, name: 'Safehouse Lv.2', cost: 14000, wantedDecay: 2.4, slots: 3, crewUnlocked: 2 },
  { level: 3, name: 'Safehouse Lv.3', cost: 30000, wantedDecay: 3.5, slots: 5, crewUnlocked: 2 },
];

export const GARAGE_UPGRADES = [
  { level: 0, name: 'Stock', cost: 0, topSpeed: 1.0, armor: 1.0 },
  { level: 1, name: 'Street', cost: 3500, topSpeed: 1.18, armor: 1.25 },
  { level: 2, name: 'Pro', cost: 9000, topSpeed: 1.38, armor: 1.6 },
  { level: 3, name: 'Ember X', cost: 20000, topSpeed: 1.62, armor: 2.1 },
];

export const WEAPONS = [
  { id: 'melee', name: 'Bat', damage: 25, range: 2.2, ammo: Infinity, color: '#c9a86a' },
  { id: 'pistol', name: 'Pistol', damage: 34, range: 55, ammo: 120, color: '#d8d8d8' },
  { id: 'smg', name: 'SMG', damage: 18, range: 45, ammo: 240, color: '#3dd6ff' },
  { id: 'shotgun', name: 'Shotgun', damage: 90, range: 18, ammo: 40, color: '#ff9a3d' },
  { id: 'rifle', name: 'Rifle', damage: 70, range: 110, ammo: 90, color: '#ff4d2e' },
];

export const MISSIONS = [
  { id: 'm01', title: 'First Ember', objective: 'Drive to Marina marker', reward: 1500, district: 'marina', standing: 12, text: 'Kenalan dengan kota. Antar paket ke Marina.' },
  { id: 'm02', title: 'Neon Debt', objective: 'Collect 3 debts in Neon Row', reward: 2800, district: 'neon', standing: 14, text: 'Tagih utang di Neon Row. Jangan bikin ribut — atau bikin.' },
  { id: 'm03', title: 'Beach Run', objective: 'Win the beach sprint', reward: 3500, district: 'beach', standing: 14, text: 'Balapan singkat di Ember Beach. Polisi tidak diundang.' },
  { id: 'm04', title: 'Ashgate Smoke', objective: 'Escape a 2-star chase', reward: 4200, district: 'volcano', standing: 16, text: 'Bawa barang lewat Ashgate. Hilangkan bintang 2.' },
  { id: 'm05', title: 'Old Town Heist', objective: 'Rob the Old Town vault', reward: 6500, district: 'oldtown', standing: 18, text: 'Vault Old Town. Alarm = bintang 3. Rencanakan kabur.' },
  { id: 'm06', title: 'Marina Takeover', objective: 'Claim Marina territory', reward: 7200, district: 'marina', standing: 20, text: 'Rebut Marina. Kuasai wilayah, income bisnis naik.' },
  { id: 'm07', title: 'Volt Nights', objective: 'Defend Neon Club VOLT', reward: 8000, district: 'neon', standing: 20, text: 'Klub diserang geng rival. Pertahankan sampai fajar.' },
  { id: 'm08', title: 'Volcano Run', objective: 'Deliver ember crate in 90s', reward: 9500, district: 'volcano', standing: 22, text: 'Kirim peti ember melewati jalan gunung. Waktu ketat.' },
  { id: 'm09', title: 'Syndicate Test', objective: 'Complete 2 contracts back-to-back', reward: 12000, district: 'oldtown', standing: 24, text: 'Sindikat menguji lo. Dua kontrak tanpa jeda.' },
  { id: 'm10', title: 'King of Ember Coast', objective: 'Hold all 5 districts', reward: 25000, district: 'beach', standing: 30, text: 'Finale: kuasai semua distrik. Dusk Ember milikmu.' },
];

export const CONTRACTS = [
  { id: 'c1', title: 'Silent Courier', reward: 2200, text: 'Antar tanpa wanted naik.' },
  { id: 'c2', title: 'Hot Wheels', reward: 3100, text: 'Curi 2 mobil sport, antar ke bengkel.' },
  { id: 'c3', title: 'Scanner Down', reward: 3800, text: 'Hacker matikan scanner 60 detik.' },
  { id: 'c4', title: 'Payback', reward: 4600, text: 'Balas geng rival di Old Town.' },
  { id: 'c5', title: 'Ember Gold', reward: 6000, text: 'Rampok konvoi emas Ashgate.' },
];

export const RACES = [
  { id: 'r1', title: 'Beach Sprint', reward: 2500, laps: 2 },
  { id: 'r2', title: 'Neon Circuit', reward: 4200, laps: 3 },
  { id: 'r3', title: 'Volcano Climb', reward: 6500, laps: 2 },
];

export const CREW = [
  { id: 'driver', name: 'Rae — Getaway Driver', bonus: 'Escape speed +25%, roadblocks easier', unlock: 'Safehouse Lv.1' },
  { id: 'hacker', name: 'Zero — Hacker', bonus: 'Kills police scanner 45s, wanted decays faster', unlock: 'Safehouse Lv.2' },
];

export const STUNT_RAMPS = [
  { pos: [-60, 20], angle: 0.6 },
  { pos: [60, 40], angle: -0.8 },
  { pos: [0, 120], angle: 1.57 },
  { pos: [-140, 0], angle: 0.2 },
];
