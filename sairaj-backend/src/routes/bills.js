const express = require("express");
const router = express.Router();
const { createBill, getBills, getBillById, updateBill, deleteBill, downloadBillPDF, generateBillDirect } = require("../controllers/billController");

// POST   /api/bill/generate   – generate PDF instantly (no DB save)
router.post("/generate", generateBillDirect);

// GET    /api/bill            – list bills (search, page, limit)
router.get("/", getBills);

// GET    /api/bill/:id        – single bill
router.get("/:id", getBillById);

// GET    /api/bill/:id/pdf    – generate & download PDF from saved bill
router.get("/:id/pdf", downloadBillPDF);

// POST   /api/bill            – create & save bill
router.post("/", createBill);

// PUT    /api/bill/:id        – update bill
router.put("/:id", updateBill);

// DELETE /api/bill/:id        – delete bill
router.delete("/:id", deleteBill);

module.exports = router;
