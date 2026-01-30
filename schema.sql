DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT DEFAULT 'Shopee',
  content TEXT,
  raw_payload TEXT,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
