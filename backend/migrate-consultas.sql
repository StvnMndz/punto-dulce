-- Crea la tabla donde se guardan los mensajes enviados desde el formulario de contacto.
USE punto_dulce;

CREATE TABLE IF NOT EXISTS consultas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  contacto VARCHAR(120) NOT NULL,
  tema VARCHAR(80) NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consultas_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
