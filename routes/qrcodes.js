import express from "express"
import pool from "../config/db.js"

const router = express.Router()

/* GET QR CODES */

router.get("/", async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const search = req.query.search || ""
    const status = req.query.status || ""

    let where = "WHERE 1=1"
    let params = []

    if (search) {
      where += " AND qrCode LIKE ?"
      params.push(`%${search}%`)
    }

    if (status) {
      where += " AND status = ?"
      params.push(status)
    }

    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM QRCodes ${where}`,
      params
    )

    const [rows] = await pool.query(
      `SELECT 
        qrCode,
        pin,
        batchNo,
        status,
        userId,
        tag,
        vehicle,
        createdDate,
        lostMessage,
        reward,
        lostContact,
        lostDate
       FROM QRCodes
       ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    )

    res.json({
      data: rows,
      total: totalResult[0].total
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message })
  }
})

/* ACTIVATE QR */

router.post("/activate/:qr", async (req, res) => {
  try {

    const { qr } = req.params
    const { userName, phone, tag, vehicle } = req.body

    await pool.query(
      `UPDATE QRCodes
       SET status='Activated', tag=?, vehicle=?
       WHERE qrCode=?`,
      [tag, vehicle, qr]
    )

    const [batch] = await pool.query(
      `SELECT batchNo FROM QRCodes WHERE qrCode=?`,
      [qr]
    )

    const batchNo = batch[0]?.batchNo

    await pool.query(
      `INSERT INTO ActivationLogs
       (qrCode,batchNo,userName,phone,tag,vehicle,activatedBy)
       VALUES (?,?,?,?,?,?,?)`,
      [qr, batchNo, userName, phone, tag, vehicle, "User"]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* RESET QR */

router.post("/reset/:qr", async (req, res) => {
  try {

    const { qr } = req.params

    await pool.query(
      `UPDATE QRCodes
       SET status='Unused', userId=NULL, tag=NULL, vehicle=NULL
       WHERE qrCode=?`,
      [qr]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* DISABLE QR */

router.post("/disable/:qr", async (req, res) => {
  try {

    const { qr } = req.params

    await pool.query(
      `UPDATE QRCodes SET status='Disabled' WHERE qrCode=?`,
      [qr]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ENABLE QR */

router.post("/enable/:qr", async (req, res) => {
  try {

    const { qr } = req.params

    await pool.query(
      `UPDATE QRCodes SET status='Activated' WHERE qrCode=?`,
      [qr]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* QR SCAN */

router.get("/scan/:qr", async (req, res) => {
  try {

    const { qr } = req.params

    await pool.query(
      `INSERT INTO ScanLogs (qrCode,scanMode,city,device)
       VALUES (?,?,?,?)`,
      [qr, "Normal", "Unknown", "Web"]
    )

    const [result] = await pool.query(
      `SELECT * FROM QRCodes WHERE qrCode=?`,
      [qr]
    )

    res.json(result[0])

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* LOST MODE */

router.post("/lost/:qr", async (req, res) => {
  try {

    const { qr } = req.params
    const { userName, phone, reward } = req.body

    await pool.query(
      `UPDATE QRCodes SET status='Lost' WHERE qrCode=?`,
      [qr]
    )

    await pool.query(
      `INSERT INTO LostLogs (qrCode,userName,phone,reward,status)
       VALUES (?,?,?,?,?)`,
      [qr, userName, phone, reward, "Active"]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* REMOVE LOST */

router.post("/remove-lost/:qr", async (req, res) => {
  try {

    const { qr } = req.params

    await pool.query(
      `UPDATE LostLogs SET status='Recovered' WHERE qrCode=?`,
      [qr]
    )

    await pool.query(
      `UPDATE QRCodes SET status='Activated' WHERE qrCode=?`,
      [qr]
    )

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router