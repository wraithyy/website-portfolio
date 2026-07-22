/**
 * Konami easter egg payload — the slop version of this site. Loaded via
 * dynamic import() from Base.astro only after someone enters the code,
 * so it never ships to regular visitors.
 *
 * Real content is scraped from the page it covers (so it follows the
 * language too), then "AI-rewritten": Title Case Everything, buzzword
 * prefixes, appended slop claims. The chrome is every documented codegen
 * tell at once — Inter, indigo→purple gradient text, ✨ badge pill,
 * rounded cards with 1px gray borders, tech pills, stats band, five-star
 * testimonial, "Get Started", cursor glow + sparkle trail, unrequested
 * dark mode.
 */
import { email } from '../data/site';

let overlay: HTMLElement | null = null;

const SANS = 'Inter,ui-sans-serif,system-ui,sans-serif';
const MONO = "'JetBrains Mono',ui-monospace,monospace";
const GRADIENT_TEXT =
  'background:linear-gradient(90deg,#818cf8,#c084fc,#e879f9);-webkit-background-clip:text;background-clip:text;color:transparent';

const BUZZ_PREFIX = ['Blazingly Fast', 'AI-Powered', 'Enterprise-Grade', 'Next-Gen', 'Seamless', '10x'];
const BUZZ_CLAIM = [
  'Experience speeds like never before.',
  'Unlock seamless workflows with the power of AI.',
  'Bank-grade security meets world-class scalability.',
  'Boost productivity 10x from day one.',
  'Built for teams of any size, from startup to enterprise.',
  'Ship faster with zero configuration.',
];

/** the signature move of every vibecoded site: Title Case Everything */
const titleCase = (s: string) => s.replace(/\p{L}[\p{L}']*/gu, (w) => w[0].toUpperCase() + w.slice(1));

const card = (icon: string, title: string, body: string, claim: string) => `
  <div style="border:1px solid rgba(255,255,255,.1);border-radius:1rem;padding:1.5rem;text-align:left;background:rgba(255,255,255,.03)">
    <div style="width:2.5rem;height:2.5rem;border-radius:.625rem;background:rgba(129,140,248,.15);display:flex;align-items:center;justify-content:center;font-size:1.125rem">${icon}</div>
    <h3 style="margin:1rem 0 .5rem;font-size:1.0625rem;font-weight:600;color:#f4f4f5">${title}</h3>
    <p style="margin:0;font-size:.875rem;line-height:1.6;color:#a1a1aa">${body} <span style="color:#c7d2fe">${claim}</span></p>
  </div>`;

export function show(): void {
  if (overlay) return;

  /* -- scrape the real site ------------------------------------------- */
  const icons = ['⚡', '✨', '🔒', '🚀', '📈', '🧠', '🌐', '💎'];
  const caps = [...document.querySelectorAll('#experience ol li')].map((li, i) => ({
    icon: icons[i % icons.length],
    title: `${BUZZ_PREFIX[i % BUZZ_PREFIX.length]} ${titleCase(li.querySelector('h3')?.textContent?.trim() ?? '')}`,
    body: li.querySelector('p')?.textContent?.trim() ?? '',
    claim: BUZZ_CLAIM[i % BUZZ_CLAIM.length],
  }));
  const bio = document.querySelector('#about .text-lg')?.textContent?.trim() ?? '';
  const stack = [...document.querySelectorAll('#about dl dd')]
    .flatMap((dd) => (dd.textContent ?? '').split('·'))
    .map((s) => s.trim())
    .filter(Boolean);
  const mailto = document.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.href ?? `mailto:${email}`;

  /* -- assemble the slop ---------------------------------------------- */
  const pill = (t: string) =>
    `<span style="border:1px solid rgba(255,255,255,.12);border-radius:9999px;padding:.375rem .875rem;font-size:.8125rem;color:#d4d4d8;background:rgba(255,255,255,.04)">${t}</span>`;
  const stat = (n: string, l: string) =>
    `<div><div style="font-size:2rem;font-weight:800;${GRADIENT_TEXT}">${n}</div><div style="margin-top:.25rem;font-size:.8125rem;color:#71717a">${l}</div></div>`;

  overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'vibecoded version');
  overlay.style.cssText = `position:fixed;inset:0;z-index:100;overflow-y:auto;background:#09090b;color:#f4f4f5;font-family:${SANS};letter-spacing:-.01em;text-align:center`;
  overlay.innerHTML = `
    <style>
      @keyframes vc-sparkle { to { opacity: 0; translate: 0 -1.75rem; scale: .3; } }
      .vc-sparkle { position: fixed; z-index: 102; pointer-events: none; font-size: .875rem; animation: vc-sparkle .7s ease-out forwards; }
      @keyframes vc-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -.5rem; } }
    </style>
    <div style="position:fixed;z-index:101;width:24rem;height:24rem;border-radius:9999px;background:radial-gradient(closest-side,rgba(139,92,246,.16),transparent);pointer-events:none;translate:-50% -50%;left:-100rem;top:0" data-vc-glow></div>
    <div style="position:absolute;top:-10rem;left:50%;translate:-50% 0;width:40rem;height:24rem;background:radial-gradient(closest-side,rgba(99,102,241,.35),transparent);filter:blur(60px);pointer-events:none"></div>
    <div style="position:relative;max-width:64rem;margin:0 auto;padding:5rem 1.5rem 0">

      <div style="display:inline-flex;align-items:center;gap:.5rem;border:1px solid rgba(255,255,255,.12);border-radius:9999px;padding:.375rem 1rem;font-size:.8125rem;color:#c7d2fe;background:rgba(255,255,255,.04);animation:vc-float 3s ease-in-out infinite">✨ Introducing Josef Kvapil 2.0 — now with AI</div>
      <h1 style="margin:1.5rem 0 1rem;font-size:clamp(2.5rem,6vw,4.25rem);font-weight:800;line-height:1.1;letter-spacing:-.03em">Supercharge Your Frontend<br /><span style="${GRADIENT_TEXT}">Ship Blazingly Fast</span></h1>
      <p style="max-width:38rem;margin:0 auto 2rem;font-size:1.125rem;line-height:1.7;color:#a1a1aa">${bio || 'Josef is an AI-powered frontend architect that helps teams build stunning experiences at scale.'} <span style="color:#c7d2fe">Boost productivity 10x. No code review required.</span></p>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <a href="${mailto}" style="background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;border-radius:.625rem;padding:.75rem 1.75rem;font-weight:600;font-size:.9375rem;text-decoration:none">Get Started →</a>
        <a href="#" onclick="return false" style="border:1px solid rgba(255,255,255,.15);color:#f4f4f5;border-radius:.625rem;padding:.75rem 1.75rem;font-weight:600;font-size:.9375rem;text-decoration:none">Learn More</a>
      </div>
      <p style="margin:2.5rem 0 0;font-size:.8125rem;color:#71717a">Trusted by 10,000+ developers · banks · insurers · energy giants</p>

      <div style="display:flex;gap:3rem;justify-content:center;flex-wrap:wrap;margin-top:4rem;padding:2rem;border:1px solid rgba(255,255,255,.08);border-radius:1rem;background:rgba(255,255,255,.02)">
        ${stat('10+', 'Years Experience')}${stat('10x', 'Productivity')}${stat('99.9%', 'Uptime')}${stat('∞', 'Scalability')}
      </div>

      <h2 style="margin:5rem 0 .75rem;font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;letter-spacing:-.02em">Everything You Need to <span style="${GRADIENT_TEXT}">Ship Faster</span></h2>
      <p style="margin:0 0 2.5rem;color:#71717a;font-size:.9375rem">Powerful features. Zero compromises. One Josef.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:1rem">
        ${caps.map((c) => card(c.icon, c.title, c.body, c.claim)).join('')}
      </div>

      <p style="margin:5rem 0 1.25rem;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:#71717a">Powered by cutting-edge technology</p>
      <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;max-width:44rem;margin:0 auto">
        ${stack.map(pill).join('')}
      </div>

      <div style="max-width:38rem;margin:5rem auto 0;border:1px solid rgba(255,255,255,.1);border-radius:1rem;padding:2rem;background:rgba(255,255,255,.03)">
        <div style="color:#facc15;letter-spacing:.2em">★★★★★</div>
        <p style="margin:1rem 0 .75rem;font-size:1.0625rem;line-height:1.7;color:#d4d4d8">“Absolutely game-changing. Our frontend has never been more blazingly fast. We shipped 10x more features and our developers have never been happier.”</p>
        <p style="margin:0;font-size:.8125rem;color:#71717a">— CTO, a major bank (name withheld for compliance)</p>
      </div>

      <div style="margin:5rem 0 0;padding:3.5rem 2rem;border-radius:1.5rem;background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.25));border:1px solid rgba(255,255,255,.1)">
        <h2 style="margin:0 0 .75rem;font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;letter-spacing:-.02em">Ready to Supercharge Your Frontend?</h2>
        <p style="margin:0 0 1.75rem;color:#a1a1aa;font-size:.9375rem">Join thousands of teams already shipping blazingly fast.</p>
        <a href="${mailto}" style="display:inline-block;background:#fff;color:#09090b;border-radius:.625rem;padding:.75rem 2rem;font-weight:600;font-size:.9375rem;text-decoration:none">Get Started →</a>
        <p style="margin:1rem 0 0;font-size:.75rem;color:#71717a">No credit card required.</p>
      </div>

      <p style="margin:5rem 0 0;padding:1.5rem 0 6.5rem;border-top:1px solid rgba(255,255,255,.08);font-size:.75rem;color:#52525b">© 2026 Josef Kvapil 2.0 · Built in 5 minutes with AI · No humans were consulted</p>
    </div>
    <p role="status" style="position:fixed;bottom:1.25rem;left:50%;translate:-50% 0;z-index:103;margin:0;max-width:calc(100vw - 2rem);padding:.75rem 1.25rem;background:#faf8f4;color:#1a1815;font-family:${MONO};font-size:.8125rem;letter-spacing:.04em;box-shadow:0 4px 24px rgba(0,0,0,.4)">Same content. Zero review. AI drafts, people sign. — Esc to undo</p>`;

  /* -- the obligatory cursor effects ----------------------------------- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glow = overlay.querySelector<HTMLElement>('[data-vc-glow]');
  let lastSparkle = 0;
  const onMove = (e: MouseEvent) => {
    if (glow) {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }
    const now = performance.now();
    if (now - lastSparkle < 90 || !overlay) return;
    lastSparkle = now;
    const s = document.createElement('span');
    s.className = 'vc-sparkle';
    s.textContent = '✨';
    s.style.left = `${e.clientX + (Math.random() - 0.5) * 24}px`;
    s.style.top = `${e.clientY + (Math.random() - 0.5) * 24}px`;
    s.addEventListener('animationend', () => s.remove());
    overlay.append(s);
  };
  if (!reduced) overlay.addEventListener('mousemove', onMove);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    overlay?.remove();
    overlay = null;
    document.body.style.overflow = '';
    removeEventListener('keydown', onKey);
  };
  addEventListener('keydown', onKey);

  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
}
