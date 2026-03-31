import express from "express"
import pool from "../config/db.js"

const router = express.Router()

/* ACTIVATION LOGS */

router.get("/activations", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT * FROM ActivationLogs
      ORDER BY activationDate DESC
    `)

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* SCAN LOGS */

router.get("/scans", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT * FROM ScanLogs
      ORDER BY scanTime DESC
    `)

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* LOST LOGS */

router.get("/lost", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT * FROM LostLogs
      ORDER BY lostDate DESC
    `)

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router