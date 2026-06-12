export function explorerHTML(baseUrl: string, docsUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fireflare — API Explorer</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0f0f16;--surface:#13131f;--surface2:#16161f;
  --text:#e2e8f0;--muted:#64748b;--border:#1e1e2c;
  --primary:#f97316;--primary-dim:rgba(249,115,22,0.1);
  --green:#a6e3a1;--blue:#89b4fa;--purple:#cba6f7;
  --yellow:#f9e2af;--red:#f38ba8;--teal:#89dceb;
}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.6;min-height:100vh}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}

header{display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:50px;background:var(--surface);border-bottom:1px solid var(--border)}
.logo{font-size:.95rem;font-weight:700;color:var(--primary);letter-spacing:-.02em}
.logo em{font-style:normal;color:var(--muted);font-weight:400;font-size:.8rem;margin-left:.4rem}
nav{display:flex;gap:1.25rem}
nav a{color:var(--muted);font-size:.8rem;transition:color .15s}
nav a:hover{color:var(--text)}

main{max-width:960px;margin:0 auto;padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;align-items:start}
@media(max-width:680px){main{grid-template-columns:1fr}}

.panel{background:var(--surface);border-radius:10px;overflow:hidden}
.panel-head{padding:.65rem 1rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.panel-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.panel-body{padding:1rem}

select,input[type=text],input[type=number],textarea{
  width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;
  padding:.45rem .65rem;color:var(--text);font-size:.8rem;font-family:inherit;outline:none;
  transition:border-color .15s;appearance:none;-webkit-appearance:none
}
select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center;padding-right:1.8rem;cursor:pointer}
select:focus,input:focus,textarea:focus{border-color:var(--primary)}
textarea{resize:vertical;min-height:72px}

.field{margin-bottom:.8rem}
.field:last-child{margin-bottom:0}
.field>label{display:block;font-size:.72rem;color:var(--muted);margin-bottom:.3rem}
.field-note{font-size:.68rem;color:var(--muted);opacity:.7;margin-bottom:.3rem;display:block}

.fmt-row{display:flex;flex-wrap:wrap;gap:.35rem}
.fmt-btn{padding:.2rem .5rem;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:.72rem;cursor:pointer;user-select:none;transition:all .12s;font-family:"SFMono-Regular",monospace}
.fmt-btn.on{background:var(--primary-dim);border-color:var(--primary);color:var(--primary)}

.cb-row{display:flex;align-items:center;gap:.45rem;cursor:pointer}
.cb-row input{width:auto;accent-color:var(--primary);cursor:pointer}
.cb-row span{font-size:.78rem;color:var(--muted)}

.send-btn{width:100%;margin-top:.9rem;padding:.55rem 1rem;background:var(--primary);color:#0f0f16;border:none;border-radius:7px;font-size:.85rem;font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit}
.send-btn:hover{background:#fb923c}
.send-btn:disabled{background:#3a2010;color:#6a4020;cursor:not-allowed}

.copy-btn{font-size:.7rem;padding:.18rem .5rem;background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--muted);cursor:pointer;font-family:inherit;transition:all .12s}
.copy-btn:hover{border-color:var(--primary);color:var(--primary)}
.copy-btn.copied{border-color:var(--green);color:var(--green)}

pre{font-family:"SFMono-Regular","Consolas","Menlo",monospace;font-size:.75rem;line-height:1.65;white-space:pre-wrap;word-break:break-all}
.curl-body,.resp-body{padding:.85rem 1rem;overflow-x:auto}
.resp-body{max-height:420px;overflow-y:auto}

.status-badge{font-size:.7rem;padding:.15rem .5rem;border-radius:4px;font-family:monospace;font-weight:700}
.s2{background:rgba(166,227,161,.12);color:var(--green)}
.s4,.s5{background:rgba(243,139,168,.12);color:var(--red)}

.empty{color:var(--muted);font-size:.78rem;text-align:center;padding:1.5rem 0;display:block}

@keyframes spin{to{transform:rotate(360deg)}}
.spin{display:inline-block;width:11px;height:11px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:.35rem}

.t-cmd{color:var(--primary);font-weight:700}
.t-flag{color:var(--purple)}
.t-url{color:var(--blue)}
.t-str{color:var(--green)}
.t-key{color:var(--teal)}
.t-num{color:var(--yellow)}
.t-bool{color:var(--teal)}
.t-null{color:var(--red)}
.t-muted{color:var(--muted)}
.t-method{color:var(--yellow)}
</style>
</head>
<body>
<header>
  <div class="logo">Fireflare <em>API Explorer</em></div>
  <nav>
    <a href="${docsUrl}" target="_blank">Docs</a>
    <a href="/openapi.json" target="_blank">OpenAPI</a>
  </nav>
</header>

<main>
  <div>
    <div class="panel">
      <div class="panel-head"><span class="panel-label">Request</span></div>
      <div class="panel-body">
        <div class="field">
          <label>Endpoint</label>
          <select id="ep">
            <option value="scrape">POST /scrape — Scrape a URL</option>
            <option value="extract">POST /extract — Extract structured content</option>
            <option value="search">POST /search — Search the web</option>
            <option value="map">POST /map — Map site links</option>
            <option value="crawl">POST /crawl — Async site crawl</option>
            <option value="batch">POST /batch/scrape — Batch scrape URLs</option>
          </select>
        </div>
        <div id="fields"></div>
        <button class="send-btn" id="send">Send Request</button>
      </div>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:1.25rem">
    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">curl</span>
        <button class="copy-btn" id="copy">Copy</button>
      </div>
      <div class="curl-body"><pre id="curl"></pre></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">Response</span>
        <span id="status"></span>
      </div>
      <div class="resp-body"><pre id="resp"><span class="empty">Send a request to see the response.</span></pre></div>
    </div>
  </div>
</main>

<script>
const BASE = '${baseUrl}';

const EPS = {
  scrape: {
    path: '/scrape',
    fields: [
      {id:'url',label:'URL',type:'text',ph:'https://example.com',req:true},
      {id:'formats',label:'Output formats',type:'fmts',opts:['markdown','html','rawHtml','json','links','screenshot']},
      {id:'jsonPrompt',label:'JSON prompt',type:'text',ph:'Extract title, author, and body as JSON',dep:'json'},
      {id:'onlyMainContent',label:'Only main content',type:'cb'},
      {id:'waitFor',label:'Wait for (ms)',type:'num',ph:'0'},
    ]
  },
  extract: {
    path: '/extract',
    fields: [
      {id:'urls',label:'URLs (one per line)',type:'ta',ph:'https://example.com\\nhttps://example.com/docs',req:true},
      {id:'prompt',label:'Extraction prompt',type:'text',ph:'Extract key headings and section links'},
      {id:'formats',label:'Output formats',type:'fmts',opts:['markdown','html','rawHtml','json','links']},
      {id:'jsonPrompt',label:'JSON prompt',type:'text',ph:'Return as {title, links}',dep:'json'},
      {id:'showSources',label:'Show sources',type:'cb'},
    ]
  },
  search: {
    path: '/search',
    fields: [
      {id:'query',label:'Query',type:'text',ph:'cloudflare workers web scraping',req:true},
      {id:'limit',label:'Result limit',type:'num',ph:'5'},
      {id:'formats',label:'Formats applied to scraped pages (scrapeOptions)',type:'fmts',opts:['markdown','json','html','rawHtml','links'],note:'Formats are applied when Fireflare scrapes search result pages.'},
      {id:'jsonPrompt',label:'JSON prompt',type:'text',ph:'Extract title and main content',dep:'json'},
    ]
  },
  map: {
    path: '/map',
    fields: [
      {id:'url',label:'URL',type:'text',ph:'https://example.com',req:true},
      {id:'limit',label:'Link limit',type:'num',ph:'250'},
      {id:'includeSubdomains',label:'Include subdomains',type:'cb'},
    ]
  },
  crawl: {
    path: '/crawl',
    fields: [
      {id:'url',label:'URL',type:'text',ph:'https://example.com',req:true},
      {id:'maxDepth',label:'Max depth (0–3)',type:'num',ph:'1'},
      {id:'limit',label:'Max pages (1–25)',type:'num',ph:'5'},
      {id:'formats',label:'Formats (scrapeOptions)',type:'fmts',opts:['markdown','html','rawHtml','json','links']},
      {id:'jsonPrompt',label:'JSON prompt',type:'text',ph:'Extract the page title and summary',dep:'json'},
      {id:'async',label:'Async (return job ID immediately)',type:'cb'},
    ]
  },
  batch: {
    path: '/batch/scrape',
    fields: [
      {id:'urls',label:'URLs (one per line)',type:'ta',ph:'https://example.com\\nhttps://example.com/docs',req:true},
      {id:'formats',label:'Output formats',type:'fmts',opts:['markdown','html','rawHtml','json','links','screenshot']},
      {id:'jsonPrompt',label:'JSON prompt',type:'text',ph:'Extract the article title and body',dep:'json'},
      {id:'maxConcurrency',label:'Max concurrency (1–25)',type:'num',ph:'5'},
    ]
  },
};

let ep = 'scrape';
let fmts = new Set(['markdown']);

function renderFields(key) {
  ep = key;
  fmts = new Set(['markdown']);
  const cfg = EPS[key];
  const c = document.getElementById('fields');
  c.innerHTML = '';
  for (const f of cfg.fields) {
    const w = document.createElement('div');
    w.className = 'field';
    w.dataset.fid = f.id;
    if (f.dep) { w.dataset.dep = f.dep; w.style.display = fmts.has(f.dep) ? '' : 'none'; }

    const lbl = document.createElement('label');
    lbl.textContent = f.label + (f.req ? ' *' : '');
    w.appendChild(lbl);

    if (f.note) {
      const n = document.createElement('span');
      n.className = 'field-note';
      n.textContent = f.note;
      w.appendChild(n);
    }

    if (f.type === 'fmts') {
      const row = document.createElement('div');
      row.className = 'fmt-row';
      for (const fmt of f.opts) {
        const b = document.createElement('button');
        b.className = 'fmt-btn' + (fmts.has(fmt) ? ' on' : '');
        b.textContent = fmt;
        b.type = 'button';
        b.dataset.fmt = fmt;
        b.addEventListener('click', () => {
          if (fmts.has(fmt)) { fmts.delete(fmt); b.classList.remove('on'); }
          else { fmts.add(fmt); b.classList.add('on'); }
          syncDeps(); buildCurl();
        });
        row.appendChild(b);
      }
      w.appendChild(row);
    } else if (f.type === 'cb') {
      const row = document.createElement('label');
      row.className = 'cb-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'f-' + f.id;
      cb.addEventListener('change', buildCurl);
      const sp = document.createElement('span');
      sp.textContent = 'enabled';
      row.appendChild(cb); row.appendChild(sp);
      w.appendChild(row);
    } else if (f.type === 'ta') {
      const ta = document.createElement('textarea');
      ta.id = 'f-' + f.id;
      ta.placeholder = f.ph || '';
      ta.addEventListener('input', buildCurl);
      w.appendChild(ta);
    } else {
      const inp = document.createElement('input');
      inp.type = f.type === 'num' ? 'number' : 'text';
      inp.id = 'f-' + f.id;
      inp.placeholder = f.ph || '';
      inp.addEventListener('input', buildCurl);
      w.appendChild(inp);
    }
    c.appendChild(w);
  }
  buildCurl();
}

function syncDeps() {
  document.querySelectorAll('[data-dep]').forEach(el => {
    el.style.display = fmts.has(el.dataset.dep) ? '' : 'none';
  });
}

function getBody() {
  const cfg = EPS[ep];
  const b = {};
  const fmtList = [...fmts];
  const usesScrapeOpts = ep === 'search' || ep === 'crawl';

  for (const f of cfg.fields) {
    if (f.type === 'fmts') continue;
    if (f.type === 'cb') {
      const el = document.getElementById('f-' + f.id);
      if (el && el.checked) b[f.id] = true;
      continue;
    }
    const el = document.getElementById('f-' + f.id);
    if (!el) continue;
    const v = el.value.trim();
    if (!v) continue;
    if (f.id === 'urls') {
      const lines = v.split('\\n').map(l => l.trim()).filter(Boolean);
      if (lines.length) b.urls = lines;
    } else if (f.type === 'num') {
      const n = parseFloat(v);
      if (!isNaN(n)) b[f.id] = n;
    } else {
      b[f.id] = v;
    }
  }

  if (fmtList.length) {
    if (usesScrapeOpts) {
      b.scrapeOptions = b.scrapeOptions || {};
      b.scrapeOptions.formats = fmtList;
      if (b.jsonPrompt) { b.scrapeOptions.jsonPrompt = b.jsonPrompt; delete b.jsonPrompt; }
    } else {
      b.formats = fmtList;
    }
  }
  return b;
}

function hlJson(s) {
  return s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(?:[^"\\\\]|\\\\.)*")(\s*:)|("(?:[^"\\\\]|\\\\.)*")|(\\btrue\\b|\\bfalse\\b)|(\\bnull\\b)|(-?\\d+(?:\\.\\d+)?)/g,
      (_,k,colon,sv,bool,nul,num) => {
        if (k && colon) return '<span class="t-key">'+k+'</span>'+colon;
        if (sv) return '<span class="t-str">'+sv+'</span>';
        if (bool) return '<span class="t-bool">'+bool+'</span>';
        if (nul) return '<span class="t-null">'+nul+'</span>';
        if (num) return '<span class="t-num">'+num+'</span>';
        return _;
      });
}

function buildCurl() {
  const cfg = EPS[ep];
  const url = BASE + cfg.path;
  const body = JSON.stringify(getBody(), null, 2);
  const hl = hlJson(body);
  const out = [
    '<span class="t-cmd">curl</span> <span class="t-flag">-X</span> <span class="t-method">POST</span> <span class="t-url">' + url + '</span> <span class="t-muted">\\\\</span>',
    '  <span class="t-flag">-H</span> <span class="t-str">\'Content-Type: application/json\'</span> <span class="t-muted">\\\\</span>',
    "  <span class='t-flag'>-d</span> <span class='t-str'>'</span>" + hl + "<span class='t-str'>'</span>",
  ];
  document.getElementById('curl').innerHTML = out.join('\\n');
}

document.getElementById('copy').addEventListener('click', async () => {
  const cfg = EPS[ep];
  const url = BASE + cfg.path;
  const body = JSON.stringify(getBody(), null, 2);
  const text = "curl -X POST " + url + " \\\\\\n  -H 'Content-Type: application/json' \\\\\\n  -d '" + body.replace(/'/g, "\\'") + "'";
  await navigator.clipboard.writeText(text).catch(() => {});
  const btn = document.getElementById('copy');
  btn.textContent = 'Copied!'; btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
});

document.getElementById('send').addEventListener('click', async () => {
  const cfg = EPS[ep];
  const url = BASE + cfg.path;
  const body = getBody();
  const btn = document.getElementById('send');
  const respEl = document.getElementById('resp');
  const statusEl = document.getElementById('status');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Sending…';
  respEl.innerHTML = '';
  statusEl.innerHTML = '';
  try {
    const res = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const cls = res.status >= 500 ? 's5' : res.status >= 400 ? 's4' : 's2';
    statusEl.innerHTML = '<span class="status-badge ' + cls + '">' + res.status + '</span>';
    const txt = await res.text();
    let pretty = txt;
    try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch {}
    respEl.innerHTML = hlJson(pretty);
  } catch(err) {
    statusEl.innerHTML = '<span class="status-badge s4">Error</span>';
    respEl.innerHTML = '<span style="color:var(--red)">' + err.message + '</span>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Request';
  }
});

document.getElementById('ep').addEventListener('change', e => renderFields(e.target.value));
renderFields('scrape');
</script>
</body>
</html>`;
}
