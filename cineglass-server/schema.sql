-- MegahEnt admin database schema
-- Run automatically by install.php, or import manually via phpMyAdmin.

CREATE TABLE IF NOT EXISTS settings (
  skey   VARCHAR(64)  PRIMARY KEY,
  svalue TEXT         NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  message    TEXT        NOT NULL,
  icon       VARCHAR(64) NOT NULL DEFAULT 'campaign',
  enabled    TINYINT(1)  NOT NULL DEFAULT 1,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collections (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(120) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collection_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  collection_id INT NOT NULL,
  tmdb_id       INT NOT NULL,
  media_type    ENUM('movie','tv') NOT NULL DEFAULT 'movie',
  sort_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ci_collection FOREIGN KEY (collection_id)
    REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS availability (
  tmdb_id INT NOT NULL,
  type VARCHAR(8) NOT NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tmdb_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
