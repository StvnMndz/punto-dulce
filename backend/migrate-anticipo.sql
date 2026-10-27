USE punto_dulce;

-- Seguro para volver a ejecutar: agrega la columna solo si todavía no existe.
SET @migration_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'pedidos'
     AND column_name = 'anticipo') = 0,
  'ALTER TABLE pedidos ADD COLUMN anticipo DECIMAL(10,2) NULL DEFAULT NULL',
  'SELECT ''La columna anticipo ya existe; no se realizaron cambios'' AS resultado'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
