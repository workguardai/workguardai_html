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

// Pilot form: send to Formspree without leaving the page.
// Without JavaScript the form posts normally and Formspree shows its own confirmation.
(() => {
  const form = document.getElementById('pilot-form');
  if (!form || form.getAttribute('action') === '#') return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');

  const show = (text, isError) => {
    status.textContent = text;
    status.classList.toggle('is-error', Boolean(isError));
    status.hidden = false;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    show(form.dataset.sending);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      show(form.dataset.success);
    } catch {
      show(form.dataset.error, true);
    } finally {
      button.disabled = false;
    }
  });
})();

// Hero: size the plan-point tag to its (translated) label.
(() => {
  const tag = document.querySelector('.survey-grid .tag');
  if (!tag) return;
  const rect = tag.querySelector('rect');
  const fit = () => {
    const width = Math.max(...[...tag.querySelectorAll('text')].map((t) => t.getBBox().width));
    if (width > 0) rect.setAttribute('width', (width + 10).toFixed(1));
  };
  document.fonts.ready.then(fit);
})();
