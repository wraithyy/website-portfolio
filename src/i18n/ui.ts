export const languages = {
  en: 'English',
  cs: 'Čeština',
} as const;

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    'meta.title': 'Josef Kvapil · Frontend Architect',
    'meta.description':
      'Frontend architect and team lead. React and TypeScript platforms for banking, insurance, energy and automotive, plus open-source linting tools on npm.',
    'nav.skip': 'Skip to main content',
    'nav.experience': 'Capabilities',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.themeToggle': 'Toggle dark mode',
    'nav.langSwitch': 'Česky',
    'nav.menu': 'index',
    'nav.close': 'close',

    'story.kicker': 'Frontend architect',
    'story.headline': 'A button, built the way I build platforms.',
    'story.intro':
      'I architect and lead frontend platforms that other teams build on, for banking, insurance, energy and automotive. This is the foundation: six steps, in order, none skipped.',
    'story.facts':
      'React & TypeScript · 10+ years · Liberec, CZ',
    'story.bridge': 'Platforms are the same six steps, at scale.',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Say hello',
    'story.skip': 'skip',

    'exp.title': 'What I bring to a project.',
    'exp.proof': 'delivered',
    'exp.note': 'Real projects, real clients. I just don’t name them.',

    'about.title': 'I dig into how things work under the hood.',
    'about.bio':
      'I wrote my first PHP website in sixth grade and never stopped. Today that means React and TanStack down to the internals. I love exploring new tech and passing it on to colleagues, and I know when a project needs boring, proven tech instead. I use AI every day, with one hard rule:',
    'about.aiStance': 'AI speeds me up; it doesn’t steer. Vibecoding is not engineering.',
    'about.stackLabel': 'Stack',
    'about.employersLabel': 'Where I’ve worked',
    'about.factsLabel': 'For the record',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifications · mentoring & internal talks · CZ / EN / DE',
    'contact.title': 'Bring me a hard problem.',
    'contact.body':
      'I like sinking my teeth into hard frontend problems: architecture, delivery, open source.',
    'contact.cv': 'download CV (PDF)',
    'contact.meta': 'open to new engagements · remote or hybrid · Liberec / Prague · CZ / EN',
    'contact.ctaLabel': 'btn / your-project',
    'footer.colophon': 'Set in Instrument Serif, Public Sans & JetBrains Mono. Built with Astro.',

    'ar.role': 'Frontend architect · Liberec',
    'ar.hint': 'Grab a bar and throw it',
    'ar.hint2': 'It snaps back. Every time.',
    'ar.hint3': 'Well-built things hold. Double-tap to test all five.',
    'ar.hint4': 'Still standing.',
    'ar.hintN': 'attempts to break it: {n} · still standing',
    'ar.hintAccent': 'The red one is opinionated. It comes back faster.',
    'ar.hintRage': 'You’re persistent. So is my code.',
    'ar.finale': 'OK, ten’s enough. Here’s the button.',
    'ar.standing': 'Still standing. ({n}/10)',
    'ar.alt': 'Interactive 3D monogram of Josef Kvapil. Grab a bar and throw it; it springs back into place',
    'ar.save': 'Save contact',
    'ar.mail': 'Write to me',
    'ar.web': 'jkvapil.cz',
    'ar.toast': 'Contact saved ✓',
  },
  cs: {
    'meta.title': 'Josef Kvapil · Frontend architekt',
    'meta.description':
      'Frontend architekt a team lead. React a TypeScript platformy pro bankovnictví, pojišťovnictví, energetiku a automotive, k tomu open-source lintovací nástroje na npm.',
    'nav.skip': 'Přeskočit na hlavní obsah',
    'nav.experience': 'Co umím',
    'nav.about': 'O mně',
    'nav.contact': 'Kontakt',
    'nav.themeToggle': 'Přepnout tmavý režim',
    'nav.langSwitch': 'English',
    'nav.menu': 'index',
    'nav.close': 'zavřít',

    'story.kicker': 'Frontend architekt',
    'story.headline': 'Tlačítko postavené stejně jako moje platformy.',
    'story.intro':
      'Navrhuju a vedu frontend platformy, na kterých staví další týmy, pro bankovnictví, pojišťovnictví, energetiku a automotive. Tady jsou základy: šest kroků, popořadě, žádný se nepřeskakuje.',
    'story.facts':
      'React & TypeScript · 10+ let · Liberec, CZ',
    'story.bridge': 'Platformy jsou těch samých šest kroků, jen ve větším.',
    'story.btnSketch': 'btn / primary',
    'story.btnReal': 'Ozvěte se',
    'story.skip': 'přeskočit',

    'exp.title': 'Co do projektu přináším.',
    'exp.proof': 'dodáno',
    'exp.note': 'Reálné dodávky; klienty záměrně nejmenuji.',

    'about.title': 'Zajímá mě, jak věci fungují uvnitř.',
    'about.bio':
      'První web jsem napsal v PHP v šesté třídě a od té doby mě to nepustilo. Dnes stavím na Reactu a TanStacku a vidím jim až pod kapotu. Rád zkoumám nové technologie a předávám je dál kolegům, ale vím, kdy projekt naopak potřebuje nudné a prověřené řešení. AI používám naplno každý den, s jedním železným pravidlem:',
    'about.aiStance': 'AI mě zrychluje, ale neřídí. Vibecoding není inženýrství.',
    'about.stackLabel': 'Stack',
    'about.employersLabel': 'Kde jsem pracoval',
    'about.factsLabel': 'Pro pořádek',
    'about.facts':
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifikace · mentoring a interní přednášky · CZ / EN / DE',
    'contact.title': 'Přineste mi tvrdý oříšek.',
    'contact.body': 'Rád se zakousnu do tvrdých frontend problémů: architektura, delivery i open source.',
    'contact.cv': 'stáhnout životopis (PDF)',
    'contact.meta': 'otevřený novým projektům · remote i hybrid · Liberec / Praha · CZ / EN',
    'contact.ctaLabel': 'btn / váš-projekt',
    'footer.colophon': 'Vysazeno písmy Instrument Serif, Public Sans a JetBrains Mono. Postaveno na Astru.',

    'ar.role': 'Frontend architekt · Liberec',
    'ar.hint': 'Chyť trámek a hoď s ním',
    'ar.hint2': 'Zapadne zpátky. Pokaždé.',
    'ar.hint3': 'Dobře postavené věci drží. Poklepej 2× a zkus všech pět.',
    'ar.hint4': 'Pořád stojí.',
    'ar.hintN': 'pokusy o rozbití: {n} · pořád stojí',
    'ar.hintAccent': 'Ten červený je můj názor. Vrací se rychleji.',
    'ar.hintRage': 'Nedáš se. Můj kód taky ne.',
    'ar.finale': 'Dobře, deset stačí. Tady máš tlačítko.',
    'ar.standing': 'Pořád stojí. ({n}/10)',
    'ar.alt': 'Interaktivní 3D monogram Josefa Kvapila. Chyť trámek a hoď s ním; zapadne zpátky na místo',
    'ar.save': 'Uložit kontakt',
    'ar.mail': 'Napiš mi',
    'ar.web': 'jkvapil.cz',
    'ar.toast': 'Kontakt uložen ✓',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)['en'];

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key];
  };
}
