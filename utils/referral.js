import pool from "../config/db.js";

// ✅ readable code generator
function generateReadableCode(name, phone) {
  const prefix = (name || "USR")
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "X");

  const last4 = (phone || "0000").slice(-4);

  const random = Math.floor(10 + Math.random() * 90);

  return `${prefix}${last4}${random}`;
}

// ✅ unique code generator
export async function getUniqueReferralCode(name, phone) {
  let code;
  let exists = true;

  while (exists) {
    code = generateReadableCode(name, phone);

    const [rows] = await pool.query(
      "SELECT id FROM ReferralUsers WHERE referralCode = ?",
      [code]
    );

    if (rows.length === 0) {
      exists = false;
    }
  }

  return code;
}