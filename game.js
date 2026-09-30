const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dialogText = document.getElementById("dialogText");
const speedFill = document.querySelector("#speedometer .fill");
const fuelFill = document.querySelector("#fuel-bar .fill");
const shieldFill = document.querySelector("#shield-bar .fill");

const keys = new Set();
const stars = [];
const particles = [];
const planet = { x: 0, y: 0, radius: 110 };
const ship = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, fuel: 80, shield: 100 };

let width = 0;
let height = 0;
let dpr = 1;
let lastTime = 0;
let paused = false;
let landing = false;
let landed = false;
let autopilot = false;
let landingProgress = 0;
let dialogTimer;

const messages = [
  "Willkommen an Bord, Lando!",
  "Ich bin Keira, dein Autopilot.",
  "Der Zielplanet ist voraus. Halte Kurs!",
  "Lando, die Landung kann beginnen."
];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  planet.x = width * 0.72;
  planet.y = height * 0.4;
  planet.radius = Math.max(82, Math.min(width, height) * 0.14);

  if (!ship.x) {
    ship.x = width * 0.22;
    ship.y = height * 0.54;
  }

  stars.length = 0;
  for (let i = 0; i < Math.floor((width * height) / 7000); i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      twinkle: Math.random() * Math.PI * 2
    });
  }
}

function say(message) {
  dialogText.textContent = message;
  clearTimeout(dialogTimer);
  dialogTimer = setTimeout(() => {
    dialogText.textContent = "Bereit für den nächsten Flug, Lando?";
  }, 5000);

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(message);
    voice.lang = "de-DE";
    voice.rate = 0.95;
    voice.pitch = 1.15;
    window.speechSynthesis.speak(voice);
  }
}

function resetGame() {
  ship.x = width * 0.22;
  ship.y = height * 0.54;
  ship.vx = 0;
  ship.vy = 0;
  ship.angle = 0;
  ship.fuel = 80;
  ship.shield = 100;
  landing = false;
  landed = false;
  autopilot = false;
  landingProgress = 0;
  say(messages[0]);
}

function createParticle(x, y, color = "#ffb34d", amount = 2) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: Math.random() * 55 + 15,
      life: 0.5 + Math.random() * 0.6,
      maxLife: 1,
      color
    });
  }
}

function beginLanding() {
  if (landing || landed || ship.fuel <= 0) return;
  landing = true;
  autopilot = true;
  landingProgress = 0;
  ship.vx = 0;
  ship.vy = 0;
  say(messages[3]);
}

function update(delta) {
  if (paused) return;
  const dt = Math.min(delta / 1000, 0.035);

  if (landing) {
    landingProgress = Math.min(landingProgress + dt / 5, 1);
    const eased = landingProgress * landingProgress * (3 - 2 * landingProgress);
    ship.x += (planet.x - ship.x) * dt * 0.75;
    ship.y += (planet.y + planet.radius * 0.72 - ship.y) * dt * 0.75;
    ship.angle = Math.sin(landingProgress * Math.PI * 5) * 0.05;
    ship.fuel = Math.max(0, ship.fuel - dt * 1.5);
    createParticle(ship.x, ship.y + 22, "#62e8ff", 2);
    if (landingProgress >= 1) {
      landing = false;
      landed = true;
      autopilot = false;
      ship.x = planet.x;
      ship.y = planet.y + planet.radius * 0.72;
      say("Landung erfolgreich, Lando! Keira meldet: Planet erreicht.");
    }
  } else if (!landed) {
    const thrust = 180;
    if (keys.has("ArrowLeft")) ship.vx -= thrust * dt;
    if (keys.has("ArrowRight")) ship.vx += thrust * dt;
    if (keys.has("ArrowUp")) ship.vy -= thrust * dt;
    if (keys.has("ArrowDown")) ship.vy += thrust * dt;

    const accelerating = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].some((key) => keys.has(key));
    if (accelerating && ship.fuel > 0) ship.fuel = Math.max(0, ship.fuel - dt * 2.5);
    ship.vx *= 0.985;
    ship.vy *= 0.985;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.max(30, Math.min(width - 30, ship.x));
    ship.y = Math.max(45, Math.min(height - 100, ship.y));
    ship.angle = Math.max(-0.35, Math.min(0.35, ship.vx / 450));

    const distance = Math.hypot(planet.x - ship.x, planet.y - ship.y);
    if (distance < planet.radius + 25 && Math.hypot(ship.vx, ship.vy) > 145) {
      ship.shield = Math.max(0, ship.shield - dt * 12);
      createParticle(ship.x, ship.y, "#ff577d", 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) particles.splice(i, 1);
  }

  speedFill.style.width = `${Math.min(100, Math.hypot(ship.vx, ship.vy) / 2.5 + (landing ? 22 : 0))}%`;
  fuelFill.style.width = `${ship.fuel}%`;
  shieldFill.style.width = `${ship.shield}%`;
}

function drawBackground(time) {
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width);
  gradient.addColorStop(0, "#172964");
  gradient.addColorStop(0.45, "#071331");
  gradient.addColorStop(1, "#020511");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  stars.forEach((star) => {
    const alpha = star.alpha * (0.7 + Math.sin(time / 700 + star.twinkle) * 0.3);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#dff8ff";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
  ctx.globalAlpha = 1;
}

function drawPlanet(time) {
  const glow = ctx.createRadialGradient(planet.x, planet.y, planet.radius * 0.8, planet.x, planet.y, planet.radius * 2.2);
  glow.addColorStop(0, "rgba(94, 191, 255, 0.25)");
  glow.addColorStop(1, "rgba(94, 191, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const surface = ctx.createRadialGradient(planet.x - 35, planet.y - 45, 5, planet.x, planet.y, planet.radius);
  surface.addColorStop(0, "#8eeaff");
  surface.addColorStop(0.48, "#3676cf");
  surface.addColorStop(1, "#172d76");
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(145, 239, 255, 0.32)";
  ctx.lineWidth = 10;
  for (let i = -2; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(planet.x + i * 24 + Math.sin(time / 1600) * 8, planet.y + i * 30, planet.radius * 0.7, 9, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#dffaff";
  ctx.font = "600 14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(landed ? "LANDUNG ERFOLGREICH" : "ZIELPLANET", planet.x, planet.y - planet.radius - 15);
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (!landed) {
    ctx.fillStyle = "rgba(255, 159, 64, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-9, 19);
    ctx.lineTo(0, 42 + Math.random() * 9);
    ctx.lineTo(9, 19);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowColor = "#56e8ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#dffaff";
  ctx.beginPath();
  ctx.moveTo(0, -31);
  ctx.lineTo(18, 22);
  ctx.lineTo(0, 16);
  ctx.lineTo(-18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#3164cf";
  ctx.beginPath();
  ctx.ellipse(0, -11, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#54e8ff";
  ctx.fillRect(-22, 18, 14, 4);
  ctx.fillRect(8, 18, 14, 4);
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
  });
  ctx.globalAlpha = 1;
}

function render(time) {
  drawBackground(time);
  drawPlanet(time);
  drawParticles();
  drawShip();
  if (paused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", width / 2, height / 2);
  }
}

function loop(time) {
  update(time - lastTime);
  lastTime = time;
  render(time);
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key === "p" || event.key === "P") paused = !paused;
  if (event.key === " " && !paused) beginLanding();
  keys.add(event.key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key));

resize();
say(messages[0]);
requestAnimationFrame(loop);
