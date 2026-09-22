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

SELECT id, nombre_completo, usuario, rol, activo
FROM punto_dulce.empleados;

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

USE punto_dulce;

SELECT * FROM insumos;

CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(100) PRIMARY KEY,
    cat VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    icono VARCHAR(20),
    personalizable TINYINT(1) NOT NULL DEFAULT 0,
    disponible TINYINT(1) NOT NULL DEFAULT 1,
    media VARCHAR(100)
);

USE punto_dulce;

-- creacion productos
INSERT INTO productos
(id, cat, nombre, descripcion, precio, icono, personalizable, disponible, media)
VALUES
('cup1', 'cupcake', 'Cupcake Red Velvet',
 'Bizcocho red velvet con frosting de queso crema.',
 6.50, '🧁', 0, 1, 'media-cupcake'),

('cup2', 'cupcake', 'Cupcake Chocolate',
 'Cupcake de chocolate con ganache y chips.',
 6.00, '🧁', 0, 1, 'media-cupcake'),

('cup3', 'cupcake', 'Cupcake Vainilla',
 'Vainilla clásico con frosting de mantequilla.',
 5.50, '🧁', 0, 1, 'media-cupcake'),

('bro1', 'brownie', 'Brownie Clásico',
 'Brownie húmedo de chocolate con nueces.',
 7.00, '🍫', 0, 1, 'media-brownie'),

('bro2', 'brownie', 'Brownie con Dulce de Leche',
 'Brownie relleno con dulce de leche.',
 7.50, '🍫', 0, 1, 'media-brownie'),

('alf1', 'alfajor', 'Alfajor Clásico',
 'Alfajor relleno de manjar blanco, bañado en azúcar.',
 3.00, '🥮', 0, 1, 'media-alfajor'),

('alf2', 'alfajor', 'Alfajor de Chocolate',
 'Alfajor bañado en chocolate bitter.',
 3.50, '🥮', 0, 1, 'media-alfajor'),

('gal1', 'galleta', 'Galletas de Avena',
 'Galletas de avena con pasas, caja x6.',
 9.00, '🍪', 0, 1, 'media-galleta'),

('gal2', 'galleta', 'Galletas Chips de Chocolate',
 'Galletas crocantes con chips de chocolate, caja x6.',
 10.00, '🍪', 0, 1, 'media-galleta'),

('tor1', 'torta', 'Torta Personalizada',
 'Diseña tu torta: tamaño, sabor, relleno y decoración a elección.',
 60.00, '🎂', 1, 1, 'media-torta');
 
 SELECT * FROM productos;
 
 USE punto_dulce;

select * from empleados;

CREATE TABLE IF NOT EXISTS ordenes_compra (
    id VARCHAR(100) PRIMARY KEY,
    insumo_id INT NULL,
    insumo_nombre VARCHAR(150) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0,
    tienda VARCHAR(150),
    fecha DATE NOT NULL,
    fecha_iso DATETIME,
    registrado_por VARCHAR(150),
    FOREIGN KEY (insumo_id) REFERENCES insumos(id)
);

SELECT * FROM ordenes_compra;

USE punto_dulce;

SELECT *FROM ordenes_compra
ORDER BY fecha DESC;

SELECT *FROM insumos;
