export const languages = {
  en: 'English',
  cs: 'Čeština',
} as const;

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    'meta.title': 'Josef Kvapil — Frontend Architect',
    'meta.description':
      'Frontend architect and team lead. React and TypeScript platforms for banking, energy and insurance — and open-source tooling that keeps code honest.',
    'nav.skip': 'Skip to main content',
    'nav.projects': 'Open source',
    'nav.experience': 'Capabilities',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.themeToggle': 'Toggle dark mode',
    'nav.langSwitch': 'Česky',
    'nav.menu': 'index',
    'nav.close': 'close',

    'story.kicker': 'Frontend architect — Liberec',
    'story.headline': 'A button, built the way I build platforms.',
    'story.intro':
      'I architect and lead frontend platforms for banks and enterprises. Here is the foundation: six steps, in order, none skipped.',
    'story.facts':
      'Josef Kvapil · senior frontend architect · React & TypeScript · 10+ years · banking, insurance, energy · Liberec, CZ',
    'story.bridge': 'I can lead the big things because I never skipped the small ones.',
    'story.bridgeMeta': 'architecture · leadership · React · TypeScript · TanStack',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Say hello',
    'story.skip': 'skip',

    'exp.label': 'Capabilities',
    'exp.title': 'What I bring to a project.',
    'exp.note': 'Real deliveries; I deliberately don’t name clients.',

    'projects.label': 'Open source',
    'projects.title': 'Tools that speak for me in public',
    'about.label': 'About',
    'about.title': 'I dig into how things work underneath.',
    'about.bio':
      'I wrote my first PHP website in sixth grade and never stopped. Today that means React and TanStack down to the internals — and knowing when a project needs boring and proven instead. I work AI-first, with one hard rule:',
    'about.aiStance': 'AI drafts, an engineer signs. Vibecoding is not engineering.',
    'about.stackLabel': 'Stack',
    'about.employersLabel': 'Where I’ve worked',
    'about.factsLabel': 'For the record',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifications · mentoring & internal talks · CZ / EN / DE',
    'contact.label': 'Contact',
    'contact.title': 'Bring me a hard problem.',
    'contact.body':
      'I like sinking my teeth into interesting frontend problems, architecture work and open-source collaboration.',
    'contact.cv': 'download CV (PDF)',
    'contact.meta': 'remote or hybrid · Liberec / Prague · CZ / EN',
    'contact.ctaLabel': 'btn / your-project',
    'contact.ctaNote': 'the next sketch could be yours',
    'footer.colophon': 'Set in Instrument Serif & JetBrains Mono. Built with Astro.',
  },
  cs: {
    'meta.title': 'Josef Kvapil — Frontend architekt',
    'meta.description':
      'Frontend architekt a team lead. React a TypeScript pro bankovnictví, energetiku a pojišťovnictví — a open-source nástroje, které drží kód v lati.',
    'nav.skip': 'Přeskočit na hlavní obsah',
    'nav.projects': 'Open source',
    'nav.experience': 'Co umím',
    'nav.about': 'O mně',
    'nav.contact': 'Kontakt',
    'nav.themeToggle': 'Přepnout tmavý režim',
    'nav.langSwitch': 'English',
    'nav.menu': 'index',
    'nav.close': 'zavřít',

    'story.kicker': 'Frontend architekt — Liberec',
    'story.headline': 'Tlačítko postavené stejně jako moje platformy.',
    'story.intro':
      'Navrhuju a vedu frontend platformy pro banky a enterprise. Tady jsou základy: šest kroků, popořadě, žádný se nepřeskakuje.',
    'story.facts':
      'Josef Kvapil · senior frontend architekt · React & TypeScript · 10+ let · bankovnictví, pojišťovnictví, energetika · Liberec, CZ',
    'story.bridge': 'Velké věci zvládnu vést, protože jsem nikdy nepřeskočil ty malé.',
    'story.bridgeMeta': 'architektura · leadership · React · TypeScript · TanStack',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Ozvěte se',
    'story.skip': 'přeskočit',

    'exp.label': 'Co umím',
    'exp.title': 'Co do projektu přináším.',
    'exp.note': 'Reálné dodávky; klienty záměrně nejmenuji.',

    'projects.label': 'Open source',
    'projects.title': 'Nástroje, které za mě mluví veřejně',
    'about.label': 'O mně',
    'about.title': 'Zajímá mě, jak věci fungují uvnitř.',
    'about.bio':
      'První web jsem v PHP napsal v šesté třídě a nepřestal. Dnes to znamená React a TanStack až do zdrojáků — a vědomí, kdy projekt potřebuje raději nudné a prověřené. Pracuju AI-first s jedním tvrdým pravidlem:',
    'about.aiStance': 'AI navrhne, inženýr podepíše. Vibecoding není inženýrství.',
    'about.stackLabel': 'Stack',
    'about.employersLabel': 'Kde jsem pracoval',
    'about.factsLabel': 'Pro pořádek',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifikace · mentoring a interní přednášky · CZ / EN / DE',
    'contact.label': 'Kontakt',
    'contact.title': 'Přineste mi tvrdý oříšek.',
    'contact.body': 'Rád se zakousnu do zajímavého frontend problému, architektury i open-source spolupráce.',
    'contact.cv': 'stáhnout životopis (PDF)',
    'contact.meta': 'remote i hybrid · Liberec / Praha · CZ / EN',
    'contact.ctaLabel': 'btn / váš-projekt',
    'contact.ctaNote': 'další výkres může být váš',
    'footer.colophon': 'Vysazeno písmy Instrument Serif a JetBrains Mono. Postaveno na Astru.',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)['en'];

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key];
  };
}
