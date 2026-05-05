const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: [true, "Worker ID is required"],
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    time: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["present"],
      default: "present",
    },
    marked_by: {
      type: String,
      enum: ["face_recognition", "manual"],
      default: "face_recognition",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
  }
);

// One attendance record per worker per day
attendanceSchema.index({ worker_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
