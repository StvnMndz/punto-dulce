const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'iJVPrLH5ZtVbQ3Z.root',
  password: 'E0iCheMTH8EFr2qL',
  database: 'punto_dulce',

  ssl: {
    minVersion: 'TLSv1.2'
  },

  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
