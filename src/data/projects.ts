import type { Lang } from '../i18n/ui';

export interface Project {
  name: string;
  description: Record<Lang, string>;
  href: string;
  meta: string;
}

export const projects: Project[] = [
  {
    name: 'biome-you-might-not-need-an-effect',
    description: {
      en: 'Biome linter plugin detecting unnecessary React useEffect hooks, based on react.dev guidelines. Published on npm.',
      cs: 'Biome linter plugin odhalující zbytečné React useEffect hooky podle react.dev guidelines. Publikováno na npm.',
    },
    href: 'https://github.com/wraithyy/biome-you-might-not-need-an-effect',
    meta: 'npm',
  },
  {
    name: 'construe',
    description: {
      en: 'Natural language to validated structured output. React-first, provider-agnostic LLM tooling built on Standard Schema.',
      cs: 'Převádí přirozený jazyk na validovaný strukturovaný výstup. React-first, provider-agnostic LLM nástroj postavený na Standard Schema.',
    },
    href: 'https://github.com/wraithyy/construe',
    meta: 'library',
  },
  {
    name: 'companion',
    description: {
      en: 'Desktop app that visualizes what Claude Code is doing in real time — wired to its hooks, so you see every edit, test and tool call as it happens.',
      cs: 'Desktopová aplikace, která v reálném čase ukazuje, co Claude Code právě dělá — napojená na jeho hooks, takže vidíte každý edit, test i tool call.',
    },
    href: 'https://github.com/wraithyy/companion',
    meta: 'app',
  },
  {
    name: 'openclaw-guardian',
    description: {
      en: 'Rate-limit aware HTTP proxy and session healer for the Claude API. Prometheus metrics, Grafana dashboard, zero dependencies.',
      cs: 'HTTP proxy pro Claude API, která hlídá rate-limity a oživuje spadlé sessions. Prometheus metriky, Grafana dashboard, bez závislostí.',
    },
    href: 'https://github.com/wraithyy/openclaw-guardian',
    meta: 'infra',
  },
];
