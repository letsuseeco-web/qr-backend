import pool from "../config/db.js"

export async function logAction(admin, action, module, details, ip) {
  try {

    await pool.query(`
      INSERT INTO SystemLogs
      (adminName, action, module, details, ipAddress)
      VALUES (?, ?, ?, ?, ?)
    `, [admin, action, module, details, ip])

  } catch (err) {
    console.log("Log Error:", err)
  }
}