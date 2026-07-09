/** @jsxImportSource hono/jsx */
import type { ApiKeyRecord, ExtractorRecord, ExtractorRunRecord, MonitorRecord, SessionUser, UsageEvent, WebhookRecord } from "./data";

const featureHelp: Record<string, { title: string; body: string; use: string; docs: string }> = {
  keys: { title: "API keys", body: "Keys let apps call Spindle. Create one key per app or environment, then send it as a Bearer token.", use: "Use for production apps, local scripts, agents, and backend jobs.", docs: "/getting-started" },
  usage: { title: "Usage", body: "Usage shows calls, credits, cache hits, providers, status codes, and when each request happened.", use: "Use it to debug cost, failed requests, cache savings, and endpoint activity.", docs: "/auth-and-errors" },
  jobs: { title: "Jobs", body: "Jobs are saved scrape, search, extract, crawl, and batch runs. Async work updates here when it finishes.", use: "Use it to inspect history and find stuck or failed work.", docs: "/api-reference" },
  webhooks: { title: "Webhooks", body: "Webhooks send a signed HTTP POST to your app when Spindle events happen.", use: "Use for Slack alerts, Discord bots, queues, ETL pipelines, and monitor change notifications.", docs: "/examples" },
  extractors: { title: "Extractors", body: "Extractors save a reusable prompt and output formats for pulling structured data from pages.", use: "Use for product pages, news pages, docs pages, directories, and agent context builders.", docs: "/extract" },
  monitors: { title: "Monitors", body: "Monitors check a URL on a schedule, compare content hashes, save runs, and fire webhooks when content changes.", use: "Use for Hacker News, status pages, pricing pages, docs changes, launch pages, and competitor pages.", docs: "/crawl" },
};

export function Page(props: { title: string; user?: SessionUser | null; children: any }) {
  return <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>{props.title} · Spindle</title>
      <script src="https://unpkg.com/htmx.org@2.0.4" defer></script>
      <style>{css}</style>
    </head>
    <body>
      <header class="topbar">
        <a class="brand" href="/"><span class="brand-mark">S</span><span>Spindle</span></a>
        <nav>
          <a href="/playground">Playground</a>
          <a href="/pricing">Pricing</a>
          <a href="/docs">Docs</a>
          {props.user ? <a href="/dashboard">Dashboard</a> : <a class="button small" href="/auth/github">Sign in</a>}
        </nav>
      </header>
      {props.children}
    </body>
  </html>;
}

export function MarketingPage(props: { user?: SessionUser | null }) {
  return <Page title="Web extraction at edge speed" user={props.user}>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Private beta · Cloudflare-native web data API</p>
          <h1>Spin messy pages into clean context.</h1>
          <p class="lead">Spindle searches, scrapes, maps, extracts, crawls, and monitors web pages with API keys, credits, cache savings, and dashboard control built in.</p>
          <div class="actions">
            <a class="button" href={props.user ? "/dashboard/keys" : "/request-access"}>Get API key</a>
            <a class="button ghost" href="/playground">Try playground</a>
          </div>
        </div>
        <div class="comic-panel">
          <div class="urlbar">POST /scrape</div>
          <pre>{`{
  "url": "https://docs.example.com",
  "formats": ["markdown", "json", "links"],
  "maxAge": 3600
}`}</pre>
          <div class="result-chip">200 · 2 credits · cache-ready</div>
        </div>
      </section>
      <section class="grid three">
        {feature("Cheap route first", "Fetch, cache, browser rendering, and Kernel session reuse are exposed as product controls, not hidden markup.")}
        {feature("Dashboard-native", "Manage keys, usage, jobs, webhooks, extractors, monitors, and settings from fast server-rendered pages.")}
        {feature("Agent-ready data", "Return markdown, JSON, links, screenshots, crawl results, and monitor changes through one stable API surface.")}
      </section>
      <section class="section-card">
        <h2>Built for developers who watch cost.</h2>
        <p>Private beta starts with usage visibility, weighted credits, cache-hit discounts, and request-access onboarding before card billing.</p>
        <div class="endpoint-grid">
          {endpoint("POST", "/search", "Search web results")}
          {endpoint("POST", "/scrape", "Scrape one URL")}
          {endpoint("POST", "/extract", "Extract structured records")}
          {endpoint("POST", "/map", "Discover links")}
          {endpoint("POST", "/crawl", "Run crawl jobs")}
          {endpoint("POST", "/batch/scrape", "Batch URL extraction")}
        </div>
      </section>
    </main>
  </Page>;
}

export function PricingPage(props: { user?: SessionUser | null }) {
  return <Page title="Private beta pricing" user={props.user}>
    <main class="narrow">
      <p class="eyebrow">Pricing</p>
      <h1>Private beta first. Transparent metering now.</h1>
      <p class="lead">Spindle tracks weighted credits today so pricing can be proven before live billing turns on.</p>
      <div class="grid two">
        {feature("Included in beta", "API keys, usage dashboard, jobs, webhooks, saved extractors, monitors, and limited anonymous playground.")}
        {feature("Credit weights", "Fetch 0.25, browser 1, JSON 2, screenshot +1, search 1 per 10 results, cache hit 0.1.")}
      </div>
      <a class="button" href={props.user ? "/dashboard/keys" : "/request-access"}>Get API key</a>
    </main>
  </Page>;
}

export function PlaygroundPage(props: { user?: SessionUser | null }) {
  return <Page title="Playground" user={props.user}>
    <main class="narrow">
      <p class="eyebrow">Limited anonymous demo</p>
      <h1>Try request shapes before creating a key.</h1>
      <form class="card form" data-hx-post="/api/demo/playground" data-hx-target="#demo-result">
        <label>Mode<select name="mode"><option>scrape</option><option>search</option><option>extract</option><option>map</option><option>crawl</option></select></label>
        <label>URL or query<input name="input" value="https://example.com" /></label>
        <label>Formats<input name="formats" value="markdown,json,links" /></label>
        <button class="button" type="submit">Run demo</button>
      </form>
      <div id="demo-result" class="card"><pre>{`{
  "success": true,
  "note": "Demo mode returns mock data. Real runs need an API key."
}`}</pre></div>
    </main>
  </Page>;
}

export function RequestAccessPage(props: { user?: SessionUser | null; submitted?: boolean }) {
  return <Page title="Get API key" user={props.user}>
    <main class="narrow">
      <p class="eyebrow">Private beta</p>
      <h1>Get an API key.</h1>
      {!props.user ? <div class="card"><p>Sign in with GitHub to open your dashboard and create an API key.</p><a class="button" href="/auth/github">Continue with GitHub</a></div> : <form class="card form" method="post" action="/request-access">
        <p>Signed in as <strong>@{props.user.github_login}</strong>. Your dashboard is ready. Create an API key now, or share a note if you want early beta updates.</p>
        <p><a class="button" href="/dashboard/keys">Create API key</a></p>
        <label>What are you building?<textarea name="use_case" rows={5} placeholder="Docs ingestion, agents, lead enrichment, monitoring..."></textarea></label>
        <button class="button" type="submit">Save note</button>
      </form>}
      {props.submitted ? <p class="notice">Note saved. You can use the dashboard now.</p> : null}
    </main>
  </Page>;
}

export function PendingPage(props: { user: SessionUser }) {
  return <Page title="Access pending" user={props.user}>
    <main class="narrow"><div class="card"><h1>Account paused.</h1><p>@{props.user.github_login} is signed in, but this account is not active.</p><a class="button" href="/request-access">Contact support</a></div></main>
  </Page>;
}

export function DashboardLayout(props: { user: SessionUser; active: string; children: any }) {
  const nav = ["overview", "keys", "usage", "jobs", "webhooks", "extractors", "monitors", "settings"];
  return <Page title="Dashboard" user={props.user}>
    <main class="dash">
      <aside class="sidebar">
        <div class="profile"><img src={props.user.avatar_url ?? ""} alt="" /><span>@{props.user.github_login}</span></div>
        {nav.map(item => <a class={props.active === item ? "active" : ""} href={item === "overview" ? "/dashboard" : `/dashboard/${item}`}>{label(item)}</a>)}
      </aside>
      <section class="dash-main">{props.children}</section>
    </main>
  </Page>;
}

export function OverviewPage(props: { user: SessionUser; summary: { credits: number; calls: number; cacheHits: number; errors: number }; monitors: MonitorRecord[] }) {
  return <DashboardLayout user={props.user} active="overview">
    <h1>Control room</h1>
    <div class="grid four">
      {metric("Credits", props.summary.credits.toFixed(2))}
      {metric("Calls", String(props.summary.calls))}
      {metric("Cache hits", String(props.summary.cacheHits))}
      {metric("Errors", String(props.summary.errors))}
    </div>
    <div class="card"><h2>Active monitors</h2><p>{props.monitors.filter(m => m.active).length} monitors watching pages for changes.</p></div>
  </DashboardLayout>;
}

export function KeysPage(props: { user: SessionUser; keys: ApiKeyRecord[]; raw?: string | null }) {
  return <DashboardLayout user={props.user} active="keys">
    <h1>API keys</h1>
    {props.raw ? <div class="notice"><strong>Copy now:</strong> <code>{props.raw}</code></div> : null}
    <form class="card row-form" method="post" action="/api/dashboard/keys"><input name="name" placeholder="Key name" /><button class="button">Create key</button></form>
    <Table headers={["Name", "Prefix", "Last used", "Status", ""]} rows={props.keys.map(key => [key.name, key.prefix, key.last_used_at ?? "Never", key.revoked_at ? "Revoked" : "Active", <form method="post" action={`/api/dashboard/keys/${key.id}/revoke`}><button class="link danger">Revoke</button></form>])} />
  </DashboardLayout>;
}

export function UsagePage(props: { user: SessionUser; events: UsageEvent[]; summary: { credits: number; calls: number; cacheHits: number; errors: number } }) {
  return <DashboardLayout user={props.user} active="usage">
    <h1>Usage</h1>
    <div class="grid four">{metric("Credits", props.summary.credits.toFixed(2))}{metric("Calls", String(props.summary.calls))}{metric("Cache hits", String(props.summary.cacheHits))}{metric("Errors", String(props.summary.errors))}</div>
    <Table headers={["Endpoint", "Method", "Status", "Credits", "Provider", "When"]} rows={props.events.map(e => [e.endpoint, e.method, String(e.status), String(e.credits), e.provider ?? "-", e.created_at])} />
  </DashboardLayout>;
}

export function JobsPage(props: { user: SessionUser; jobs: Array<Record<string, unknown>> }) {
  return <DashboardLayout user={props.user} active="jobs"><h1>Jobs</h1><Table headers={["ID", "Kind", "Status", "Credits", "Updated"]} rows={props.jobs.map(j => [String(j.id).slice(0, 8), String(j.kind), String(j.status), String(j.credits ?? "-"), String(j.updated_at)])} /></DashboardLayout>;
}

export function WebhooksPage(props: { user: SessionUser; webhooks: WebhookRecord[] }) {
  return <DashboardLayout user={props.user} active="webhooks"><h1>Webhooks</h1><HelpBlock id="webhooks" /><CrudForm action="/api/dashboard/webhooks" fields={["name", "url", "events"]} checkbox="active" button="Save webhook" hints={{ name: "Example: Slack bridge", url: "https://your-app.com/spindle-webhook", events: "monitor.changed,monitor.failed,extractor.completed" }} /><Table headers={["Name", "URL", "Events", "Active", "Actions"]} rows={props.webhooks.map(w => [w.name, <a class="wrap-link" href={w.url} target="_blank">{w.url}</a>, w.events, w.active ? "Yes" : "No", <span><form class="inline" method="post" action={`/api/dashboard/webhooks/${w.id}/test`}><button class="link">Test</button></form>{del(`/api/dashboard/webhooks/${w.id}`)}</span>])} /></DashboardLayout>;
}

export function ExtractorsPage(props: { user: SessionUser; extractors: ExtractorRecord[]; runs: ExtractorRunRecord[] }) {
  return <DashboardLayout user={props.user} active="extractors">
    <h1>Extractors</h1>
    <HelpBlock id="extractors" />
    <CrudForm action="/api/dashboard/extractors" fields={["name", "prompt", "formats"]} button="Save extractor" hints={{ name: "Example: HN title summary", prompt: "Plain English instruction. Example: Extract title and one sentence summary.", formats: "Comma list: json,markdown,links" }} />
    <Table headers={["Name", "Prompt", "Formats", "Actions"]} rows={props.extractors.map(e => [e.name, e.prompt, e.formats_json, <span><form class="inline action-form" method="post" action={`/api/dashboard/extractors/${e.id}/run`}><input class="tiny-input" name="url" placeholder="https://news.ycombinator.com" /><button class="link">Run</button></form>{del(`/api/dashboard/extractors/${e.id}`)}</span>])} />
    <h2>Recent extractor runs</h2>
    <Table headers={["Extractor", "URL", "Status", "Title", "Result", "When"]} rows={props.runs.map(r => [r.extractor_name ?? r.extractor_id, <a class="wrap-link" href={r.url} target="_blank">{r.url}</a>, statusBadge(r.status), r.title ?? "-", <ResultDetails json={r.result_json} />, timeShort(r.created_at)])} />
  </DashboardLayout>;
}

export function MonitorsPage(props: { user: SessionUser; monitors: MonitorRecord[]; extractors: ExtractorRecord[]; runs: Array<Record<string, unknown>> }) {
  return <DashboardLayout user={props.user} active="monitors"><h1>Monitors</h1><HelpBlock id="monitors" /><MonitorForm extractors={props.extractors} /><Table headers={["Name", "URL", "Interval", "Next run", "Status", "Actions"]} rows={props.monitors.map(m => [m.name, <a class="wrap-link" href={m.url} target="_blank">{m.url}</a>, `${m.interval_minutes}m`, timeShort(m.next_run_at), statusBadge(m.last_status ?? "new"), <span><form class="inline" method="post" action={`/api/dashboard/monitors/${m.id}/run`}><button class="link">Run</button></form>{del(`/api/dashboard/monitors/${m.id}`)}</span>])} /><h2>Recent monitor runs</h2><Table headers={["Monitor", "Status", "Changed", "Diff", "When"]} rows={props.runs.map(r => [String(r.monitor_name), statusBadge(String(r.status)), String(r.changed) === "1" ? "Yes" : "No", <span class="diff-text">{String(r.diff_summary ?? "")}</span>, timeShort(String(r.created_at))])} /></DashboardLayout>;
}

export function SettingsPage(props: { user: SessionUser }) {
  return <DashboardLayout user={props.user} active="settings"><h1>Settings</h1><div class="card"><p>GitHub: @{props.user.github_login}</p><p>Plan: {props.user.plan}</p><p>Access: {props.user.access_status}</p><a class="button ghost" href="/auth/logout">Log out</a></div></DashboardLayout>;
}

export function DemoResult(props: { mode: string; input: string; formats: string }) {
  return <div class="card"><h2>{props.mode} result</h2><pre>{JSON.stringify({ success: true, mode: props.mode, input: props.input, formats: props.formats.split(","), data: { title: "Example page", markdown: "# Example\nClean demo output.", links: ["https://example.com/about"], json: { summary: "Mocked anonymous playground response." } } }, null, 2)}</pre></div>;
}

function feature(title: string, text: string) { return <article class="card"><h3>{title}</h3><p>{text}</p></article>; }
function endpoint(method: string, path: string, text: string) { return <div class="endpoint"><code>{method}</code><strong>{path}</strong><span>{text}</span></div>; }
function metric(labelText: string, value: string) { return <div class="metric"><span>{labelText}</span><strong>{value}</strong></div>; }
function label(value: string) { return value[0]!.toUpperCase() + value.slice(1); }
function del(action: string) { return <form class="inline" method="post" action={action}><button class="link danger">Delete</button></form>; }

function CrudForm(props: { action: string; fields: string[]; checkbox?: string; button: string; hints?: Record<string, string> }) {
  return <form class="card form" method="post" action={props.action}>{props.fields.map(f => <label>{label(f)}{f === "prompt" || f === "events" ? <textarea name={f} rows={3} placeholder={props.hints?.[f] ?? ""}></textarea> : <input name={f} placeholder={props.hints?.[f] ?? ""} />}{props.hints?.[f] ? <small>{props.hints[f]}</small> : null}</label>)}{props.checkbox ? <label class="check"><input type="checkbox" name={props.checkbox} checked /> Active</label> : null}<button class="button">{props.button}</button></form>;
}

function MonitorForm(props: { extractors: ExtractorRecord[] }) {
  return <form class="card form" method="post" action="/api/dashboard/monitors"><label>Name<input name="name" placeholder="HN front page" /></label><label>URL<input name="url" placeholder="https://news.ycombinator.com" /></label><label>Extractor<select name="extractor_id"><option value="">Raw scrape</option>{props.extractors.map(e => <option value={e.id}>{e.name}</option>)}</select></label><label>Interval minutes<input name="interval_minutes" value="1440" /></label><label class="check"><input type="checkbox" name="active" checked /> Active</label><button class="button">Save monitor</button></form>;
}

function HelpBlock(props: { id: keyof typeof featureHelp }) {
  const item = featureHelp[props.id];
  return <section class="help-card"><div><p class="eyebrow mini">What this does</p><h2>{item.title}</h2><p>{item.body}</p><p><strong>Use it for:</strong> {item.use}</p></div><a class="button ghost" href={`/docs${item.docs}`}>Read docs</a></section>;
}

function ResultDetails(props: { json: string }) {
  const parsed = parseJson(props.json);
  const title = typeof parsed.title === "string" ? parsed.title : undefined;
  const markdown = typeof parsed.markdown === "string" ? parsed.markdown : undefined;
  const jsonResult = parsed.json ?? (parsed.result ? parsed.result : undefined);
  const links = Array.isArray(parsed.links) ? parsed.links : [];
  return <details class="result-details"><summary>View result</summary><div class="result-box">{title ? <p><strong>Title:</strong> {title}</p> : null}{markdown ? <section><strong>Markdown preview</strong><pre>{markdown.slice(0, 1200)}</pre></section> : null}{jsonResult ? <section><strong>JSON</strong><pre>{JSON.stringify(jsonResult, null, 2)}</pre></section> : null}{links.length ? <section><strong>Links</strong><ul>{links.slice(0, 8).map((link: string) => <li><a class="wrap-link" href={link} target="_blank">{link}</a></li>)}</ul></section> : null}<section><strong>Raw</strong><pre>{prettyJson(props.json)}</pre></section></div></details>;
}

function parseJson(value: string): any { try { return JSON.parse(value); } catch { return {}; } }
function prettyJson(value: string): string { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function statusBadge(value: string) { return <span class={`status ${value}`}>{value}</span>; }
function timeShort(value: string) { try { return new Date(value).toLocaleString(); } catch { return value; } }

function Table(props: { headers: string[]; rows: any[][] }) {
  return <div class="table-wrap"><table><thead><tr>{props.headers.map(h => <th>{h}</th>)}</tr></thead><tbody>{props.rows.length ? props.rows.map(row => <tr>{row.map(cell => <td>{cell}</td>)}</tr>) : <tr><td colSpan={props.headers.length}>No records yet.</td></tr>}</tbody></table></div>;
}

const css = `
:root{--surface:#fff7f4;--card:#ffffff;--ink:#3f3f3f;--muted:#735a50;--line:#e2e2e2;--brand:#de0606;--brand-strong:#ac0202;--blue:#007fd7;--brown:#783714;--brown-dark:#4d2815;--pink:#f9b4a5;--green:#296531;--shadow:0 14px 40px rgba(77,40,21,.12);--radius:24px} @media(prefers-color-scheme:dark){:root{--surface:#24130d;--card:#351c12;--ink:#fff7f4;--muted:#f9b4a5;--line:#783714;--brand:#ff3737;--brand-strong:#f9b4a5;--blue:#4ab4ff;--brown:#f9b4a5;--brown-dark:#fff;--pink:#4d2815;--green:#5fc06b}}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,rgba(222,6,6,.12),transparent 32rem),linear-gradient(135deg,var(--surface),#fff);color:var(--ink);font:16px/1.6 Ubuntu,ui-rounded,system-ui,sans-serif;overflow-x:hidden}a{color:inherit}.topbar{max-width:1152px;margin:auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;gap:10px;align-items:center;font-weight:900;text-decoration:none}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--blue));color:#fff;box-shadow:6px 6px 0 var(--brown-dark)}nav{display:flex;gap:16px;align-items:center}nav a{text-decoration:none;font-weight:700;color:var(--brown-dark)}main{max-width:1152px;margin:auto;padding:56px 24px}.narrow{max-width:820px}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;min-height:70vh}.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--brand)}h1{font-size:clamp(42px,7vw,78px);line-height:.95;margin:0 0 24px;color:var(--brown-dark)}h2{font-size:30px;line-height:1.15}h3{margin-top:0}.lead{font-size:20px;color:var(--muted);max-width:62ch}.actions,.row-form{display:flex;gap:12px;flex-wrap:wrap}.button,button.button{border:2px solid transparent;border-radius:999px;background:linear-gradient(135deg,var(--brand),var(--brand-strong)) padding-box,linear-gradient(135deg,#fff,var(--brown-dark)) border-box;color:#fff;padding:12px 18px;font-weight:900;text-decoration:none;box-shadow:6px 6px 0 var(--brown-dark);cursor:pointer}.button.small{padding:8px 14px}.button.ghost{background:var(--card);color:var(--brown-dark);border-color:var(--line);box-shadow:none}.comic-panel,.card,.metric,.table-wrap{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}.comic-panel{padding:18px;transform:rotate(-1deg);border:3px solid var(--brown-dark)}.urlbar,.result-chip{background:var(--pink);border-radius:999px;padding:8px 12px;font-weight:900;color:var(--brown-dark)}pre{overflow:auto;background:rgba(0,0,0,.04);border-radius:16px;padding:18px}.grid{display:grid;gap:18px}.two{grid-template-columns:repeat(2,1fr)}.three{grid-template-columns:repeat(3,1fr)}.four{grid-template-columns:repeat(4,1fr)}.card{padding:22px}.section-card{margin-top:32px}.endpoint-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.endpoint{display:grid;grid-template-columns:72px 1fr;gap:4px 12px;padding:14px;border:1px solid var(--line);border-radius:18px}.endpoint span{grid-column:2;color:var(--muted)}code{color:var(--blue);font-weight:900}.form{display:grid;gap:14px;margin-bottom:20px}label{display:grid;gap:6px;font-weight:800}input,textarea,select{width:100%;border:1px solid var(--line);border-radius:14px;background:#fff;color:#222;padding:12px;font:inherit}.notice{background:var(--pink);color:var(--brown-dark);padding:14px 18px;border-radius:18px;border:1px solid var(--brown);margin:16px 0}.dash{display:grid;grid-template-columns:230px minmax(0,1fr);gap:24px;max-width:1280px}.dash-main{min-width:0;overflow:hidden}.sidebar{position:sticky;top:12px;align-self:start;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow)}.sidebar a{display:block;padding:10px 12px;border-radius:12px;text-decoration:none;font-weight:800;color:var(--muted)}.sidebar a.active,.sidebar a:hover{background:var(--pink);color:var(--brown-dark)}.profile{display:flex;align-items:center;gap:10px;padding:8px 10px 16px;font-weight:900}.profile img{width:32px;height:32px;border-radius:50%}.dash-main h1{font-size:42px}.metric{padding:18px}.metric span{display:block;color:var(--muted);font-weight:800}.metric strong{font-size:30px;color:var(--brand)}table{width:100%;border-collapse:collapse;table-layout:auto}.table-wrap{overflow:auto;max-width:100%}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--line);vertical-align:top;max-width:320px;overflow-wrap:anywhere}th{color:var(--brown-dark)}.link{border:0;background:transparent;color:var(--blue);font-weight:900;cursor:pointer}.danger{color:var(--brand)}.inline{display:inline}.action-form{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}.tiny-input{max-width:240px;padding:8px 10px;margin-right:6px}.help-card{display:flex;justify-content:space-between;gap:18px;align-items:center;background:var(--card);border:2px solid var(--brown);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px;margin:0 0 18px}.help-card h2{margin:0 0 8px}.mini{font-size:12px;margin:0 0 6px}.wrap-link{overflow-wrap:anywhere}.status{display:inline-flex;border-radius:999px;padding:3px 9px;font-weight:900;background:var(--pink);color:var(--brown-dark)}.status.completed{background:#dcfce7;color:var(--green)}.status.failed{background:#fee2e2;color:var(--brand)}.status.processing,.status.new{background:#dbeafe;color:var(--blue)}.result-details summary{cursor:pointer;font-weight:900;color:var(--blue)}.result-box{margin-top:12px;display:grid;gap:12px;min-width:360px;max-width:min(760px,75vw)}.result-box pre{max-height:280px;white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.06);border:1px solid var(--line)}.diff-text{display:block;max-width:520px}.form small{color:var(--muted);font-weight:600}.check{display:flex;gap:8px;align-items:center}.check input{width:auto}@media(max-width:820px){.hero,.two,.three,.four,.endpoint-grid,.dash{grid-template-columns:1fr}.help-card{display:block}.result-box{min-width:0;max-width:100%}.topbar{align-items:flex-start;gap:12px}.topbar,nav{flex-wrap:wrap}.sidebar{position:static}.dash-main h1{font-size:34px}}
`;
