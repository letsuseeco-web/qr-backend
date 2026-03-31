import express from "express";
import pool from "../config/db.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

/* ================= GET SETTINGS ================= */

router.get("/", async (req, res) => {
  try {

    const [rows] = await pool.query(
      "SELECT * FROM SystemSettings WHERE id=1"
    );

    res.json(rows[0] || {});

  } catch (err) {
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

/* ================= SAVE SETTINGS ================= */

router.post(
  "/save",
  [
    body("qrLength").isInt({ min: 4, max: 20 }),
    body("pinLength").isInt({ min: 4, max: 10 }),
    body("maxBatch").isInt({ min: 1, max: 5000 }),
    body("activationAttempts").isInt({ min: 1, max: 10 }),
    body("supportEmail").optional().isEmail(),

    body("referralRequired").optional().isInt({ min: 0, max: 50 }),
    body("referralRewardValue").optional().isInt({ min: 0, max: 1000 }),
    body("referralRewardType")
      .optional()
      .isIn(["sticker", "points"]),
  ],

  async (req, res) => {

    try {

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array()
        });
      }

      const s = req.body;

      if (!s.referralEnabled) {
        s.referralRequired = 0;
        s.referralRewardValue = 0;
      }

      await pool.query(`
        UPDATE SystemSettings SET

        systemName=?,
        tagline=?,
        supportEmail=?,
        supportPhone=?,
        supportWhatsapp=?,
        website=?,
        timezone=?,

        qrLength=?,
        pinLength=?,
        qrUrl=?,
        activationAttempts=?,

        showBlood=?,
        showMedical=?,
        showAllergy=?,
        showContacts=?,

        lostMode=?,
        allowReward=?,
        maxReward=?,
        lostMessage=?,

        maxBatch=?,
        maxUserQR=?,
        maxContacts=?,

        maintenance=?,
        debug=?,

        stickerTitle=?,
        stickerLine1=?,
        stickerLine2=?,
        stickerWebsite=?,
        stickerFooter=?,
        stickerLeftBrand=?,
        stickerRightBrand=?,

        referralEnabled=?,
        referralRewardType=?,
        referralRequired=?,
        referralRewardValue=?

        WHERE id=1
      `, [
        s.systemName?.trim() || "",
        s.tagline?.trim() || "",
        s.supportEmail?.trim() || "",
        s.supportPhone?.trim() || "",
        s.supportWhatsapp?.trim() || "",
        s.website?.trim() || "",
        s.timezone || "Asia/Kolkata",

        s.qrLength,
        s.pinLength,
        s.qrUrl?.trim() || "",
        s.activationAttempts,

        s.showBlood ? 1 : 0,
        s.showMedical ? 1 : 0,
        s.showAllergy ? 1 : 0,
        s.showContacts ? 1 : 0,

        s.lostMode ? 1 : 0,
        s.allowReward ? 1 : 0,
        s.maxReward ?? 0,
        s.lostMessage?.trim() || "",

        s.maxBatch,
        s.maxUserQR ?? 10,
        s.maxContacts ?? 3,

        s.maintenance ? 1 : 0,
        s.debug ? 1 : 0,

        s.stickerTitle?.trim() || "",
        s.stickerLine1?.trim() || "",
        s.stickerLine2?.trim() || "",
        s.stickerWebsite?.trim() || "",
        s.stickerFooter?.trim() || "",
        s.stickerLeftBrand?.trim() || "",
        s.stickerRightBrand?.trim() || "",

        s.referralEnabled ? 1 : 0,
        s.referralRewardType ?? "sticker",
        s.referralRequired ?? 0,
        s.referralRewardValue ?? 0
      ]);

      res.json({ success: true });

    } catch (err) {
      res.status(500).json({
        error: "Server error",
        details: err.message
      });
    }
  }
);

/* ================= REFERRAL USERS ================= */

router.get("/referral-users", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT 
        r.userId,
        r.referralCode,
        r.referralCount,
        u.name,
        u.phone
      FROM ReferralUsers r
      JOIN Users u ON r.userId = u.id
      ORDER BY r.userId DESC
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= REFERRAL DETAILS ================= */

router.get("/admin/referrals/:userId", async (req, res) => {
  try {

    const { userId } = req.params;

    const [refUser] = await pool.query(
      "SELECT * FROM ReferralUsers WHERE userId=?",
      [userId]
    );

    if (refUser.length === 0) {
      return res.json({ error: "Not found" });
    }

    const referralCode = refUser[0].referralCode;

    const [referrals] = await pool.query(`
      SELECT u.id, u.name, u.phone, u.createdDate
      FROM ReferralUsers r
      JOIN Users u ON r.userId = u.id
      WHERE r.referredByCode = ?
    `, [referralCode]);

    const [rewards] = await pool.query(`
      SELECT * FROM ReferralRewards
      WHERE userId = ?
      ORDER BY rewardNumber ASC
    `, [userId]);

    res.json({
      user: refUser[0],
      referrals,
      rewards
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= UPDATE REWARD ================= */

router.post("/admin/reward/update", async (req, res) => {
  try {

    const {
      rewardId,
      status,
      qrCode,
      courierName,
      trackingNumber
    } = req.body;

    let query = "UPDATE ReferralRewards SET status=?"
    let params = [status]

    if (qrCode !== undefined) {
      query += ", qrCode=?"
      params.push(qrCode)
    }

    if (courierName !== undefined) {
      query += ", courierName=?"
      params.push(courierName)
    }

    if (trackingNumber !== undefined) {
      query += ", trackingNumber=?"
      params.push(trackingNumber)
    }

    if (status === "called") query += ", calledAt=NOW()"
    if (status === "preparing") query += ", preparingAt=NOW()"
    if (status === "dispatched") query += ", dispatchedAt=NOW()"
    if (status === "delivered") query += ", deliveredAt=NOW()"
    if (status === "activation_called") query += ", activationCalledAt=NOW()"
    if (status === "activated") query += ", activatedAt=NOW()"

    query += " WHERE id=?"
    params.push(rewardId)

    await pool.query(query, params)

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= ALL REWARDS ================= */

router.get("/admin/rewards", async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT 
        r.*, 
        u.name, 
        u.phone
      FROM ReferralRewards r
      JOIN Users u ON u.id = r.userId
      ORDER BY r.createdAt DESC
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= SINGLE REWARD ================= */

router.get("/admin/reward/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        r.*, 
        u.name, 
        u.phone
      FROM ReferralRewards r
      JOIN Users u ON u.id = r.userId
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;