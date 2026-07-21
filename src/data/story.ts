import type { Lang } from '../i18n/ui';

export interface StoryStep {
  label: Record<Lang, string>;
  title: Record<Lang, string>;
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
    onButton: { en: 'one component, one clear job', cs: 'jedna komponenta, jedna jasná práce' },
    onPlatform: {
      en: 'one domain, one clear owner',
      cs: 'jedna doména, jeden jasný vlastník',
    },
    note: { en: 'fig. 01 — wireframe, no fill', cs: 'obr. 01 — wireframe, bez výplně' },
  },
  {
    label: { en: '02 — TypeScript', cs: '02 — TypeScript' },
    title: { en: 'Then I write its contract.', cs: 'Pak mu napíšu kontrakt.' },
    onButton: {
      en: 'typed props between component and caller',
      cs: 'typované props mezi komponentou a volajícím',
    },
    onPlatform: {
      en: 'typed contracts between teams',
      cs: 'typované kontrakty mezi týmy',
    },
    note: { en: 'fig. 02 — contract attached', cs: 'obr. 02 — kontrakt připojen' },
  },
  {
    label: { en: '03 — Design systems', cs: '03 — Design systémy' },
    title: { en: 'Every state is a decision.', cs: 'Každý stav je rozhodnutí.' },
    onButton: {
      en: 'hover, pressed, disabled — each decided once',
      cs: 'hover, pressed, disabled — každý rozhodnutý jednou',
    },
    onPlatform: {
      en: 'colors, forms, patterns — each decided once, for every team',
      cs: 'barvy, formuláře, vzory — každý rozhodnutý jednou, pro všechny týmy',
    },
    note: { en: 'fig. 03 — state: hover, 400ms ease', cs: 'obr. 03 — stav: hover, 400 ms ease' },
  },
  {
    label: { en: '04 — Accessibility', cs: '04 — Přístupnost' },
    title: { en: 'It works for every hand.', cs: 'Funguje pro každou ruku.' },
    onButton: {
      en: 'one focus ring, one 44px target',
      cs: 'jeden focus ring, jeden 44px target',
    },
    onPlatform: {
      en: 'the same bar on every screen — WCAG 2.1 AA',
      cs: 'stejná laťka na každé obrazovce — WCAG 2.1 AA',
    },
    note: { en: 'fig. 04 — works without a mouse', cs: 'obr. 04 — funguje bez myši' },
  },
  {
    label: { en: '05 — Review & AI leverage', cs: '05 — Review & AI' },
    title: { en: 'Then it has to prove itself.', cs: 'Pak to musí dokázat.' },
    onButton: { en: 'one diff: reviewed, tested, signed', cs: 'jeden diff: review, testy, podpis' },
    onPlatform: {
      en: 'every diff from dozens of developers: the same bar',
      cs: 'každý diff desítek vývojářů: stejná laťka',
    },
    note: {
      en: 'fig. 05 — renders ✓ keyboard ✓ contrast ✓',
      cs: 'obr. 05 — renders ✓ klávesnice ✓ kontrast ✓',
    },
  },
  {
    label: { en: '06 — Delivery', cs: '06 — Dodávka' },
    title: { en: 'Now it’s real.', cs: 'Teď je to naostro.' },
    onButton: { en: 'live in production — press it', cs: 'naživo v produkci — zmáčkněte si ho' },
    onPlatform: {
      en: 'live for banks, insurers and utilities',
      cs: 'naživo pro banky, pojišťovny a energetiku',
    },
    note: { en: 'fig. 06 — shipped. press it.', cs: 'obr. 06 — nasazeno. zmáčkněte.' },
  },
];
