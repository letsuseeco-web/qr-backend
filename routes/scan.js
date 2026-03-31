import express from "express"
import pool from "../config/db.js"

const router = express.Router()

router.get("/:code", async (req, res) => {
  try {

    const code = req.params.code.trim()

    /* QR FETCH */
    const [qrResult] = await pool.query(`
      SELECT qrCode, status, userId
      FROM QRCodes
      WHERE TRIM(qrCode) = ?
    `, [code])

    if (qrResult.length === 0) {
      return res.status(404).json({ success: false })
    }

    const qr = qrResult[0]

    /* UNUSED */
    if (qr.status === "Unused") {
      return res.json({ success: true, type: "unused" })
    }

    /* LOST */
    if (qr.status === "Lost") {
      return res.json({ success: true, type: "lost" })
    }

    /* ACTIVATED */

    let user = {}
    let emergencyContacts = []

    if (qr.userId) {

      /* USER FETCH */
      try {
        const [userResult] = await pool.query(`
          SELECT name, phone, blood, medical, allergy
          FROM Users
          WHERE id = ?
        `, [qr.userId])

        user = userResult[0] || {}
      } catch (err) {
        console.log("USER ERROR:", err.message)
      }

      /* CONTACT FETCH */
      try {
        const [contactResult] = await pool.query(`
          SELECT name, relation, phone
          FROM EmergencyContacts
          WHERE userId = ?
          AND qrCodes LIKE ?
        `, [qr.userId, `%${code}%`])

        emergencyContacts = contactResult || []
      } catch (err) {
        console.log("CONTACT ERROR:", err.message)
      }
    }

    return res.json({
      success: true,
      type: "active",
      data: {
        name: user.name || "Not Available",
        phone: user.phone || "",
        vehicle: null,
        tag: null,
        blood: user.blood || "",
        medical: user.medical || "",
        allergy: user.allergy || "",
        qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${code}`,
        emergencyContacts
      }
    })

  } catch (err) {
    console.error("SCAN ERROR:", err)
    res.status(500).json({ success: false })
  }
})

export default router