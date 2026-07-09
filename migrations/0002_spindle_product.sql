CREATE TABLE IF NOT EXISTS spindle_users (
  id TEXT PRIMARY KEY,
  github_id TEXT NOT NULL UNIQUE,
  github_login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  email TEXT,
  access_status TEXT NOT NULL DEFAULT 'requested',
  plan TEXT NOT NULL DEFAULT 'private_beta',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS spindle_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_access_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  use_case TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  api_key_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  credits REAL NOT NULL DEFAULT 0,
  cache_hit INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  job_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES spindle_api_keys(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS spindle_webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  event TEXT NOT NULL,
  status INTEGER NOT NULL,
  response_body TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (webhook_id) REFERENCES spindle_webhooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_extractors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schema_json TEXT,
  formats_json TEXT NOT NULL DEFAULT '["json","markdown"]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spindle_monitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  extractor_id TEXT,
  interval_minutes INTEGER NOT NULL DEFAULT 1440,
  active INTEGER NOT NULL DEFAULT 1,
  last_hash TEXT,
  last_status TEXT,
  next_run_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE,
  FOREIGN KEY (extractor_id) REFERENCES spindle_extractors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS spindle_monitor_runs (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  changed INTEGER NOT NULL DEFAULT 0,
  hash TEXT,
  diff_summary TEXT,
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (monitor_id) REFERENCES spindle_monitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS spindle_api_keys_user_idx ON spindle_api_keys(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS spindle_usage_user_idx ON spindle_usage_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS spindle_monitors_due_idx ON spindle_monitors(active, next_run_at);
CREATE INDEX IF NOT EXISTS spindle_monitor_runs_monitor_idx ON spindle_monitor_runs(monitor_id, created_at);
