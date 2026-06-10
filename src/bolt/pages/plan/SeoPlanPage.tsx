import { ArrowRight, BarChart3, CheckCircle2, Clock3, FileSearch, Link as LinkIcon, Map, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const auditStats = [
  { value: '15', label: 'live sitemap URLs found' },
  { value: '9', label: 'local sitemap URLs found' },
  { value: '1', label: 'H1 per audited live page' },
  { value: '90', label: 'days in the first push' },
];

const statusFindings = [
  {
    icon: CheckCircle2,
    title: 'The technical foundation is usable',
    body: 'The live pages I checked return 200, have one H1, include canonicals, use indexable robots tags, and expose a sitemap from robots.txt.',
  },
  {
    icon: Map,
    title: 'The content map is already expanding',
    body: 'The live sitemap includes pages for webinar no-shows, Zoom webinar reminders, reminder templates, wallet pass marketing, and a calculator, which is stronger than the older local sitemap.',
  },
  {
    icon: FileSearch,
    title: 'Repo parity needs cleanup',
    body: 'This checkout still lists only the original marketing pages in public/sitemap.xml, so future deploys could accidentally remove newer SEO URLs unless the source is brought current.',
  },
  {
    icon: BarChart3,
    title: 'Rank data is not available locally',
    body: 'The repo has Search Console scripts, but this environment is missing the local OAuth credentials required to pull impressions, clicks, average position, and query-level movement.',
  },
];

const priorities = [
  {
    label: 'Protect',
    title: 'Lock the live SEO surface into source control',
    body: 'Reconcile the deployed sitemap, routes, metadata, and prerender paths so the 15 live URLs are not dependent on a stale branch or manual deploy state.',
  },
  {
    label: 'Consolidate',
    title: 'Turn every page into a cluster node',
    body: 'Make wallet-pass, webinar, event, booked-call, and GoHighLevel pages link to one another by intent instead of treating each page as a standalone landing page.',
  },
  {
    label: 'Publish',
    title: 'Ship answer-led pages and off-site responses',
    body: 'Use the existing traffic backlog to publish content around no-shows, webinar reminders, GHL appointment reminders, and wallet-vs-email visibility.',
  },
  {
    label: 'Measure',
    title: 'Rebuild reporting around Search Console',
    body: 'Track branded demand, non-branded category terms, query clusters, indexed pages, click-through rate, and page-level conversion to checkout or pricing.',
  },
];

const roadmap = [
  {
    window: 'Days 1-14',
    title: 'Baseline and safety',
    items: [
      'Restore Search Console credentials locally and export a 90-day query baseline.',
      'Reconcile local source with the 15 live sitemap URLs.',
      'Add rank and index checks for every indexable URL to the release checklist.',
      'Create a simple SEO dashboard: clicks, impressions, CTR, average position, indexed URL count, and top query clusters.',
    ],
  },
  {
    window: 'Days 15-45',
    title: 'Content cluster buildout',
    items: [
      'Expand the webinar cluster: Zoom reminders, reminder sequence template, no-show reduction, and reminder failure analysis.',
      'Expand the booked-call cluster: appointment reminders, GHL no-shows, ghosting diagnosis, and calendar-plus-wallet workflows.',
      'Add FAQ sections with practical answers on the highest-intent pages.',
      'Strengthen internal links from homepage, pricing, and every cluster page to the most relevant next page.',
    ],
  },
  {
    window: 'Days 46-90',
    title: 'Authority and compounding',
    items: [
      'Execute the top directory submissions already researched: G2, Capterra, GetApp, Product Hunt, SaaSHub, and GoHighLevel Marketplace.',
      'Publish the highest-scoring answer-engine drafts in HubSpot, Zoom, Reddit, and Stack Overflow communities where product mention is appropriate.',
      'Create comparison pages only where the product can be specific, useful, and honest.',
      'Refresh titles and meta descriptions using Search Console CTR data after the first measurement cycle.',
    ],
  },
];

const contentTargets = [
  'webinar no-show reduction',
  'Zoom webinar reminders',
  'GoHighLevel appointment reminders',
  'booked call no-show reminders',
  'wallet pass marketing',
  'Apple Wallet vs email reminders',
  'Google Wallet reminders for Android audiences',
  'event reminder sequence template',
];

const measurementPlan = [
  'Non-branded clicks from wallet pass, webinar reminder, booked-call, and GoHighLevel query clusters.',
  'Impressions for pages published or refreshed in the last 30 days.',
  'Average position movement for target queries before and after internal-link updates.',
  'Click-through rate for pages with rewritten titles and descriptions.',
  'Checkout, pricing, and demo intent events attributed to organic landing pages.',
];

export default function SeoPlanPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="border-b border-gray-100 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] pt-24 pb-12 lg:pt-28 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-gblue/20 bg-white px-3 py-1 text-xs font-semibold text-gblue">
              <Search className="h-4 w-4" />
              SEO plan
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              A practical plan to move ShowFi.io from visible to defensible
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Current status: the public site has a sound SEO base and a growing topic map, but the next lift comes from
              source-control parity, query-level measurement, tighter internal links, and consistent authority work.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#roadmap"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                View roadmap
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/wallet-pass-software"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                Core SEO page
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {auditStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold tracking-tight text-gray-900">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase text-gray-500">Current scan</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Where we stand today</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {statusFindings.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-gblue" />
                <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-[#fbfdff] py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Priorities</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">The highest-leverage moves</h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                The goal is not more pages for the sake of more pages. The goal is a measured cluster that teaches search
                engines ShowFi owns the attendance-visibility problem across wallet, webinar, appointment, and event use cases.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {priorities.map((priority) => (
                <div key={priority.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="inline-flex rounded bg-ggreen/10 px-2 py-1 text-[11px] font-semibold uppercase text-ggreen">
                    {priority.label}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{priority.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{priority.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase text-gray-500">90-day roadmap</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">What gets us into a better position</h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {roadmap.map((phase) => (
              <div key={phase.window} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gblue">
                  <Clock3 className="h-4 w-4" />
                  {phase.window}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{phase.title}</h3>
                <ul className="mt-4 space-y-3">
                  {phase.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ggreen" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-[#fbfdfb] py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
              <LinkIcon className="h-4 w-4" />
              Content targets
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Topics to build around</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {contentTargets.map((target) => (
                <span key={target} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  {target}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
              <ShieldCheck className="h-4 w-4" />
              Measurement
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Scoreboard for progress</h2>
            <ul className="mt-5 space-y-3">
              {measurementPlan.map((metric) => (
                <li key={metric} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                  <BarChart3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gblue" />
                  <span>{metric}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
