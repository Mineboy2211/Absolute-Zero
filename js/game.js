// One game tick (pure logic, no DOM). Shared by the browser loop, offline progress and tools/sim.js.

function gameTick(dt) {
  if (!(dt > 0)) return;
  player.stats.timePlayed += dt;
  player.T = player.T.add(heatGain().mul(dt));
  player.bestT = player.bestT.max(player.T);
  Layers.tick(dt);
  Automation.run();
  Challenges.tick();
  Achievements.tick();
  Chapters.tick();
}

// Advance `seconds` of game time in at most `maxSteps` ticks (each tick at most `maxDt` long when possible).
function simulateTime(seconds, maxSteps = 1000, maxDt = 1) {
  const steps = Math.max(1, Math.min(maxSteps, Math.ceil(seconds / maxDt)));
  const dt = seconds / steps;
  for (let i = 0; i < steps; i++) gameTick(dt);
}
