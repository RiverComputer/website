const contentEl = document.getElementById('content');
const themeToggle = document.getElementById('theme-toggle');
const newsletterForm = document.getElementById('newsletter-form');

const svgCache = new Map();

async function loadSvg(path) {
  if (svgCache.has(path)) return svgCache.get(path);

  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);

  const markup = await res.text();
  svgCache.set(path, markup);
  return markup;
}

async function loadPageSvg(page) {
  if (!page.svg) return null;
  try {
    return await loadSvg(page.svg);
  } catch (err) {
    console.warn(`Could not load page graphic: ${page.svg}`, err);
    return null;
  }
}

function initTheme() {
  const saved = localStorage.getItem('rc-theme');
  const theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rc-theme', next);
  refreshLogoCanvas();
}

function setActiveLink(href) {
  document.querySelectorAll('[data-page]').forEach((link) => {
    link.classList.toggle('active', href && link.getAttribute('href') === href);
  });
}

function showHome(pushState = true) {
  setActiveLink(null);
  contentEl.innerHTML = '';
  document.title = 'River Computer';
  if (pushState) history.pushState({ page: null }, '', location.pathname + location.search);
}

function renderArticle(page, svgMarkup) {
  const meta = page.author || page.date
    ? `<div class="page-meta">${page.author ? `<span>${page.author}</span>` : ''}${page.date ? `<span>${page.date}</span>` : ''}</div>`
    : '';

  return `
    <article class="essay-enter">
      <header class="page-header">
        <h2 class="page-title"><em>${page.title}</em></h2>
        ${page.subtitle ? `<p class="page-subtitle">${page.subtitle}</p>` : ''}
        ${meta}
      </header>
      <hr class="divider">
      ${svgMarkup ? `<div class="page-graphic">${svgMarkup}</div>` : ''}
      <div class="page-body">
        ${(page.body || []).map((p) => `<p>${p}</p>`).join('')}
      </div>
      ${page.quote ? `<blockquote class="page-quote"><p>${page.quote.text}</p>${page.quote.cite ? `<cite>${page.quote.cite}</cite>` : ''}</blockquote>` : ''}
      ${page.footerLinks?.length ? `<hr class="divider">` : ''}
      ${page.footerLinks?.length ? `<nav class="page-footer-links">${page.footerLinks.map((l) => `<a href="${l.href}"${l.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a>`).join('')}</nav>` : ''}
    </article>
  `;
}

function renderNews(page) {
  return `
    <div class="news-page">
      <h2 class="section-label">${page.title}</h2>
      <ul class="news-list">
        ${(page.entries || []).map((entry) => `
          <li class="news-item">
            <span class="news-date">${entry.date}</span>
            <div>
              <div class="news-title">${entry.title}</div>
              ${entry.location ? `<div class="news-location">${entry.location}</div>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderConnect(page) {
  return `
    <div class="connect-page">
      <h2 class="section-label">${page.title}</h2>
      <ul class="connect-list">
        ${(page.links || []).map((l) => `<li><a href="${l.href}"${l.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a></li>`).join('')}
      </ul>
      ${page.body ? `<div class="page-body" style="margin-top:20px">${page.body.map((p) => `<p>${p}</p>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderTeam(page) {
  return `
    <div class="team-page">
      <h2 class="section-label">${page.title}</h2>
      <ul class="team-list">
        ${(page.members || []).map((member) => `
          <li class="team-member">
            <div class="team-name">${member.name}</div>
            ${member.role ? `<div class="team-role">${member.role}</div>` : ''}
          </li>
        `).join('')}
      </ul>
      ${page.body ? `<div class="page-body">${page.body.map((p) => `<p>${p}</p>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderPage(page, svgMarkup) {
  if (page.type === 'news') return renderNews(page);
  if (page.type === 'connect') return renderConnect(page);
  if (page.type === 'team') return renderTeam(page);
  return renderArticle(page, svgMarkup);
}

async function loadPage(href, pushState = true) {
  setActiveLink(href);
  contentEl.innerHTML = '';

  try {
    const pageRes = await fetch(href);
    if (!pageRes.ok) throw new Error(`Failed to load ${href}`);
    const page = await pageRes.json();
    const svgMarkup = page.type === 'news' || page.type === 'connect' || page.type === 'team'
      ? null
      : await loadPageSvg(page);
    contentEl.innerHTML = renderPage(page, svgMarkup);
    document.title = `${page.title} — River Computer`;
    if (pushState) history.pushState({ page: href }, '', `#${href.replace('content/', '').replace('.json', '')}`);
    scrollToContentOnMobile();
  } catch (err) {
    contentEl.innerHTML = `<div class="content-loading">Could not load page.</div>`;
    console.error(err);
  }
}

// On mobile the rail stacks above the content, so bring the new page into view.
function scrollToContentOnMobile() {
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  contentEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function handleNavClick(e) {
  const link = e.target.closest('[data-page]');
  if (!link) return;
  e.preventDefault();
  loadPage(link.getAttribute('href'));
}

function handlePopState(e) {
  const href = e.state?.page || getPageFromHash();
  if (href) loadPage(href, false);
  else showHome(false);
}

function getPageFromHash() {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  return `content/${hash}.json`;
}

document.getElementById('brand-link').addEventListener('click', (e) => {
  e.preventDefault();
  location.href = location.pathname + location.search;
});

document.addEventListener('click', handleNavClick);
window.addEventListener('popstate', handlePopState);

themeToggle.addEventListener('click', toggleTheme);

// Posts to the MailerLite "River Computer Newsletter Signup" embedded form.
const NEWSLETTER_ENDPOINT = 'https://assets.mailerlite.com/jsonp/2362465/forms/199885811647251869/subscribe';

newsletterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newsletter-email');
  const body = new FormData();
  body.append('fields[email]', input.value);
  body.append('ml-submit', '1');
  body.append('anticsrf', 'true');

  let message;
  try {
    const res = await fetch(NEWSLETTER_ENDPOINT, { method: 'POST', body });
    const data = await res.json();
    message = data.success ? 'Thanks — check your inbox to confirm.' : 'Please check that email and try again.';
  } catch (err) {
    message = 'Something went wrong — try again.';
    console.error(err);
  }

  input.value = '';
  input.placeholder = message;
  setTimeout(() => {
    input.placeholder = 'you@example.com';
  }, 4000);
});

const backToTop = document.getElementById('back-to-top');
const railNav = document.querySelector('.rail-nav');

// Show the back-to-top button once the project nav has scrolled offscreen.
new IntersectionObserver(([entry]) => {
  backToTop.classList.toggle('visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
}).observe(railNav);

backToTop.addEventListener('click', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

initTheme();
mountLogoCanvas(document);

const initialPage = getPageFromHash();
if (initialPage) loadPage(initialPage, false);
else showHome(false);
