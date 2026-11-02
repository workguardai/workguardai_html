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

// Forms: send to Formspree without leaving the page.
// Without JavaScript a form posts normally and Formspree shows its own confirmation.
document.querySelectorAll('form[data-sending]').forEach((form) => {
  if (form.getAttribute('action') === '#') return;
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
      const updates = form.elements.interest?.value === 'Updates';
      form.reset();
      form.dispatchEvent(new Event('change'));
      show(updates ? form.dataset.successUpdates : form.dataset.success);
    } catch {
      show(form.dataset.error, true);
    } finally {
      button.disabled = false;
    }
  });
});

// Contact form: the fields follow the chosen interest, and links can preselect it
// (?interest=event&event=AIREX). Without JavaScript all fields show and the form still sends.
(() => {
  const form = document.getElementById('work-form');
  if (!form) return;
  const interest = form.elements.interest;
  const consent = document.getElementById('f-consent');

  const apply = () => {
    const option = interest.selectedOptions[0];
    form.querySelectorAll('[data-for]').forEach((block) => {
      const show = block.dataset.for.split(' ').includes(option.dataset.key);
      block.hidden = !show;
      block.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = !show; });
    });
    consent.required = option.dataset.key === 'updates';
    form.elements._subject.value = `WorkGuardAI: ${option.value}`;
  };
  form.addEventListener('change', (event) => { if (event.target === form || event.target === interest) apply(); });

  const params = new URLSearchParams(location.search);
  const option = [...interest.options].find((o) => o.dataset.key === params.get('interest'));
  if (option) interest.value = option.value;
  if (params.get('event')) form.elements.event_name.value = params.get('event');
  apply();
  if (option) form.querySelector('.field:not([hidden]) input:not([type="radio"])').focus({ preventScroll: true });
})();

// Share links: copy the link, and offer the device's own share sheet where there is one.
document.querySelectorAll('a[data-copy]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    if (!navigator.clipboard) return;
    event.preventDefault();
    await navigator.clipboard.writeText(link.href);
    const label = link.textContent;
    link.textContent = link.dataset.copy;
    setTimeout(() => { link.textContent = label; }, 2000);
  });
});
if (navigator.share) {
  document.querySelectorAll('.share-native').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      navigator.share({ title: button.dataset.shareTitle, url: button.dataset.shareUrl }).catch(() => {});
    });
  });
}

// Hero banner, events list and event card: only events that have not ended yet.
(() => {
  const data = document.getElementById('upcoming-events');
  if (!data) return;
  const today = new Date().toISOString().slice(0, 10);
  const next = JSON.parse(data.textContent).find((event) => event.end >= today);
  const banner = document.getElementById('hero-event');
  const cta = document.getElementById('event-cta');
  document.querySelectorAll('[data-end]').forEach((row) => { row.hidden = row.dataset.end < today; });
  banner.hidden = !next;
  document.getElementById('events').hidden = !next;
  cta.textContent = next ? next.cta : cta.dataset.none;
  if (!next) return;
  document.getElementById('event-cta-link').href = next.meet;
  banner.querySelector('[data-event-tag]').textContent = next.tag;
  banner.querySelector('[data-event-label]').textContent = next.label;
})();

// Sample alert: open the screenshot in a large view. Without JavaScript the link opens the image.
(() => {
  const open = document.getElementById('alert-open');
  const dialog = document.getElementById('alert-dialog');
  if (!open || !dialog || !dialog.showModal) return;
  open.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
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
