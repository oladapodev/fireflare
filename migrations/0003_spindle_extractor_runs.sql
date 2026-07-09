CREATE TABLE IF NOT EXISTS spindle_extractor_runs (
  id TEXT PRIMARY KEY,
  extractor_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT,
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (extractor_id) REFERENCES spindle_extractors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES spindle_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS spindle_extractor_runs_user_idx ON spindle_extractor_runs(user_id, created_at);
CREATE INDEX IF NOT EXISTS spindle_extractor_runs_extractor_idx ON spindle_extractor_runs(extractor_id, created_at);
