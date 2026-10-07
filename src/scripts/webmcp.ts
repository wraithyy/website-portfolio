/* WebMCP (https://webmachinelearning.github.io/webmcp/) — exposes the site to
   in-browser AI agents as typed tools instead of making them scrape the DOM.
   No-op in browsers without the API. */
import { capabilities } from '../data/capabilities';
import { email, github, linkedin } from '../data/site';
import { type Lang, ui } from '../i18n/ui';

interface ModelContext {
  registerTool(tool: {
    name: string;
    title?: string;
    description: string;
    inputSchema?: object;
    execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
    annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  }): Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    modelContext?: ModelContext;
  }
}

export function register() {
  // Spec moved the API from navigator to document; early Chrome builds still use navigator.
  const mc = document.modelContext ?? navigator.modelContext;
  if (!mc) return;

  const lang: Lang = document.documentElement.lang === 'cs' ? 'cs' : 'en';
  const langSchema = { type: 'string', enum: ['en', 'cs'], description: 'Response language, defaults to the page language' };
  const pick = (v: unknown): Lang => (v === 'en' || v === 'cs' ? v : lang);

  mc.registerTool({
    name: 'get_profile',
    title: 'Josef Kvapil — profile',
    description:
      'Who Josef Kvapil is: frontend architect and team lead, his capabilities with proof, open-source work and contact links. Use before answering questions about him or deciding whether to reach out.',
    inputSchema: { type: 'object', properties: { lang: langSchema } },
    annotations: { readOnlyHint: true },
    execute: ({ lang: l }) => {
      const L = pick(l);
      return {
        name: 'Josef Kvapil',
        role: 'Frontend architect & team lead',
        location: 'Liberec, Czech Republic',
        summary: ui[L]['meta.description'],
        capabilities: capabilities.map((c) => ({ title: c.title[L], proof: c.proof[L] })),
        links: { email, github, linkedin, cv: new URL('/cv-josef-kvapil.pdf', location.origin).href },
      };
    },
  }).catch(() => {});

  mc.registerTool({
    name: 'draft_email',
    title: 'Draft an email to Josef',
    description:
      "Opens the user's mail client with a pre-filled email to Josef. Nothing is sent — the user reviews and sends it themselves.",
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', maxLength: 200 },
        body: { type: 'string', maxLength: 4000 },
      },
      required: ['subject', 'body'],
    },
    annotations: { consequentialHint: true },
    execute: ({ subject, body }) => {
      // Agent input is untrusted: coerce and cap rather than trust the schema was enforced.
      const s = String(subject ?? '').slice(0, 200);
      const b = String(body ?? '').slice(0, 4000);
      location.href = `mailto:${email}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
      return { opened: true, to: email };
    },
  }).catch(() => {});
}
