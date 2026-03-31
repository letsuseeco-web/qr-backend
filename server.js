import express from "express";
import cors from "cors";

// ROUTES
import settingsRoutes from "./routes/settings.js";
import batchesRoutes from "./routes/batches.js";
import qrRoutes from "./routes/qrcodes.js";
import logsRoutes from "./routes/logs.js";
import systemLogs from "./routes/systemlogs.js";
import usersRoutes from "./routes/users.js";
import scanRoutes from "./routes/scan.js";

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors({
  origin: "*"   // production me specific domain karenge
}));

app.use(express.json());

/* ================= TEST ROUTE ================= */

app.get("/", (req, res) => {
  res.send("QR Backend Running 🚀");
});

/* ================= API ROUTES ================= */

app.use("/api/settings", settingsRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/qrcodes", qrRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/system-logs", systemLogs);
app.use("/api/users", usersRoutes);
app.use("/api/scan", scanRoutes);

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message
  });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});