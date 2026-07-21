import type { Lang } from '../i18n/ui';

export interface StoryStep {
  label: Record<Lang, string>;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  /** the same skill at both scales — rendered as a two-line comparison */
  onButton: Record<Lang, string>;
  onPlatform: Record<Lang, string>;
  /** short caption shown under the sticky stage */
  note: Record<Lang, string>;
}

export const storySteps: StoryStep[] = [
  {
    label: { en: '01 — Architecture', cs: '01 — Architektura' },
    title: { en: 'I draw the boundary first.', cs: 'Nejdřív nakreslím hranici.' },
    body: {
      en: 'Before anything looks like anything, I decide where it ends and who may touch it. Around a button or around a bank’s domains — the line is the same.',
      cs: 'Než něco začne jakkoli vypadat, rozhodnu, kde to končí a kdo na to smí sahat. Kolem tlačítka i kolem domén banky je to tatáž čára.',
    },
    onButton: { en: 'one component, one job', cs: 'jedna komponenta, jedna práce' },
    onPlatform: {
      en: 'domain boundaries and what teams may import from each other',
      cs: 'hranice domén a co si týmy smí navzájem importovat',
    },
    note: { en: 'fig. 01 — wireframe, no fill', cs: 'obr. 01 — wireframe, bez výplně' },
  },
  {
    label: { en: '02 — TypeScript', cs: '02 — TypeScript' },
    title: { en: 'Then I write its contract.', cs: 'Pak mu napíšu kontrakt.' },
    body: {
      en: 'What a thing cannot promise, the compiler refuses on my behalf. With scale grows only the blast radius of a broken promise.',
      cs: 'Co věc nedokáže slíbit, odmítne za mě kompilátor. S měřítkem roste jen dosah škod, když se slib poruší.',
    },
    onButton: { en: 'typed props: intent, size, onPress', cs: 'typed props: intent, size, onPress' },
    onPlatform: {
      en: 'typed API contracts between a dozen teams',
      cs: 'typované API kontrakty mezi tuctem týmů',
    },
    note: { en: 'typed props: intent, size, onPress', cs: 'typed props: intent, size, onPress' },
  },
  {
    label: { en: '03 — Design systems', cs: '03 — Design systémy' },
    title: { en: 'Every state is a decision.', cs: 'Každý stav je rozhodnutí.' },
    body: {
      en: 'Hover, pressed, disabled — someone has to decide them on purpose. Each decision made once, so no team ever makes it twice.',
      cs: 'Hover, pressed, disabled — někdo je musí rozhodnout záměrně. Každé rozhodnutí jednou, aby ho žádný tým nedělal podruhé.',
    },
    onButton: { en: 'hover, pressed, disabled — designed, not defaulted', cs: 'hover, pressed, disabled — navržené, ne defaultní' },
    onPlatform: {
      en: 'a design system that answers questions before teams ask them',
      cs: 'design systém, který odpovídá dřív, než se týmy stihnou zeptat',
    },
    note: { en: 'state: hover · transition 400ms ease', cs: 'state: hover · transition 400ms ease' },
  },
  {
    label: { en: '04 — Accessibility', cs: '04 — Přístupnost' },
    title: { en: 'It works for every hand.', cs: 'Funguje pro každou ruku.' },
    body: {
      en: 'A keyboard, a screen reader, a shaky thumb on a phone — an interface has to work for everyone, not just the ideal user with a mouse.',
      cs: 'Klávesnice, čtečka obrazovky, roztřesený palec na telefonu — rozhraní musí fungovat každému, ne jen ideálnímu uživateli s myší.',
    },
    onButton: { en: 'focus-visible ring · 44px target', cs: 'focus-visible ring · touch target 44 px' },
    onPlatform: {
      en: 'WCAG 2.1 AA across every screen and every team',
      cs: 'WCAG 2.1 AA napříč všemi obrazovkami a týmy',
    },
    note: { en: 'role=button · focus-visible ring · 44px target', cs: 'role=button · focus-visible ring · 44px target' },
  },
  {
    label: { en: '05 — Review & AI leverage', cs: '05 — Review & AI' },
    title: { en: 'Then it has to prove it.', cs: 'Pak to musí dokázat.' },
    body: {
      en: 'Tests and review before anything ships — the same bar for my code, my team’s, and the AI’s. Nothing merges without a human signature.',
      cs: 'Testy a review, než jde cokoli ven — stejná laťka pro můj kód, kód týmu i AI. Bez lidského podpisu se nemerguje nic.',
    },
    onButton: { en: 'this diff: reviewed, tested, signed', cs: 'tenhle diff: review, testy, podpis' },
    onPlatform: {
      en: 'a review culture dozens of developers ship through',
      cs: 'review kultura, kterou prochází dodávka desítek vývojářů',
    },
    note: {
      en: 'renders ✓ announces ✓ keyboard ✓ contrast 4.8:1 ✓',
      cs: 'renders ✓ announces ✓ keyboard ✓ contrast 4.8:1 ✓',
    },
  },
  {
    label: { en: '06 — Delivery', cs: '06 — Dodávka' },
    title: { en: 'Now it’s real.', cs: 'Teď je to naostro.' },
    body: {
      en: 'The same element you have watched the whole way down, now wired to a real address. The workflow never changes — only the number of zeros.',
      cs: 'Stejný prvek, který jste sledovali celou cestu dolů, teď napojený na skutečnou adresu. Workflow se nemění — jen počet nul.',
    },
    onButton: { en: 'wired to production — press it', cs: 'zapojené do produkce — zmáčkněte si ho' },
    onPlatform: {
      en: 'platforms serving banks, insurers and utilities',
      cs: 'platformy, na kterých běží banky, pojišťovny a energetika',
    },
    note: { en: 'in production — press it.', cs: 'v produkci — zmáčkněte si ho.' },
  },
];
