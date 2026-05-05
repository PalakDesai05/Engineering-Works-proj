const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  downloadQuotationPDF,
  generateQuotationDirect,
} = require("../controllers/quotationController");

// POST   /api/quotation/generate   – instant PDF, no DB save
router.post("/generate", generateQuotationDirect);

// GET    /api/quotation            – list quotations
router.get("/", getQuotations);

// GET    /api/quotation/:id        – single quotation
router.get("/:id", getQuotationById);

// GET    /api/quotation/:id/pdf    – generate PDF from saved quotation
router.get("/:id/pdf", downloadQuotationPDF);

// POST   /api/quotation            – create & save quotation
router.post("/", createQuotation);

// PUT    /api/quotation/:id        – update quotation
router.put("/:id", updateQuotation);

// DELETE /api/quotation/:id        – delete quotation
router.delete("/:id", deleteQuotation);

module.exports = router;
