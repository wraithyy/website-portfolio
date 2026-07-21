import type { Lang } from '../i18n/ui';

export interface Capability {
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  proof: Record<Lang, string>;
}

export const capabilities: Capability[] = [
  {
    title: { en: 'Platform & microfrontend architecture', cs: 'Architektura platforem a mikrofrontendů' },
    body: {
      en: 'Frontend platforms that let many teams ship independently — shells, federated modules, typed seams.',
      cs: 'Frontend platformy, na kterých může nezávisle dodávat mnoho týmů — shelly, federované moduly, typované švy.',
    },
    proof: {
      en: 'proof: architected a core-system rebuild for a major insurance group — framework used daily by dozens of developers',
      cs: 'důkaz: architektura přestavby core systému velké pojišťovací skupiny — framework denně používaný desítkami vývojářů',
    },
  },
  {
    title: { en: 'Leading frontend teams', cs: 'Vedení frontend týmů' },
    body: {
      en: 'Team lead who still reads the diffs — honest reviews, mentoring, one quality bar for everyone.',
      cs: 'Team lead, který pořád čte diffy — poctivá review, mentoring, jedna laťka kvality pro všechny.',
    },
    proof: {
      en: 'proof: led FE teams on a public mobile-first self-service app and on a utility giant’s sales digitalization',
      cs: 'důkaz: vedení FE týmů na veřejné mobile-first samoobslužné aplikaci a na digitalizaci prodeje energetického giganta',
    },
  },
  {
    title: { en: 'Delivery in regulated industries', cs: 'Dodávka v regulovaných odvětvích' },
    body: {
      en: 'Banking, insurance, energy — interfaces that hold up where mistakes are expensive.',
      cs: 'Bankovnictví, pojišťovnictví, energetika — rozhraní, která obstojí tam, kde jsou chyby drahé.',
    },
    proof: {
      en: 'proof: fully online bank-account opening incl. identity verification; paperless contracting end-to-end',
      cs: 'důkaz: plně online založení bankovního účtu vč. ověření identity; paperless zasmluvnění end-to-end',
    },
  },
  {
    title: { en: 'Analysis & client communication', cs: 'Analýza a komunikace s klientem' },
    body: {
      en: 'I translate between the boardroom and the codebase: requirements, architecture, and estimates a release can be planned on.',
      cs: 'Překládám mezi byznysem a kódem: požadavky, architektura a odhady, na které jde naplánovat release.',
    },
    proof: {
      en: 'proof: analysis phase of sales & customer portals for an energy company — the spec its delivery team builds on',
      cs: 'důkaz: analytická fáze sales a zákaznických portálů pro energetickou firmu — specifikace, na které staví dodávkový tým',
    },
  },
  {
    title: { en: 'AI-first development, human-verified', cs: 'AI-first vývoj s lidskou verifikací' },
    body: {
      en: 'AI-assisted since the Copilot closed beta, with a hard rule: AI drafts, an engineer signs.',
      cs: 'AI-assisted od closed bety Copilotu, s tvrdým pravidlem: AI draftuje, inženýr podepisuje.',
    },
    proof: {
      en: 'proof: open-source agent tooling below · internal AI talks · SDLC-automation initiative',
      cs: 'důkaz: open-source agent tooling níže · interní AI přednášky · iniciativa automatizace SDLC',
    },
  },
];
