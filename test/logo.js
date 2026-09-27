const LOGO_SOURCE = 'svgs/rc-logo.svg';

async function mountLogoCanvas(container) {
  const el = container.querySelector('.content-logo');
  if (!el || el.dataset.logoMounted) return;

  const res = await fetch(LOGO_SOURCE);
  if (!res.ok) throw new Error(`Failed to load ${LOGO_SOURCE}`);

  el.innerHTML = await res.text();
  el.dataset.logoMounted = 'true';
}

function refreshLogoCanvas() {}
