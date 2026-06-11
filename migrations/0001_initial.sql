CREATE TABLE IF NOT EXISTS fireflare_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS fireflare_jobs_kind_status_idx
  ON fireflare_jobs (kind, status, created_at);

CREATE TABLE IF NOT EXISTS fireflare_documents (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  url TEXT NOT NULL,
  title TEXT,
  markdown_key TEXT,
  html_key TEXT,
  screenshot_key TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS fireflare_documents_url_idx
  ON fireflare_documents (url, created_at);
