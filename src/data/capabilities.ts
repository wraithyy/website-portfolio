import type { Lang } from '../i18n/ui';

export interface Capability {
  title: Record<Lang, string>;
  proof: Record<Lang, string>;
}

export const capabilities: Capability[] = [
  {
    title: { en: 'Platform & microfrontend architecture', cs: 'Architektura platforem a mikrofrontendů' },
    proof: {
      en: 'architected a core-system rebuild for a major insurance group — a framework dozens of developers use daily',
      cs: 'architektura přestavby core systému velké pojišťovací skupiny — framework, který denně používají desítky vývojářů',
    },
  },
  {
    title: { en: 'Leading frontend teams', cs: 'Vedení frontend týmů' },
    proof: {
      en: 'led frontend teams on a public mobile-first self-service app — and on a utility giant’s sales digitalization',
      cs: 'vedení FE týmů: veřejná mobile-first samoobslužná aplikace a digitalizace prodeje energetického giganta',
    },
  },
  {
    title: { en: 'Delivery in regulated industries', cs: 'Dodávka v regulovaných odvětvích' },
    proof: {
      en: 'delivered fully online bank-account opening incl. identity verification; paperless contracting end-to-end',
      cs: 'plně online založení bankovního účtu vč. ověření identity; bezpapírové zasmluvnění od A do Z',
    },
  },
  {
    title: { en: 'Analysis & client communication', cs: 'Analýza a komunikace s klientem' },
    proof: {
      en: 'ran the analysis phase of sales & customer portals for an energy company — the spec its delivery team builds on',
      cs: 'analytická fáze sales a zákaznických portálů pro energetickou firmu — specifikace, na které staví dodávkový tým',
    },
  },
];
