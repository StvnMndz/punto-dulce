-- =========================================================
-- Punto Dulce — Base de datos de empleados
-- =========================================================
-- Ejecuta este archivo una sola vez para crear la base de
-- datos y la tabla de empleados, con una cuenta administradora
-- de arranque (necesaria para poder asignar roles a los demás).
--
-- En consola de MySQL:
--   mysql -u root -p < schema.sql
-- o desde MySQL Workbench / VS Code (extensión MySQL): abre
-- este archivo y ejecútalo completo.
-- =========================================================

CREATE DATABASE IF NOT EXISTS punto_dulce
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE punto_dulce;

CREATE TABLE IF NOT EXISTS empleados (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono        VARCHAR(30)  NULL,
  usuario         VARCHAR(60)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  -- 'pendiente': se asigna automáticamente al registrarse.
  -- Un administrador debe cambiarlo a 'administrador', 'ventas' o 'produccion'.
  rol             ENUM('pendiente','administrador','ventas','produccion')
                    NOT NULL DEFAULT 'pendiente',
  activo          TINYINT(1) NOT NULL DEFAULT 1,
  fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Cuenta administradora de arranque.
-- Usuario: admin   |   Contraseña: admin123
-- (Es la única forma de tener un primer administrador que luego
-- pueda asignar roles a las cuentas que se vayan registrando.
-- Cámbiale la contraseña en cuanto pruebes el sistema.)
INSERT INTO empleados (nombre_completo, telefono, usuario, password_hash, rol, activo)
VALUES (
  'Administrador Demo',
  NULL,
  'admin',
  '$2b$10$LXQRS7.ZGAEjIKHpwcqVoOMU9lw2Z2jj68HpVN17XmF0wWF5SEGCG',
  'administrador',
  1
)
ON DUPLICATE KEY UPDATE usuario = usuario;

-- =========================================================
-- Tabla de insumos / materia prima
-- =========================================================
USE punto_dulce;

CREATE TABLE IF NOT EXISTS insumos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  cantidad        DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad          VARCHAR(30) NOT NULL,
  stock_minimo    DECIMAL(10,2) NOT NULL DEFAULT 0,
  proveedor       VARCHAR(150) NULL,
  actualizado_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
