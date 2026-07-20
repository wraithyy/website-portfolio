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
      en: 'I design frontend platforms that let many teams ship independently — shells, federated modules, typed seams, and the framework underneath.',
      cs: 'Navrhuju frontend platformy, na kterých může nezávisle dodávat mnoho týmů — shelly, federované moduly, typované švy a framework pod tím vším.',
    },
    proof: {
      en: 'proof: architected a core-system rebuild for a major insurance group — framework used daily by dozens of developers',
      cs: 'důkaz: architektura přestavby core systému velké pojišťovací skupiny — framework denně používaný desítkami vývojářů',
    },
  },
  {
    title: { en: 'Leading frontend teams', cs: 'Vedení frontend týmů' },
    body: {
      en: 'Team lead who still reads the diffs. Honest review culture, mentoring, and the same quality bar for everyone — including me.',
      cs: 'Team lead, který pořád čte diffy. Poctivá review kultura, mentoring a stejná laťka kvality pro všechny — včetně mě.',
    },
    proof: {
      en: 'proof: led FE teams on a public mobile-first self-service app and on a utility giant’s sales digitalization',
      cs: 'důkaz: vedení FE týmů na veřejné mobile-first samoobslužné aplikaci a na digitalizaci prodeje energetického giganta',
    },
  },
  {
    title: { en: 'Delivery in regulated industries', cs: 'Dodávka v regulovaných odvětvích' },
    body: {
      en: 'Banking, insurance, energy — KYC flows, e-signing, SAP-integrated portals. Interfaces that hold up where mistakes are expensive.',
      cs: 'Bankovnictví, pojišťovnictví, energetika — KYC procesy, elektronické podepisování, portály napojené na SAP. Rozhraní, která obstojí tam, kde jsou chyby drahé.',
    },
    proof: {
      en: 'proof: fully online bank-account opening incl. identity verification; paperless contracting end-to-end',
      cs: 'důkaz: plně online založení bankovního účtu vč. ověření identity; paperless zasmluvnění end-to-end',
    },
  },
  {
    title: { en: 'Analysis & client communication', cs: 'Analýza a komunikace s klientem' },
    body: {
      en: 'I translate between the boardroom and the codebase: requirements, target architecture, functional specifications, and estimates someone can actually plan a release on.',
      cs: 'Překládám mezi byznysem a kódem: požadavky, cílová architektura, funkční specifikace a odhady, na které jde reálně naplánovat release.',
    },
    proof: {
      en: 'proof: analysis phase of sales & customer portals for an energy company — the spec its delivery team builds on',
      cs: 'důkaz: analytická fáze sales a zákaznických portálů pro energetickou firmu — specifikace, na které staví dodávkový tým',
    },
  },
  {
    title: { en: 'AI-first development, human-verified', cs: 'AI-first vývoj s lidskou verifikací' },
    body: {
      en: 'AI-assisted since the Copilot closed beta: my own agent tooling, internal talks, and a hard rule — AI drafts, an engineer signs. I also know when AI is the wrong tool.',
      cs: 'AI-assisted vývoj od closed bety Copilotu: vlastní agent tooling, interní přednášky a tvrdé pravidlo — AI draftuje, inženýr podepisuje. A vím i to, kdy je AI špatná volba.',
    },
    proof: {
      en: 'proof: open-source agent tooling below · internal AI talks · SDLC-automation initiative',
      cs: 'důkaz: open-source agent tooling níže · interní AI přednášky · iniciativa automatizace SDLC',
    },
  },
];
