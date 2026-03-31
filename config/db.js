import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "gondola.proxy.rlwy.net",
  user: "root",
  password: "juKXHTjqeuRufiukuHCWcfyPbGafogIq",
  database: "railway",
  port: 14066
});

export default pool;