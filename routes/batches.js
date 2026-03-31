import express from "express"
import pool from "../config/db.js"

const router = express.Router()

/* GET ALL BATCHES */

router.get("/", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT 
        b.batchNo,
        b.totalQR,

        SUM(CASE WHEN q.status = 'Activated' THEN 1 ELSE 0 END) as activated,
        SUM(CASE WHEN q.status = 'Lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN q.status = 'Unused' OR q.status IS NULL THEN 1 ELSE 0 END) as unused,

        b.createdDate

      FROM QRBatches b
      LEFT JOIN QRCodes q ON b.batchNo = q.batchNo

      GROUP BY b.batchNo, b.totalQR, b.createdDate
      ORDER BY b.createdDate DESC
    `)

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* GET QR OF BATCH */

router.get("/:batchNo", async (req, res) => {
  try {

    const { batchNo } = req.params

    const [rows] = await pool.query(`
      SELECT qrCode, pin, status, userId, createdDate
      FROM QRCodes
      WHERE batchNo = ?
      ORDER BY id
    `, [batchNo])

    res.json(rows)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* GENERATORS */

function generateQR(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generatePIN(length) {
  let min = Math.pow(10, length - 1)
  let max = Math.pow(10, length) - 1
  return Math.floor(Math.random() * (max - min) + min)
}

/* CREATE BATCH */

router.post("/create", async (req, res) => {

  const connection = await pool.getConnection()

  try {

    const { count } = req.body
    const numCount = Number(count)

    if (!numCount || numCount < 1) {
      return res.status(400).json({ error: "Minimum 1 QR required" })
    }

    /* SETTINGS */
    const [settings] = await connection.query(`
      SELECT qrLength, pinLength, maxBatch
      FROM SystemSettings WHERE id=1
    `)

    const { qrLength, pinLength, maxBatch } = settings[0]

    if (numCount > maxBatch) {
      return res.status(400).json({ error: `Max ${maxBatch} QR allowed` })
    }

    /* START TRANSACTION */
    await connection.beginTransaction()

    /* INSERT BATCH */
    const [batchInsert] = await connection.query(
      `INSERT INTO QRBatches (totalQR) VALUES (?)`,
      [numCount]
    )

    const id = batchInsert.insertId
    const batchNo = `BATCH-${String(id).padStart(4, "0")}`

    /* UPDATE batchNo */
    await connection.query(
      `UPDATE QRBatches SET batchNo=? WHERE id=?`,
      [batchNo, id]
    )

    /* GENERATE QR */
    let values = []
    let usedQR = new Set()

    for (let i = 0; i < numCount; i++) {

      let qr
      do {
        qr = generateQR(qrLength)
      } while (usedQR.has(qr))

      usedQR.add(qr)

      const pin = generatePIN(pinLength)

      values.push([qr, pin, batchNo, "Unused"])
    }

    /* BULK INSERT */
    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500)

      await connection.query(
        `INSERT INTO QRCodes (qrCode, pin, batchNo, status) VALUES ?`,
        [chunk]
      )
    }

    /* COMMIT */
    await connection.commit()

    res.json({ success: true, batchNo })

  } catch (err) {

    await connection.rollback()
    res.status(500).json({ error: err.message })

  } finally {
    connection.release()
  }
})

export default router