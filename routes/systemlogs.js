import express from "express"
import pool from "../config/db.js"

const router = express.Router()

/* GET SYSTEM LOGS */

router.get("/", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT * FROM SystemLogs
      ORDER BY id DESC
    `)

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router