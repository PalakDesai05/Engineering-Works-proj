const express = require("express");
const router = express.Router();
const { addWorker, getWorkers, getWorkerById, updateWorker, deleteWorker } = require("../controllers/workerController");

// GET    /api/workers          – list workers (search, page, limit, active)
router.get("/", getWorkers);

// GET    /api/workers/:id      – single worker
router.get("/:id", getWorkerById);

// POST   /api/workers          – create worker (multipart: photo)
router.post("/", addWorker);

// PUT    /api/workers/:id      – update worker (multipart: photo optional)
router.put("/:id", updateWorker);

// DELETE /api/workers/:id      – delete worker
router.delete("/:id", deleteWorker);

module.exports = router;
