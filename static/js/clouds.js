/*--------------------------------------------------------------
  AMBIENT RAIN & CLOUD PARTICLE CANVAS ENGINE - CLOUDS.JS
--------------------------------------------------------------*/
(() => {
  const canvas = document.getElementById("cloud-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Rain Drops
  const rainDrops = [];
  const maxRain = 75;

  for (let i = 0; i < maxRain; i++) {
    rainDrops.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 20 + 10,
      speed: Math.random() * 8 + 6,
      opacity: Math.random() * 0.3 + 0.1
    });
  }

  // Soft Cloud Mist Particles
  const clouds = [];
  const maxClouds = 14;

  for (let i = 0; i < maxClouds; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.7,
      radius: Math.random() * 180 + 100,
      vx: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.08 + 0.03
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Draw Soft Cloud Mists
    clouds.forEach(c => {
      c.x += c.vx;
      if (c.x - c.radius > width) c.x = -c.radius;

      const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.radius);
      grad.addColorStop(0, `rgba(56, 189, 248, ${c.opacity})`);
      grad.addColorStop(0.5, `rgba(148, 163, 184, ${c.opacity * 0.5})`);
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Falling Rain Droplets
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";

    rainDrops.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.length);
      ctx.stroke();

      r.y += r.speed;
      r.x -= 0.5;

      if (r.y > height) {
        r.y = -20;
        r.x = Math.random() * width;
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
})();
