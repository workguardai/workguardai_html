// How it works, step 2: plan points along the excavation profile.
(() => {
  const g = document.getElementById('hiw-dots');
  if (!g) return;
  const NS = 'http://www.w3.org/2000/svg';
  const pts = [];
  for (let x = 10; x <= 70; x += 8) pts.push([x, 120]);
  for (let i = 0; i <= 2; i++) pts.push([70 + i * 7.5, 120 + i * 14]);
  for (let x = 85; x <= 155; x += 8) pts.push([x, 148]);
  for (let i = 0; i <= 2; i++) pts.push([155 + i * 7.5, 148 - i * 14]);
  for (let x = 170; x <= 230; x += 8) pts.push([x, 120]);
  pts.forEach(([x, y], n) => {
    [0, 12].forEach((off) => {
      if (off && n % 2) return;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y + off);
      c.setAttribute('r', 2);
      c.setAttribute('fill', '#5255e0');
      c.setAttribute('class', 'dot');
      c.style.animationDelay = ((n * 0.37) % 2).toFixed(2) + 's';
      g.appendChild(c);
    });
  });
})();
