import fs from 'fs';

const data = JSON.parse(fs.readFileSync('database_export_hostinger.json', 'utf-8'));

let sql = `-- ==============================================================
-- DATABASE EXPORT BKI PONTIANAK UNTUK HOSTINGER (MySQL / MariaDB)
-- Dihasilkan: ${new Date().toISOString()}
-- ==============================================================

SET FOREIGN_KEY_CHECKS = 0;

`;

for (const [table, rows] of Object.entries(data)) {
  if (!rows || rows.length === 0) continue;
  sql += `-- --------------------------------------------------------------\n`;
  sql += `-- Tabel: ${table}\n`;
  sql += `-- --------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`${table}\` (\n`;
  sql += `  \`id\` VARCHAR(255) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`raw_data\` LONGTEXT,\n`;
  sql += `  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  for (const row of rows) {
    const id = row.id ? String(row.id).replace(/'/g, "''") : 'id_' + Math.random().toString(36).substring(2, 9);
    const rawData = JSON.stringify(row).replace(/'/g, "''");
    sql += `INSERT INTO \`${table}\` (\`id\`, \`raw_data\`) VALUES ('${id}', '${rawData}');\n`;
  }
  sql += '\n';
}

sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
fs.writeFileSync('database_export_mysql.sql', sql, 'utf-8');
console.log('✅ Berhasil membuat database_export_mysql.sql');
