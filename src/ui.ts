export function explorerHTML(baseUrl: string, docsUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spindle Playground</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f7f5f1;--card:#ffffff;--border:#e8e5de;--border-2:#d9d5cc;
  --text:#1c1b18;--dim:#8c887e;--dim-2:#b3afa5;
  --accent:#f54e00;--accent-soft:#fff1ea;--accent-border:#ffd2bd;
  --green:#0d9b54;--green-soft:#e8f7ef;--red:#dc2626;--red-soft:#fdecec;
  --amber:#d97706;--amber-soft:#fdf3e3;
  --code-bg:#fcfbf9;--mono:"SFMono-Regular","Consolas","Menlo",monospace;
}
body{
  background-color:var(--bg);
  background-image:radial-gradient(circle,#dedacf 1px,transparent 1px);
  background-size:24px 24px;
  color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:14px;line-height:1.55;min-height:100vh;
}
button{font-family:inherit;cursor:pointer}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
::placeholder{color:var(--dim-2)}

/* ============ HEADER ============ */
header{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.5rem;max-width:1060px;margin:0 auto}
.brand{font-weight:800;font-size:1rem;letter-spacing:-.02em;display:flex;align-items:center;gap:.45rem;color:var(--text)}
.brand .flame{color:var(--accent)}
.hlinks{display:flex;gap:.35rem}
.hlinks a{color:var(--dim);font-size:.8rem;padding:.35rem .7rem;border-radius:7px;text-decoration:none}
.hlinks a:hover{color:var(--text);background:rgba(0,0,0,.04);text-decoration:none}

/* ============ HERO CARD ============ */
.hero{max-width:760px;margin:1.2rem auto 0;padding:0 1rem}
.mode-pills{display:flex;justify-content:center;gap:.25rem;margin-bottom:.8rem;flex-wrap:wrap}
.mode-pill{display:flex;align-items:center;gap:.35rem;padding:.38rem .85rem;border-radius:100px;border:1px solid transparent;background:transparent;color:var(--dim);font-size:.8rem;font-weight:600;transition:all .13s}
.mode-pill:hover{color:var(--text)}
.mode-pill.active{background:var(--card);border-color:var(--border);color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.05)}
.mode-pill.active .pill-dot{background:var(--accent)}
.pill-dot{width:6px;height:6px;border-radius:50%;background:var(--dim-2);transition:background .13s}

.input-card{background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 1px 3px rgba(28,27,24,.06),0 8px 24px rgba(28,27,24,.05);overflow:visible;position:relative}
.input-row{display:flex;align-items:center;padding:.35rem .5rem .35rem 1rem;border-bottom:1px solid var(--border)}
.proto{color:var(--dim-2);font-size:.85rem;font-family:var(--mono);user-select:none;margin-right:.15rem}
.main-input{flex:1;border:none;outline:none;background:transparent;font-size:.92rem;padding:.65rem .4rem;color:var(--text);font-family:inherit}
textarea.main-input{resize:none;min-height:74px;line-height:1.5;padding-top:.8rem;font-family:var(--mono);font-size:.82rem}

.toolbar{display:flex;align-items:center;gap:.4rem;padding:.55rem .6rem}
.tool-btn{display:flex;align-items:center;gap:.4rem;padding:.4rem .65rem;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--dim);font-size:.76rem;font-weight:600;transition:all .12s;position:relative}
.tool-btn:hover{border-color:var(--border-2);color:var(--text)}
.tool-btn.lit{border-color:var(--accent-border);background:var(--accent-soft);color:var(--accent)}
.tool-btn .badge-num{background:var(--accent);color:#fff;font-size:.6rem;font-weight:700;border-radius:100px;padding:0 .32rem;line-height:1.4}
.spacer{flex:1}
.run-btn{display:flex;align-items:center;gap:.45rem;padding:.5rem 1.1rem;border-radius:9px;border:none;background:var(--accent);color:#fff;font-size:.82rem;font-weight:700;transition:filter .12s,opacity .12s}
.run-btn:hover{filter:brightness(1.08)}
.run-btn:disabled{opacity:.55;cursor:not-allowed}

/* ============ POPOVERS ============ */
.popover{position:absolute;top:calc(100% + 8px);left:.6rem;z-index:50;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 4px 12px rgba(28,27,24,.08),0 16px 40px rgba(28,27,24,.12);width:340px;max-width:92vw;display:none}
.popover.open{display:block}
.popover.fmt-pop{width:430px}
.pop-head{display:flex;align-items:center;justify-content:space-between;padding:.7rem 1rem;border-bottom:1px solid var(--border)}
.pop-title{font-size:.72rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.05em}
.pop-x{border:none;background:none;color:var(--dim-2);font-size:1rem;line-height:1;padding:.15rem .3rem;border-radius:5px}
.pop-x:hover{color:var(--text);background:rgba(0,0,0,.05)}
.pop-body{padding:.85rem 1rem;max-height:380px;overflow-y:auto}

.opt-row{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.45rem 0}
.opt-label{font-size:.8rem;color:var(--text);display:flex;align-items:center;gap:.45rem}
.opt-hint{font-size:.68rem;color:var(--dim-2)}
.opt-row input[type=text],.opt-row input[type=number],.opt-row select{width:130px;border:1px solid var(--border);border-radius:7px;padding:.35rem .55rem;font-size:.78rem;outline:none;color:var(--text);background:var(--card)}
.opt-row input:focus,.opt-row select:focus{border-color:var(--accent)}
.opt-row input.wide{width:100%}
.opt-row.stack{flex-direction:column;align-items:stretch;gap:.3rem}
.opt-sep{border-top:1px solid var(--border);margin:.5rem 0;padding-top:.5rem;font-size:.68rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.05em}

/* toggle switch */
.tgl{position:relative;width:34px;height:19px;flex-shrink:0}
.tgl input{opacity:0;width:0;height:0}
.tgl .knob{position:absolute;inset:0;background:#dcd8cf;border-radius:100px;transition:background .15s;cursor:pointer}
.tgl .knob::after{content:"";position:absolute;width:15px;height:15px;border-radius:50%;background:#fff;top:2px;left:2px;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.tgl input:checked + .knob{background:var(--accent)}
.tgl input:checked + .knob::after{left:17px}

/* format cards */
.fmt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem}
.fmt-card{position:relative;border:1px solid var(--border);border-radius:10px;padding:.55rem;cursor:pointer;transition:border-color .12s,background .12s;background:var(--card)}
.fmt-card:hover{border-color:var(--border-2)}
.fmt-card.on{border-color:var(--accent);background:var(--accent-soft)}
.fmt-card.on::after{content:"✓";position:absolute;top:-7px;right:-7px;width:18px;height:18px;background:var(--accent);color:#fff;border-radius:50%;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center}
.fmt-thumb{height:52px;border:1px solid var(--border);border-radius:6px;background:var(--code-bg);margin-bottom:.45rem;padding:.45rem .5rem;overflow:hidden;display:flex;flex-direction:column;gap:4px}
.fmt-line{height:4px;border-radius:2px;background:#e3dfd6}
.fmt-line.dark{background:#c9c4b8}
.fmt-thumb .mono-mini{font-family:var(--mono);font-size:.55rem;color:var(--dim);line-height:1.45}
.fmt-name{font-size:.74rem;font-weight:600;color:var(--text)}

/* ============ WORKSPACE ============ */
.results-wrap{max-width:760px;margin:1.4rem auto 4rem;padding:0 1rem}
.status-line{display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem;min-height:28px}
.status-chip{display:inline-flex;align-items:center;gap:.4rem;font-size:.74rem;font-weight:600;padding:.3rem .75rem;border-radius:100px;border:1px solid var(--border);background:var(--card)}
.status-chip .dot{width:7px;height:7px;border-radius:50%}
.status-chip.ok .dot{background:var(--green)}
.status-chip.ok{color:var(--green);border-color:#bce5cd;background:var(--green-soft)}
.status-chip.err .dot{background:var(--red)}
.status-chip.err{color:var(--red);border-color:#f5c2c2;background:var(--red-soft)}
.status-chip.run .dot{background:var(--amber);animation:pulse 1s infinite}
.status-chip.run{color:var(--amber);border-color:#f3ddb5;background:var(--amber-soft)}
@keyframes pulse{50%{opacity:.35}}

.res-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(28,27,24,.05)}
.res-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;border-bottom:1px solid var(--border);gap:.8rem;flex-wrap:wrap}
.res-title{font-size:.85rem;font-weight:700}
.res-title .count{color:var(--dim);font-weight:500}
.res-actions{display:flex;gap:.4rem}
.mini-btn{display:flex;align-items:center;gap:.3rem;font-size:.72rem;font-weight:600;padding:.3rem .65rem;border-radius:7px;border:1px solid var(--border);background:var(--card);color:var(--dim);transition:all .12s}
.mini-btn:hover{color:var(--text);border-color:var(--border-2)}
.mini-btn.lit{color:var(--accent);border-color:var(--accent-border);background:var(--accent-soft)}

/* search result rows */
.sr-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--border)}
.sr-row:last-child{border-bottom:none}
.sr-main{min-width:0;flex:1}
.sr-title{font-size:.85rem;font-weight:600;color:var(--text);display:flex;gap:.45rem;align-items:baseline}
.sr-pos{color:var(--accent);font-weight:700;font-size:.78rem;flex-shrink:0}
.sr-url{font-size:.72rem;color:var(--dim);font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:.1rem 0 .25rem}
.sr-desc{font-size:.78rem;color:var(--dim);line-height:1.5}
.sr-md{margin-top:.5rem;font-family:var(--mono);font-size:.7rem;color:var(--dim);background:var(--code-bg);border:1px solid var(--border);border-radius:7px;padding:.5rem .6rem;max-height:120px;overflow:hidden;white-space:pre-wrap;word-break:break-word;position:relative}

/* link rows (map) */
.link-row{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.55rem 1.1rem;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:.76rem}
.link-row:last-child{border-bottom:none}
.link-row a{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.link-row a:hover{color:var(--accent)}

/* doc tabs (scrape result) */
.doc-tabs{display:flex;gap:.2rem;padding:.5rem 1.1rem 0;border-bottom:1px solid var(--border)}
.doc-tab{padding:.45rem .8rem;font-size:.76rem;font-weight:600;color:var(--dim);border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px}
.doc-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.doc-body{padding:1rem 1.1rem;max-height:480px;overflow:auto}
.doc-body pre{font-family:var(--mono);font-size:.76rem;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:#33312c}
.doc-body img{max-width:100%;border:1px solid var(--border);border-radius:8px}
.empty-note{color:var(--dim);font-size:.8rem;text-align:center;padding:2.2rem 1rem}

/* crawl pages */
.page-item{border-bottom:1px solid var(--border)}
.page-item:last-child{border-bottom:none}
.page-head{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.7rem 1.1rem;cursor:pointer}
.page-head:hover{background:var(--code-bg)}
.page-url{font-family:var(--mono);font-size:.75rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.page-body{display:none;padding:0 1.1rem 1rem}
.page-item.open .page-body{display:block}
.page-body pre{font-family:var(--mono);font-size:.72rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#55524a;background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.7rem .8rem;max-height:260px;overflow:auto}
.chev{color:var(--dim-2);transition:transform .15s;flex-shrink:0}
.page-item.open .chev{transform:rotate(90deg)}

.progress-bar{height:5px;background:var(--border);border-radius:100px;overflow:hidden;margin:.6rem 1.1rem}
.progress-fill{height:100%;background:var(--accent);border-radius:100px;transition:width .4s ease;width:0}

/* ============ CODE DRAWER ============ */
.drawer{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:95vw;background:var(--card);border-left:1px solid var(--border);box-shadow:-12px 0 40px rgba(28,27,24,.1);transform:translateX(102%);transition:transform .22s ease;z-index:100;display:flex;flex-direction:column}
.drawer.open{transform:translateX(0)}
.drawer-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;border-bottom:1px solid var(--border)}
.drawer-title{font-size:.85rem;font-weight:700}
.lang-tabs{display:flex;gap:.25rem;padding:.7rem 1.1rem 0}
.lang-tab{padding:.35rem .8rem;font-size:.74rem;font-weight:600;border-radius:7px;border:1px solid transparent;background:none;color:var(--dim)}
.lang-tab.active{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent)}
.drawer-code{margin:.7rem 1.1rem;border:1px solid var(--border);border-radius:10px;background:var(--code-bg);overflow:auto;max-height:42vh;position:relative}
.drawer-code pre{padding:.85rem 1rem;font-family:var(--mono);font-size:.74rem;line-height:1.7;white-space:pre-wrap;word-break:break-all}
.copy-float{position:sticky;top:.5rem;float:right;margin:.5rem;font-size:.68rem;padding:.25rem .6rem;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--dim);font-weight:600}
.copy-float:hover{color:var(--accent);border-color:var(--accent-border)}
.copy-float.ok{color:var(--green);border-color:#bce5cd}
.drawer-resp-head{display:flex;align-items:center;gap:.5rem;padding:.4rem 1.1rem 0}
.st-pill{display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;font-weight:700;font-family:var(--mono);padding:.2rem .6rem;border-radius:100px;border:1px solid var(--border);color:var(--dim)}
.st-pill .dot{width:6px;height:6px;border-radius:50%;background:var(--dim-2)}
.st-pill.on-2xx{color:var(--green);border-color:#bce5cd;background:var(--green-soft)}
.st-pill.on-2xx .dot{background:var(--green)}
.st-pill.on-err{color:var(--red);border-color:#f5c2c2;background:var(--red-soft)}
.st-pill.on-err .dot{background:var(--red)}
.drawer-resp{flex:1;margin:.6rem 1.1rem 1.1rem;border:1px solid var(--border);border-radius:10px;background:var(--code-bg);overflow:auto;min-height:80px}
.drawer-resp pre{padding:.85rem 1rem;font-family:var(--mono);font-size:.72rem;line-height:1.65;white-space:pre-wrap;word-break:break-all}

/* syntax tokens (light theme) */
.tok-k{color:#7c3aed;font-weight:600}
.tok-s{color:#f54e00}
.tok-key{color:#1c1b18;font-weight:600}
.tok-n{color:#0d9b54}
.tok-b{color:#2563eb}
.tok-c{color:#b3afa5}
.tok-u{color:#2563eb}
.tok-m{color:#d97706;font-weight:700}

@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .55s linear infinite}
.spinner.dark{border-color:var(--border);border-top-color:var(--accent)}

@media(max-width:640px){
  .fmt-grid{grid-template-columns:repeat(2,1fr)}
  .popover.fmt-pop{width:320px}
}
</style>
</head>
<body>

<header>
  <div class="brand"><span class="flame">▲</span> Spindle <span style="color:var(--dim-2);font-weight:500;font-size:.78rem">Playground</span></div>
  <div class="hlinks">
    <a href="${docsUrl}" target="_blank">Docs</a>
    <a href="/openapi.json" target="_blank">OpenAPI</a>
  </div>
</header>

<div class="hero">
  <div class="mode-pills" id="pills"></div>

  <div class="input-card">
    <div class="input-row" id="input-row"></div>
    <div class="toolbar">
      <button class="tool-btn" id="opt-btn" title="Options">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/><circle cx="17" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
        Options
      </button>
      <button class="tool-btn" id="fmt-btn" title="Formats">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <span id="fmt-label">Format: markdown</span>
        <span class="badge-num" id="fmt-count" style="display:none"></span>
      </button>
      <div class="spacer"></div>
      <button class="tool-btn" id="code-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Get code
      </button>
      <button class="run-btn" id="run-btn"><span id="run-label">Run</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>

      <div class="popover" id="opt-pop">
        <div class="pop-head"><span class="pop-title">Options</span><button class="pop-x" data-close="opt-pop">✕</button></div>
        <div class="pop-body" id="opt-body"></div>
      </div>
      <div class="popover fmt-pop" id="fmt-pop">
        <div class="pop-head"><span class="pop-title">Format</span><button class="pop-x" data-close="fmt-pop">✕</button></div>
        <div class="pop-body">
          <div class="fmt-grid" id="fmt-grid"></div>
          <div id="json-prompt-wrap" style="display:none;margin-top:.8rem">
            <div style="font-size:.72rem;font-weight:600;color:var(--dim);margin-bottom:.3rem">JSON extraction prompt</div>
            <input type="text" id="json-prompt" class="wide" placeholder="Extract the title, author and summary" style="width:100%;border:1px solid var(--border);border-radius:7px;padding:.45rem .6rem;font-size:.78rem;outline:none">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="results-wrap">
  <div class="status-line" id="status-line"></div>
  <div id="results"></div>
</div>

<div class="drawer" id="drawer">
  <div class="drawer-head">
    <span class="drawer-title">Code</span>
    <button class="pop-x" id="drawer-x">✕</button>
  </div>
  <div class="lang-tabs" id="lang-tabs">
    <button class="lang-tab active" data-lang="curl">cURL</button>
    <button class="lang-tab" data-lang="js">JavaScript</button>
    <button class="lang-tab" data-lang="python">Python</button>
  </div>
  <div class="drawer-code">
    <button class="copy-float" id="copy-code">Copy</button>
    <pre id="code-out"></pre>
  </div>
  <div class="drawer-resp-head">
    <span style="font-size:.72rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.05em">Response</span>
    <span class="st-pill" id="st-2xx"><span class="dot"></span>200</span>
    <span class="st-pill" id="st-err"><span class="dot"></span>4xx/5xx</span>
    <span style="flex:1"></span>
    <span id="resp-ms" style="font-size:.7rem;color:var(--dim)"></span>
  </div>
  <div class="drawer-resp"><pre id="resp-out"><span style="color:var(--dim-2)">Run a request to see the raw response.</span></pre></div>
</div>

<script>
var BASE = '${baseUrl}';

/* ============ STATE ============ */
var MODES = [
  {id:'search', label:'Search'},
  {id:'scrape', label:'Scrape'},
  {id:'extract', label:'Extract'},
  {id:'map', label:'Map'},
  {id:'crawl', label:'Crawl'},
];
var FMT_DEFS = [
  {id:'markdown', name:'Markdown', kind:'lines'},
  {id:'links', name:'Links', kind:'list'},
  {id:'html', name:'HTML', kind:'html'},
  {id:'rawHtml', name:'Raw HTML', kind:'html'},
  {id:'json', name:'JSON', kind:'json'},
  {id:'screenshot', name:'Screenshot', kind:'shot'},
];
var FMTS_BY_MODE = {
  search:['markdown','links','html','json'],
  scrape:['markdown','links','html','rawHtml','json','screenshot'],
  extract:['markdown','links','html','json'],
  map:[],
  crawl:['markdown','links','html','json'],
};
var PLACEHOLDERS = {
  search:'Top restaurants in SF',
  scrape:'example.com/blog/post',
  extract:'example.com\\nexample.com/about',
  map:'example.com',
  crawl:'example.com',
};
var RUN_LABELS = {search:'Start searching', scrape:'Start scraping', extract:'Start extracting', map:'Start mapping', crawl:'Start crawling'};

var state = {
  mode:'search',
  input:'',
  formats:['markdown'],
  jsonPrompt:'',
  opts:{
    limit:'', onlyMainContent:true, scrapeResults:false, waitFor:'',
    includeSubdomains:false, maxDepth:'1', maxPages:'5', asyncCrawl:true,
    prompt:'', showSources:false,
    provider:'auto', engine:'browser', maxAge:'', concurrency:'5',
  },
  lang:'curl',
  busy:false,
  poller:null,
  lastDoc:null,
};

/* ============ HELPERS ============ */
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function el(tag, cls, html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

function normalizeUrl(v){
  v = v.trim();
  if (!v) return '';
  if (!/^https?:\\/\\//i.test(v)) v = 'https://' + v;
  return v;
}

function hlJson(s){
  return esc(s).replace(
    /("(?:[^"\\\\]|\\\\.)*")(\\s*:)|("(?:[^"\\\\]|\\\\.)*")|\\b(true|false)\\b|\\b(null)\\b|(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)/g,
    function(m,k,c,sv,b,nl,n){
      if(k&&c)return '<span class="tok-key">'+k+'</span>'+c;
      if(sv)return '<span class="tok-s">'+sv+'</span>';
      if(b)return '<span class="tok-b">'+b+'</span>';
      if(nl)return '<span class="tok-c">'+nl+'</span>';
      if(n)return '<span class="tok-n">'+n+'</span>';
      return m;
    });
}

/* ============ BODY BUILDER ============ */
function endpointPath(){
  return {search:'/search',scrape:'/scrape',extract:'/extract',map:'/map',crawl:'/crawl'}[state.mode];
}

function buildBody(){
  var m = state.mode, o = state.opts, b = {};
  var fmts = state.formats.slice();
  var scrapeOpts = {};
  if (fmts.length) scrapeOpts.formats = fmts;
  if (o.onlyMainContent) scrapeOpts.onlyMainContent = true;
  if (state.jsonPrompt && fmts.indexOf('json') !== -1) scrapeOpts.jsonPrompt = state.jsonPrompt;
  if (o.waitFor) scrapeOpts.waitFor = parseInt(o.waitFor) || 0;
  if (o.provider && o.provider !== 'auto') scrapeOpts.browserProvider = o.provider;
  if (o.engine && o.engine !== 'browser') scrapeOpts.engine = o.engine;
  if (o.maxAge !== '') scrapeOpts.maxAge = parseInt(o.maxAge) || 0;

  if (m === 'search') {
    b.query = state.input.trim();
    if (o.limit) b.limit = parseInt(o.limit) || 10;
    if (o.scrapeResults) b.scrapeOptions = scrapeOpts;
  } else if (m === 'scrape') {
    b.url = normalizeUrl(state.input);
    if (fmts.length) b.formats = fmts;
    if (o.onlyMainContent) b.onlyMainContent = true;
    if (o.waitFor) b.waitFor = parseInt(o.waitFor) || 0;
    if (state.jsonPrompt && fmts.indexOf('json') !== -1) b.jsonPrompt = state.jsonPrompt;
    if (o.provider && o.provider !== 'auto') b.browserProvider = o.provider;
    if (o.engine && o.engine !== 'browser') b.engine = o.engine;
    if (o.maxAge !== '') b.maxAge = parseInt(o.maxAge) || 0;
  } else if (m === 'extract') {
    b.urls = state.input.split('\\n').map(function(l){return normalizeUrl(l)}).filter(Boolean);
    if (o.prompt) b.prompt = o.prompt;
    if (fmts.length) b.formats = fmts;
    if (o.showSources) b.showSources = true;
  } else if (m === 'map') {
    b.url = normalizeUrl(state.input);
    if (o.limit) b.limit = parseInt(o.limit) || 100;
    if (o.includeSubdomains) b.includeSubdomains = true;
  } else if (m === 'crawl') {
    b.url = normalizeUrl(state.input);
    if (o.maxDepth !== '') b.maxDepth = parseInt(o.maxDepth) || 0;
    if (o.maxPages !== '') b.limit = Math.min(parseInt(o.maxPages) || 5, 25);
    if (o.concurrency !== '') b.concurrency = parseInt(o.concurrency) || 5;
    b.scrapeOptions = scrapeOpts;
    if (o.asyncCrawl) b.async = true;
  }
  return b;
}

/* ============ CODE GEN ============ */
function genCode(lang){
  var url = BASE + endpointPath();
  var body = JSON.stringify(buildBody(), null, 2);
  if (lang === 'curl') {
    return "curl -X POST " + url + " \\\\\\n  -H 'Content-Type: application/json' \\\\\\n  -d '" + body + "'";
  }
  if (lang === 'js') {
    return "const res = await fetch('" + url + "', {\\n  method: 'POST',\\n  headers: { 'Content-Type': 'application/json' },\\n  body: JSON.stringify(" + body.split('\\n').join('\\n  ') + ")\\n});\\nconst data = await res.json();\\nconsole.log(data);";
  }
  // python
  return "import requests\\n\\nurl = \\"" + url + "\\"\\npayload = " + body.replace(/\\btrue\\b/g,'True').replace(/\\bfalse\\b/g,'False').replace(/\\bnull\\b/g,'None') + "\\n\\nres = requests.post(url, json=payload)\\nprint(res.json())";
}

function hlCode(lang, code){
  if (lang === 'curl') {
    return esc(code)
      .replace(/^curl/,'<span class="tok-k">curl</span>')
      .replace(/ -X /,' <span class="tok-k">-X</span> ')
      .replace(/POST/,'<span class="tok-m">POST</span>')
      .replace(/(https?:\\/\\/[^\\s\\\\]+)/,'<span class="tok-u">$1</span>')
      .replace(/ -H /,' <span class="tok-k">-H</span> ')
      .replace(/ -d /,' <span class="tok-k">-d</span> ');
  }
  if (lang === 'js') {
    return esc(code)
      .replace(/\\b(const|await|fetch)\\b/g,'<span class="tok-k">$1</span>')
      .replace(/('[^']*')/g,'<span class="tok-s">$1</span>');
  }
  return esc(code)
    .replace(/\\b(import|requests)\\b/g,'<span class="tok-k">$1</span>')
    .replace(/("(?:[^"\\\\]|\\\\.)*")/g,'<span class="tok-s">$1</span>')
    .replace(/\\b(True|False|None)\\b/g,'<span class="tok-b">$1</span>');
}

function refreshCode(){
  $('code-out').innerHTML = hlCode(state.lang, genCode(state.lang));
}

/* ============ RENDER: HERO ============ */
function renderPills(){
  var c = $('pills'); c.innerHTML = '';
  MODES.forEach(function(m){
    var b = el('button','mode-pill' + (state.mode===m.id?' active':''));
    b.innerHTML = '<span class="pill-dot"></span>' + m.label;
    b.onclick = function(){ switchMode(m.id); };
    c.appendChild(b);
  });
}

function renderInput(){
  var row = $('input-row'); row.innerHTML = '';
  var isMulti = state.mode === 'extract';
  if (!isMulti && state.mode !== 'search') {
    row.appendChild(el('span','proto','https://'));
  }
  if (state.mode === 'search') {
    var ic = el('span','proto'); ic.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>';
    ic.style.display='flex'; ic.style.alignItems='center';
    row.appendChild(ic);
  }
  var inp;
  if (isMulti) {
    inp = document.createElement('textarea');
    inp.rows = 3;
  } else {
    inp = document.createElement('input');
    inp.type = 'text';
  }
  inp.className = 'main-input';
  inp.id = 'main-input';
  inp.placeholder = PLACEHOLDERS[state.mode];
  inp.value = state.input;
  inp.addEventListener('input', function(){ state.input = inp.value; refreshCode(); });
  if (!isMulti) inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') run(); });
  row.appendChild(inp);
  $('run-label').textContent = RUN_LABELS[state.mode];
}

function renderFmtBtn(){
  var n = state.formats.length;
  var label = n === 0 ? 'Format' : n === 1 ? 'Format: ' + state.formats[0] : 'Formats';
  $('fmt-label').textContent = label;
  var cb = $('fmt-count');
  if (n > 1) { cb.style.display=''; cb.textContent = n; } else cb.style.display='none';
  $('fmt-btn').style.display = FMTS_BY_MODE[state.mode].length ? '' : 'none';
  $('fmt-btn').classList.toggle('lit', n > 0 && FMTS_BY_MODE[state.mode].length > 0);
}

function fmtThumb(kind){
  if (kind === 'lines') return '<div class="fmt-line dark" style="width:55%"></div><div class="fmt-line" style="width:90%"></div><div class="fmt-line" style="width:80%"></div><div class="fmt-line" style="width:65%"></div>';
  if (kind === 'list') return '<div style="display:flex;gap:4px;align-items:center"><div style="width:5px;height:5px;border-radius:50%;background:#c9c4b8"></div><div class="fmt-line" style="width:70%"></div></div><div style="display:flex;gap:4px;align-items:center"><div style="width:5px;height:5px;border-radius:50%;background:#c9c4b8"></div><div class="fmt-line" style="width:55%"></div></div><div style="display:flex;gap:4px;align-items:center"><div style="width:5px;height:5px;border-radius:50%;background:#c9c4b8"></div><div class="fmt-line" style="width:62%"></div></div>';
  if (kind === 'html') return '<div class="mono-mini">&lt;html&gt;<br>&nbsp;&lt;body&gt;&nbsp;…<br>&lt;/html&gt;</div>';
  if (kind === 'json') return '<div class="mono-mini">{<br>&nbsp;"name":<br>&nbsp;"type"<br>}</div>';
  if (kind === 'shot') return '<div style="border:1px solid #d9d5cc;border-radius:4px;flex:1;position:relative;background:#fff"><div style="height:7px;border-bottom:1px solid #e8e5de;display:flex;gap:2px;align-items:center;padding:0 3px"><div style="width:3px;height:3px;border-radius:50%;background:#d9d5cc"></div><div style="width:3px;height:3px;border-radius:50%;background:#d9d5cc"></div></div></div>';
  return '';
}

function renderFmtGrid(){
  var c = $('fmt-grid'); c.innerHTML = '';
  var allowed = FMTS_BY_MODE[state.mode];
  FMT_DEFS.filter(function(f){return allowed.indexOf(f.id)!==-1}).forEach(function(f){
    var card = el('div','fmt-card' + (state.formats.indexOf(f.id)!==-1?' on':''));
    card.innerHTML = '<div class="fmt-thumb">' + fmtThumb(f.kind) + '</div><div class="fmt-name">' + f.name + '</div>';
    card.onclick = function(){
      var i = state.formats.indexOf(f.id);
      if (i === -1) state.formats.push(f.id); else state.formats.splice(i,1);
      renderFmtGrid(); renderFmtBtn(); syncJsonPrompt(); refreshCode();
    };
    c.appendChild(card);
  });
  syncJsonPrompt();
}

function syncJsonPrompt(){
  $('json-prompt-wrap').style.display = state.formats.indexOf('json') !== -1 ? '' : 'none';
}

/* ============ RENDER: OPTIONS ============ */
function optToggle(label, key, hint){
  var row = el('div','opt-row');
  var lab = el('div','opt-label', esc(label) + (hint ? ' <span class="opt-hint">' + esc(hint) + '</span>' : ''));
  var tg = el('label','tgl');
  var inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = !!state.opts[key];
  inp.onchange = function(){ state.opts[key] = inp.checked; refreshCode(); renderOptions(); };
  tg.appendChild(inp);
  tg.appendChild(el('span','knob'));
  row.appendChild(lab); row.appendChild(tg);
  return row;
}
function optNum(label, key, ph){
  var row = el('div','opt-row');
  row.appendChild(el('div','opt-label',esc(label)));
  var inp = document.createElement('input');
  inp.type = 'number'; inp.placeholder = ph || '';
  inp.value = state.opts[key];
  inp.oninput = function(){ state.opts[key] = inp.value; refreshCode(); };
  row.appendChild(inp);
  return row;
}
function optText(label, key, ph){
  var row = el('div','opt-row stack');
  row.appendChild(el('div','opt-label',esc(label)));
  var inp = document.createElement('input');
  inp.type = 'text'; inp.className='wide'; inp.placeholder = ph || '';
  inp.value = state.opts[key];
  inp.oninput = function(){ state.opts[key] = inp.value; refreshCode(); };
  row.appendChild(inp);
  return row;
}
function optSelect(label, key, options, hint){
  var row = el('div','opt-row');
  row.appendChild(el('div','opt-label', esc(label) + (hint ? ' <span class="opt-hint">' + esc(hint) + '</span>' : '')));
  var sel = document.createElement('select');
  options.forEach(function(opt){
    var o = document.createElement('option');
    o.value = opt[0]; o.textContent = opt[1];
    if (state.opts[key] === opt[0]) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = function(){ state.opts[key] = sel.value; refreshCode(); };
  row.appendChild(sel);
  return row;
}

function renderOptions(){
  var c = $('opt-body'); c.innerHTML = '';
  var m = state.mode;
  if (m === 'search') {
    c.appendChild(optNum('Limit','limit','10'));
    c.appendChild(optToggle('Scrape content from results','scrapeResults','fetches each page'));
    if (state.opts.scrapeResults) {
      c.appendChild(el('div','opt-sep','Scrape'));
      c.appendChild(optToggle('Main content only','onlyMainContent'));
      c.appendChild(optNum('Wait for (ms)','waitFor','0'));
    }
  } else if (m === 'scrape') {
    c.appendChild(optToggle('Main content only','onlyMainContent','strips nav/footer'));
    c.appendChild(optNum('Wait for (ms)','waitFor','0'));
    c.appendChild(el('div','opt-sep','Performance'));
    c.appendChild(optSelect('Browser','provider',PROVIDER_OPTS,'auto = Kernel when available'));
    c.appendChild(optSelect('Engine','engine',ENGINE_OPTS,'fetch skips the browser'));
    c.appendChild(optNum('Cache TTL (s)','maxAge','3600'));
  } else if (m === 'extract') {
    c.appendChild(optText('Extraction prompt','prompt','Extract product names and prices'));
    c.appendChild(optToggle('Show sources','showSources'));
  } else if (m === 'map') {
    c.appendChild(optNum('Limit','limit','100'));
    c.appendChild(optToggle('Include subdomains','includeSubdomains'));
  } else if (m === 'crawl') {
    c.appendChild(optNum('Max depth','maxDepth','1'));
    c.appendChild(optNum('Max pages','maxPages','5'));
    c.appendChild(optNum('Concurrency','concurrency','5'));
    c.appendChild(optToggle('Async','asyncCrawl','poll status while crawling'));
    c.appendChild(el('div','opt-sep','Page scraping'));
    c.appendChild(optToggle('Main content only','onlyMainContent'));
    c.appendChild(optSelect('Browser','provider',PROVIDER_OPTS,'auto = Kernel when available'));
    c.appendChild(optNum('Cache TTL (s)','maxAge','3600'));
  }
}
var PROVIDER_OPTS = [['auto','Auto'],['kernel','Kernel'],['cloudflare','Cloudflare']];
var ENGINE_OPTS = [['browser','Browser'],['fetch','Fetch (fast)']];

/* ============ MODE SWITCH ============ */
function switchMode(m, keepInput){
  if (state.poller) { clearInterval(state.poller); state.poller = null; }
  state.mode = m;
  if (!keepInput) state.input = '';
  var allowed = FMTS_BY_MODE[m];
  state.formats = state.formats.filter(function(f){return allowed.indexOf(f)!==-1});
  if (!state.formats.length && allowed.length) state.formats = ['markdown'];
  renderPills(); renderInput(); renderFmtBtn(); renderFmtGrid(); renderOptions(); refreshCode();
  closePops();
}

/* ============ STATUS ============ */
function setStatus(kind, text){
  var c = $('status-line');
  if (!kind) { c.innerHTML = ''; return; }
  c.innerHTML = '<span class="status-chip ' + kind + '"><span class="dot"></span>' + esc(text) + '</span>';
}

function setRespMeta(status, ms){
  $('st-2xx').className = 'st-pill' + (status >= 200 && status < 300 ? ' on-2xx' : '');
  $('st-2xx').innerHTML = '<span class="dot"></span>' + (status >= 200 && status < 300 ? status : '2xx');
  $('st-err').className = 'st-pill' + (status >= 400 ? ' on-err' : '');
  $('st-err').innerHTML = '<span class="dot"></span>' + (status >= 400 ? status : '4xx/5xx');
  $('resp-ms').textContent = ms != null ? ms + 'ms' : '';
}

function showRawResponse(obj){
  var s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  $('resp-out').innerHTML = hlJson(s);
}

/* ============ RESULTS RENDER ============ */
function dlJson(data, name){
  var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name || 'spindle.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function scrapePageAction(url){
  switchMode('scrape', true);
  state.input = url.replace(/^https?:\\/\\//,'');
  $('main-input').value = state.input;
  refreshCode();
  window.scrollTo({top:0,behavior:'smooth'});
  run();
}

function renderSearch(data){
  var web = (data.data && data.data.web) || [];
  var card = el('div','res-card');
  var head = el('div','res-head');
  head.appendChild(el('div','res-title','Results <span class="count">(' + web.length + ')</span>'));
  var acts = el('div','res-actions');
  var jb = el('button','mini-btn','⬇ JSON');
  jb.onclick = function(){ dlJson(data, 'search.json'); };
  acts.appendChild(jb);
  head.appendChild(acts);
  card.appendChild(head);

  if (!web.length) {
    card.appendChild(el('div','empty-note','No results.'));
  }
  web.forEach(function(r){
    var row = el('div','sr-row');
    var main = el('div','sr-main');
    main.appendChild(el('div','sr-title','<span class="sr-pos">#' + (r.position||'') + '</span><span>' + esc(r.title || r.url) + '</span>'));
    main.appendChild(el('div','sr-url', esc(r.url)));
    if (r.description) main.appendChild(el('div','sr-desc', esc(r.description)));
    if (r.markdown) main.appendChild(el('div','sr-md', esc(r.markdown.slice(0,600))));
    row.appendChild(main);
    var sb = el('button','mini-btn','Scrape page');
    sb.style.flexShrink = '0';
    sb.onclick = function(){ scrapePageAction(r.url); };
    row.appendChild(sb);
    card.appendChild(row);
  });
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

function docTabsFor(doc){
  var tabs = [];
  if (doc.markdown != null) tabs.push({id:'markdown',label:'Markdown',get:function(){return doc.markdown}});
  if (doc.json != null) tabs.push({id:'json',label:'JSON',get:function(){return JSON.stringify(doc.json,null,2)},hl:true});
  if (doc.html != null) tabs.push({id:'html',label:'HTML',get:function(){return doc.html}});
  if (doc.rawHtml != null) tabs.push({id:'rawHtml',label:'Raw HTML',get:function(){return doc.rawHtml}});
  if (doc.links != null) tabs.push({id:'links',label:'Links ('+doc.links.length+')',get:function(){return doc.links.join('\\n')}});
  if (doc.screenshot != null) tabs.push({id:'screenshot',label:'Screenshot',img:doc.screenshot});
  tabs.push({id:'_meta',label:'Metadata',get:function(){return JSON.stringify(doc.metadata||{},null,2)},hl:true});
  return tabs;
}

function renderDoc(doc){
  state.lastDoc = doc;
  var card = el('div','res-card');
  var head = el('div','res-head');
  var t = el('div');
  t.appendChild(el('div','res-title', esc(doc.title || 'Scraped page')));
  t.appendChild(el('div','sr-url', esc(doc.url || '')));
  head.appendChild(t);
  var acts = el('div','res-actions');
  var jb = el('button','mini-btn','⬇ JSON');
  jb.onclick = function(){ dlJson(doc, 'scrape.json'); };
  acts.appendChild(jb);
  if (doc.markdown != null) {
    var mb = el('button','mini-btn','⬇ Markdown');
    mb.onclick = function(){
      var blob = new Blob([doc.markdown],{type:'text/markdown'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='page.md'; a.click();
      URL.revokeObjectURL(a.href);
    };
    acts.appendChild(mb);
  }
  head.appendChild(acts);
  card.appendChild(head);

  var tabs = docTabsFor(doc);
  var tabBar = el('div','doc-tabs');
  var body = el('div','doc-body');
  function show(tab){
    tabBar.querySelectorAll('.doc-tab').forEach(function(b){ b.classList.toggle('active', b.dataset.t === tab.id); });
    body.innerHTML = '';
    if (tab.img) {
      var img = document.createElement('img');
      img.src = tab.img;
      body.appendChild(img);
    } else {
      var content = tab.get() || '';
      var pre = el('pre');
      pre.innerHTML = tab.hl ? hlJson(content) : esc(content);
      body.appendChild(pre);
    }
  }
  tabs.forEach(function(tab, i){
    var b = el('button','doc-tab' + (i===0?' active':''), esc(tab.label));
    b.dataset.t = tab.id;
    b.onclick = function(){ show(tab); };
    tabBar.appendChild(b);
  });
  card.appendChild(tabBar);
  card.appendChild(body);
  if (tabs.length) show(tabs[0]);
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

function renderMap(data){
  var links = data.links || [];
  var card = el('div','res-card');
  var head = el('div','res-head');
  head.appendChild(el('div','res-title','Links <span class="count">(' + links.length + ')</span>'));
  var acts = el('div','res-actions');
  var jb = el('button','mini-btn','⬇ JSON');
  jb.onclick = function(){ dlJson(data,'map.json'); };
  var cb = el('button','mini-btn','Copy all');
  cb.onclick = function(){
    navigator.clipboard.writeText(links.map(function(l){return l.url}).join('\\n')).catch(function(){});
    cb.textContent = 'Copied!'; setTimeout(function(){cb.textContent='Copy all'},1200);
  };
  acts.appendChild(cb); acts.appendChild(jb);
  head.appendChild(acts);
  card.appendChild(head);
  if (!links.length) card.appendChild(el('div','empty-note','No links found.'));
  links.forEach(function(l){
    var row = el('div','link-row');
    var a = document.createElement('a');
    a.href = l.url; a.target = '_blank'; a.textContent = l.url;
    row.appendChild(a);
    var sb = el('button','mini-btn','Scrape');
    sb.onclick = function(){ scrapePageAction(l.url); };
    row.appendChild(sb);
    card.appendChild(row);
  });
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

function renderCrawl(data){
  var pages = (data.data && Array.isArray(data.data)) ? data.data : (Array.isArray(data.pages) ? data.pages : []);
  var total = data.total != null ? data.total : pages.length;
  var completed = data.completed != null ? data.completed : pages.length;
  var card = el('div','res-card');
  var head = el('div','res-head');
  head.appendChild(el('div','res-title','Crawl <span class="count">' + completed + '/' + total + ' pages — ' + esc(data.status || '') + '</span>'));
  var acts = el('div','res-actions');
  var jb = el('button','mini-btn','⬇ JSON');
  jb.onclick = function(){ dlJson(data,'crawl.json'); };
  acts.appendChild(jb);
  head.appendChild(acts);
  card.appendChild(head);

  if (data.status === 'processing' || data.status === 'queued' || data.status === 'running' || data.status === 'scraping') {
    var pb = el('div','progress-bar');
    var fill = el('div','progress-fill');
    fill.style.width = total ? Math.round(completed/total*100) + '%' : '8%';
    pb.appendChild(fill);
    card.appendChild(pb);
  }
  if (!pages.length) {
    card.appendChild(el('div','empty-note', data.status === 'completed' ? 'No pages returned.' : 'Crawling… pages appear as they finish.'));
  }
  pages.forEach(function(p){
    var item = el('div','page-item');
    var head2 = el('div','page-head');
    head2.innerHTML = '<span class="page-url">' + esc(p.url || '') + '</span><span class="chev">▶</span>';
    head2.onclick = function(){ item.classList.toggle('open'); };
    item.appendChild(head2);
    var body = el('div','page-body');
    var pre = el('pre');
    var content = p.markdown != null ? p.markdown : JSON.stringify(p, null, 2);
    pre.textContent = String(content).slice(0, 4000);
    body.appendChild(pre);
    item.appendChild(body);
    card.appendChild(item);
  });
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

function renderExtract(data){
  renderGenericJson(data, 'Extract result');
}

function renderGenericJson(data, title){
  var card = el('div','res-card');
  var head = el('div','res-head');
  head.appendChild(el('div','res-title', esc(title || 'Result')));
  var acts = el('div','res-actions');
  var jb = el('button','mini-btn','⬇ JSON');
  jb.onclick = function(){ dlJson(data,'result.json'); };
  acts.appendChild(jb);
  head.appendChild(acts);
  card.appendChild(head);
  var body = el('div','doc-body');
  var pre = el('pre');
  pre.innerHTML = hlJson(JSON.stringify(data, null, 2));
  body.appendChild(pre);
  card.appendChild(body);
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

function renderError(data, status){
  var card = el('div','res-card');
  card.appendChild(el('div','res-head','<div class="res-title" style="color:var(--red)">Error' + (status?' · '+status:'') + '</div>'));
  var body = el('div','doc-body');
  var pre = el('pre');
  pre.innerHTML = hlJson(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  body.appendChild(pre);
  card.appendChild(body);
  $('results').innerHTML = '';
  $('results').appendChild(card);
}

/* ============ RUN ============ */
function validate(){
  var v = state.input.trim();
  if (!v) return 'Enter ' + (state.mode === 'search' ? 'a query' : 'a URL');
  return null;
}

function run(){
  if (state.busy) return;
  var err = validate();
  if (err) { setStatus('err', err); return; }
  if (state.poller) { clearInterval(state.poller); state.poller = null; }

  state.busy = true;
  var btn = $('run-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Running';
  setStatus('run', 'Running ' + state.mode + '…');
  $('results').innerHTML = '';

  var url = BASE + endpointPath();
  var body = buildBody();
  var t0 = Date.now();

  fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(res){
      var ms = Date.now() - t0;
      setRespMeta(res.status, ms);
      return res.text().then(function(txt){
        var data;
        try { data = JSON.parse(txt); } catch(e) { data = txt; }
        showRawResponse(data);
        if (res.status >= 400 || (data && data.success === false)) {
          setStatus('err', 'Failed · ' + res.status);
          renderError(data, res.status);
          return;
        }
        handleSuccess(data, ms);
      });
    })
    .catch(function(e){
      setStatus('err', e.message);
      renderError({error: e.message});
      setRespMeta(0, Date.now() - t0);
    })
    .finally(function(){
      state.busy = false;
      btn.disabled = false;
      btn.innerHTML = '<span id="run-label">' + RUN_LABELS[state.mode] + '</span> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    });
}

function handleSuccess(data, ms){
  var m = state.mode;
  var secs = (ms/1000).toFixed(1);
  if (m === 'search') { setStatus('ok','Search completed in ' + secs + 's'); renderSearch(data); }
  else if (m === 'scrape') { setStatus('ok','Scrape completed in ' + secs + 's'); renderDoc(data.data || data); }
  else if (m === 'map') { setStatus('ok','Map completed in ' + secs + 's'); renderMap(data); }
  else if (m === 'extract') { setStatus('ok','Extract completed in ' + secs + 's'); renderExtract(data); }
  else if (m === 'crawl') {
    if (data.status === 'queued' && data.id) {
      setStatus('run','Crawl queued — polling status…');
      renderCrawl(data);
      startPolling(data.id);
    } else {
      setStatus('ok','Crawl completed in ' + secs + 's');
      renderCrawl(data);
    }
  }
}

function startPolling(id){
  var tries = 0;
  state.poller = setInterval(function(){
    tries++;
    if (tries > 150) { clearInterval(state.poller); state.poller = null; setStatus('err','Polling timed out'); return; }
    fetch(BASE + '/crawl/' + id)
      .then(function(r){ return r.json(); })
      .then(function(data){
        showRawResponse(data);
        renderCrawl(data);
        var st = data.status;
        if (st === 'completed' || st === 'failed' || st === 'cancelled') {
          clearInterval(state.poller); state.poller = null;
          setStatus(st === 'completed' ? 'ok' : 'err', 'Crawl ' + st);
        } else {
          setStatus('run','Crawling… ' + (data.completed||0) + '/' + (data.total||'?') + ' pages');
        }
      })
      .catch(function(){});
  }, 2000);
}

/* ============ POPOVER / DRAWER WIRES ============ */
function closePops(){
  $('opt-pop').classList.remove('open');
  $('fmt-pop').classList.remove('open');
  $('opt-btn').classList.remove('lit');
}
$('opt-btn').onclick = function(e){
  e.stopPropagation();
  var open = $('opt-pop').classList.contains('open');
  closePops();
  if (!open) { renderOptions(); $('opt-pop').classList.add('open'); }
};
$('fmt-btn').onclick = function(e){
  e.stopPropagation();
  var open = $('fmt-pop').classList.contains('open');
  closePops();
  if (!open) { renderFmtGrid(); $('fmt-pop').classList.add('open'); }
};
document.addEventListener('click', function(e){
  if (!e.target.closest('.popover') && !e.target.closest('.tool-btn')) closePops();
});
document.querySelectorAll('[data-close]').forEach(function(b){
  b.onclick = function(){ $(b.dataset.close).classList.remove('open'); };
});

$('code-btn').onclick = function(){
  $('drawer').classList.toggle('open');
  $('code-btn').classList.toggle('lit');
  refreshCode();
};
$('drawer-x').onclick = function(){
  $('drawer').classList.remove('open');
  $('code-btn').classList.remove('lit');
};
$('lang-tabs').addEventListener('click', function(e){
  var b = e.target.closest('[data-lang]');
  if (!b) return;
  state.lang = b.dataset.lang;
  document.querySelectorAll('.lang-tab').forEach(function(t){ t.classList.toggle('active', t === b); });
  refreshCode();
});
$('copy-code').onclick = function(){
  navigator.clipboard.writeText(genCode(state.lang)).catch(function(){});
  var b = $('copy-code');
  b.textContent = 'Copied!'; b.classList.add('ok');
  setTimeout(function(){ b.textContent='Copy'; b.classList.remove('ok'); }, 1400);
};
$('json-prompt').addEventListener('input', function(e){ state.jsonPrompt = e.target.value; refreshCode(); });
$('run-btn').onclick = run;

/* ============ INIT ============ */
switchMode('search');
</script>
</body>
</html>`;
}
