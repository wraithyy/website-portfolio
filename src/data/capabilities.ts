import type { Lang } from '../i18n/ui';

export interface Capability {
  title: Record<Lang, string>;
  proof: Record<Lang, string>;
}

export const capabilities: Capability[] = [
  {
    title: { en: 'Platform & microfrontend architecture', cs: 'Architektura platforem a mikrofrontendů' },
    proof: {
      en: 'proof: architected a core-system rebuild for a major insurance group — framework used daily by dozens of developers',
      cs: 'důkaz: architektura přestavby core systému velké pojišťovací skupiny — framework denně používaný desítkami vývojářů',
    },
  },
  {
    title: { en: 'Leading frontend teams', cs: 'Vedení frontend týmů' },
    proof: {
      en: 'proof: led FE teams on a public mobile-first self-service app and on a utility giant’s sales digitalization',
      cs: 'důkaz: vedení FE týmů na veřejné mobile-first samoobslužné aplikaci a na digitalizaci prodeje energetického giganta',
    },
  },
  {
    title: { en: 'Delivery in regulated industries', cs: 'Dodávka v regulovaných odvětvích' },
    proof: {
      en: 'proof: fully online bank-account opening incl. identity verification; paperless contracting end-to-end',
      cs: 'důkaz: plně online založení bankovního účtu vč. ověření identity; paperless zasmluvnění end-to-end',
    },
  },
  {
    title: { en: 'Analysis & client communication', cs: 'Analýza a komunikace s klientem' },
    proof: {
      en: 'proof: analysis phase of sales & customer portals for an energy company — the spec its delivery team builds on',
      cs: 'důkaz: analytická fáze sales a zákaznických portálů pro energetickou firmu — specifikace, na které staví dodávkový tým',
    },
  },
];
