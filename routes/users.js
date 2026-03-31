import express from "express"
import pool from "../config/db.js"

const router = express.Router()

/* =========================
   GET USERS (SEARCH + PAGINATION)
========================= */

router.get("/", async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const searchName = req.query.name || ""
    const searchPhone = req.query.phone || ""

    const offset = (page - 1) * limit

    const [rows] = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.createdDate,

        COUNT(q.id) as totalQR,

        SUM(CASE WHEN q.status='Activated' THEN 1 ELSE 0 END) as activeQR,
        SUM(CASE WHEN q.status='Lost' THEN 1 ELSE 0 END) as lostQR

      FROM Users u
      LEFT JOIN QRCodes q ON u.id = q.userId

      WHERE 
        (? = '' OR u.name LIKE ?)
        AND
        (? = '' OR u.phone LIKE ?)

      GROUP BY u.id,u.name,u.phone,u.createdDate
      ORDER BY u.id DESC

      LIMIT ? OFFSET ?
    `, [
      searchName, `%${searchName}%`,
      searchPhone, `%${searchPhone}%`,
      limit, offset
    ])

    res.json(rows)

  } catch (err) {
    console.error("ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/* =========================
   TOTAL COUNT
========================= */

router.get("/count", async (req, res) => {
  try {

    const searchName = req.query.name || ""
    const searchPhone = req.query.phone || ""

    const [rows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM Users
      WHERE 
        (? = '' OR name LIKE ?)
        AND
        (? = '' OR phone LIKE ?)
    `, [
      searchName, `%${searchName}%`,
      searchPhone, `%${searchPhone}%`
    ])

    res.json(rows[0])

  } catch (err) {
    console.error("COUNT ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/* =========================
   USER DETAILS
========================= */

router.get("/:id", async (req, res) => {
  try {

    const { id } = req.params

    // USER
    const [userResult] = await pool.query(
      "SELECT * FROM Users WHERE id = ?",
      [id]
    )

    const user = userResult[0]

    // QR CODES
    const [qrResult] = await pool.query(`
      SELECT
        qrCode,
        batchNo,
        status,
        tag,
        vehicle,
        activationDate,
        createdDate,
        pin,
        lostMessage,
        reward,
        lostContact,
        lostDate
      FROM QRCodes
      WHERE userId = ?
      ORDER BY id DESC
    `, [id])

    // CONTACTS
    const [contactResult] = await pool.query(`
      SELECT
        name,
        relation,
        phone,
        qrCodes
      FROM EmergencyContacts
      WHERE userId = ?
    `, [id])

    // REWARDS
    const [rewardsResult] = await pool.query(`
      SELECT id, rewardNumber, status
      FROM ReferralRewards
      WHERE userId = ?
      ORDER BY rewardNumber ASC
    `, [id])

    // REFERRALS
    const [refUser] = await pool.query(
      "SELECT referralCode FROM ReferralUsers WHERE userId = ?",
      [id]
    )

    let referrals = []

    if (refUser.length > 0) {
      const code = refUser[0].referralCode

      const [refResult] = await pool.query(`
        SELECT u.id, u.name, u.phone
        FROM ReferralUsers r
        JOIN Users u ON r.userId = u.id
        WHERE r.referredByCode = ?
      `, [code])

      referrals = refResult
    }

    res.json({
      user: user || null,
      qrCodes: qrResult || [],
      contacts: contactResult || [],
      rewards: rewardsResult || [],
      referrals: referrals || []
    })

  } catch (err) {
    console.error("DETAIL ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router