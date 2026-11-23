// Shots — deterministic scene presets for ?shot= (start/play/chase/end).
// Called before first render so screenshots are real renders of game code.
export function applyShot(game, shot) {
  const p = game.player;
  const pol = game.police;
  const eco = game.economy;
  const hideStart = () => { const s = document.getElementById('start-screen'); if (s) s.style.display = 'none'; };
  if (shot === 'start') {
    p.x = 0; p.z = 40; p.yaw = 0; p.inCar = false;
    p.mesh.visible = true; p.carMesh.visible = false;
    p.mesh.position.set(p.x, 0, p.z);
    game.started = false;
    game.renderer.setShotCamera(0, 9, 62, 0, 6, -40);
    game.renderer.setBeacon(-120, -120);
    return 'start';
  }
  if (shot === 'play') {
    hideStart();
    game.started = true;
    p.x = 0; p.z = 20; p.yaw = 0; p.cash = 18400;
    p.enterCar(); p.speed = 18;
    eco.businesses[0].level = 1; eco.businesses[1].level = 1; eco.businesses[2].level = 0;
    eco.recompute();
    game.missions.list[0].done = true; game.missions.list[1].done = true;
    game.missions.currentIndex = 2;
    game.renderer.setBeacon(110, -90);
    game.renderer.follow({ x: p.x, y: 0, z: p.z }, p.yaw, true, 1);
    return 'play';
  }
  if (shot === 'chase') {
    hideStart();
    game.started = true;
    // Open-road framing: player on the x=0 road heading +z, cops right behind.
    p.x = 0; p.z = 0; p.yaw = 0; p.cash = 42350; p.health = 82;
    p.enterCar(); p.speed = 30;
    eco.businesses[0].level = 2; eco.businesses[1].level = 2; eco.businesses[2].level = 1;
    eco.safehouseLevel = 2; eco.recompute();
    game.missions.list[0].done = true; game.missions.list[1].done = true;
    game.missions.list[2].done = true; game.missions.list[3].done = true;
    game.missions.currentIndex = 4;
    pol.setWanted(4);
    pol.heat = 122; // stay 4-star through the screenshot's decay window
    // Compose the cover frame, then freeze it: cops flanking the player,
    // helicopter ahead in view, roadblocks on the road ahead.
    pol.cops.forEach((c, i) => {
      const lane = i % 2 === 0 ? -4.6 : 4.6;
      c.x = p.x + lane; c.z = p.z - 3 - Math.floor(i / 2) * 7;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = 0;
    });
    if (pol.heli) { pol.heli.position.set(12, 18, p.z + 45); }
    if (pol.roadblocks[0]) pol.roadblocks[0].position.set(-4, 0.6, 70);
    if (pol.roadblocks[1]) pol.roadblocks[1].position.set(5, 0.6, 88);
    game.frozen = true;
    game.renderer.setBeacon(120, 110);
    game.renderer.follow({ x: p.x, y: 0, z: p.z }, p.yaw, true, 1);
    return 'chase';
  }
  if (shot === 'end') {
    hideStart();
    game.started = true;
    // Stand south of Neon Club VOLT facing it (yaw PI faces -z): follow camera
    // looks north over the player straight at the club pylon + gold beacon.
    p.x = 96; p.z = -80; p.yaw = Math.PI; p.cash = 128400;
    p.inCar = false; p.mesh.visible = true; p.carMesh.visible = false;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.yaw;
    eco.businesses[0].level = 3; eco.businesses[1].level = 3; eco.businesses[2].level = 3;
    eco.safehouseLevel = 3; eco.recompute();
    game.missions.list.forEach(m => { m.done = true; });
    game.missions.currentIndex = 10;
    game.missions.districts.forEach(d => { d.controlled = true; d.standing = 88; });
    pol.clearWanted();
    game.renderer.setBeacon(96, -108);
    game.renderer.follow({ x: p.x, y: 0, z: p.z }, p.yaw, false, 1);
    return 'end';
  }
  return 'play';
}
