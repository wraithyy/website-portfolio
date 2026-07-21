export const languages = {
  en: 'English',
  cs: 'Čeština',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

export const ui = {
  en: {
    'meta.title': 'Josef Kvapil — Frontend Architect',
    'meta.description':
      'Frontend architect and team lead. React and TypeScript platforms for banking, energy and insurance — and open-source tooling that keeps frontend code honest.',
    'nav.skip': 'Skip to main content',
    'nav.projects': 'Open source',
    'nav.experience': 'Capabilities',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.themeToggle': 'Toggle dark mode',
    'nav.langSwitch': 'Česky',

    'story.kicker': 'Frontend architect — Liberec',
    'story.headline': 'A button, built the way I build platforms.',
    'story.intro':
      'I architect and lead frontend platforms for banks and enterprises. Here is the foundation: six steps, in order, none skipped — on a button or a platform.',
    'story.bridge': 'I can lead the big because I never skipped the small.',
    'story.bridgeMeta': 'architecture · leadership · React · TypeScript · TanStack',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Say hello',

    'exp.label': 'Capabilities',
    'exp.title': 'What I bring to a project.',
    'exp.note': 'Every proof is a real delivery. Clients stay unnamed by design — discretion is part of the job.',

    'projects.label': 'Open source',
    'projects.title': 'Tools that keep my honesty public',
    'about.label': 'About',
    'about.title': 'I dig into how things work underneath.',
    'about.bio':
      'I wrote my first PHP website in sixth grade and never stopped. Today that means React and TanStack down to the internals, a train seat to the next conference — and knowing exactly when a project needs proven and stable instead of cutting-edge.',
    'about.ai':
      'AI-assisted since the GitHub Copilot closed beta. Today: an AI-first workflow, my own agent tooling, internal talks. The rule is simple — AI drafts, an engineer signs. Vibecoding is not engineering.',
    'about.stackLabel': 'Stack',
    'about.polyglot':
      'A new language is not a barrier — I find my way around an unfamiliar codebase fast, whatever it is written in.',
    'about.employersLabel': 'Employment',
    'about.factsLabel': 'For the record',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifications · mentoring & internal talks · CZ / EN / DE',
    'contact.label': 'Contact',
    'contact.title': 'Say hello',
    'contact.body': 'Open to interesting frontend problems, architecture work and open-source collaboration.',
    'footer.colophon': 'Set in Instrument Serif & JetBrains Mono. Built with Astro.',
  },
  cs: {
    'meta.title': 'Josef Kvapil — Frontend architekt',
    'meta.description':
      'Frontend architekt a team lead. React a TypeScript platformy pro bankovnictví, energetiku a pojišťovnictví — a open-source nástroje, které drží frontend kód v lati.',
    'nav.skip': 'Přeskočit na hlavní obsah',
    'nav.projects': 'Open source',
    'nav.experience': 'Co umím',
    'nav.about': 'O mně',
    'nav.contact': 'Kontakt',
    'nav.themeToggle': 'Přepnout tmavý režim',
    'nav.langSwitch': 'English',

    'story.kicker': 'Frontend architekt — Liberec',
    'story.headline': 'Tlačítko postavené stejně, jako stavím platformy.',
    'story.intro':
      'Navrhuju a vedu frontend platformy pro banky a enterprise. Tady jsou základy: šest kroků, popořadě, žádný se nepřeskakuje — u tlačítka ani u platformy.',
    'story.bridge': 'Velké věci zvládnu vést, protože jsem nikdy nepřeskočil ty malé.',
    'story.bridgeMeta': 'architektura · leadership · React · TypeScript · TanStack',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Ozvěte se',

    'exp.label': 'Co umím',
    'exp.title': 'Co do projektu přináším.',
    'exp.note': 'Každý důkaz je reálná dodávka. Klienty záměrně nejmenuji — diskrétnost je součást práce.',

    'projects.label': 'Open source',
    'projects.title': 'Nástroje, které za mě mluví veřejně',
    'about.label': 'O mně',
    'about.title': 'Zajímá mě, jak věci fungují uvnitř.',
    'about.bio':
      'První web jsem v PHP napsal v šesté třídě a nepřestal. Dnes to znamená React a TanStack až do zdrojáků, místenku na vlak na další konferenci — a přesnou znalost toho, kdy projekt potřebuje raději prověřené a stabilní než cutting-edge.',
    'about.ai':
      'AI-assisted vývoj od closed bety GitHub Copilotu. Dnes: AI-first workflow, vlastní agent tooling, interní přednášky. Pravidlo je prosté — AI draftuje, inženýr podepisuje. Vibecoding není inženýrství.',
    'about.stackLabel': 'Stack',
    'about.polyglot':
      'Nový jazyk pro mě není bariéra — v cizí codebase se zorientuju rychle, ať je napsaná v čemkoli.',
    'about.employersLabel': 'Kde jsem pracoval',
    'about.factsLabel': 'Pro pořádek',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifikace · mentoring a interní přednášky · CZ / EN / DE',
    'contact.label': 'Kontakt',
    'contact.title': 'Ozvěte se',
    'contact.body': 'Rád se zakousnu do zajímavého frontend problému, architektury i open-source spolupráce.',
    'footer.colophon': 'Vysazeno písmy Instrument Serif a JetBrains Mono. Postaveno na Astru.',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)['en'];

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
