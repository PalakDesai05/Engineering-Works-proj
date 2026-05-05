const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 0 },
    unit:        { type: String, trim: true, default: "pcs" },
    unit_price:  { type: Number, required: true, min: 0 },
    total:       { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotation_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    client_name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    client_address: { type: String, trim: true },
    client_phone:   { type: String, trim: true },
    date: {
      type: String,
      required: [true, "Quotation date is required"],
    },
    valid_until: { type: String },
    items: {
      type: [lineItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one item is required",
      },
    },
    subtotal:        { type: Number, required: true, min: 0 },
    tax_percent:     { type: Number, default: 18, min: 0 },
    tax_amount:      { type: Number, default: 0,  min: 0 },
    discount_amount: { type: Number, default: 0,  min: 0 },
    total_amount:    { type: Number, required: true, min: 0 },
    notes:           { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    pdf_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

quotationSchema.index({ quotation_number: 1 });
quotationSchema.index({ created_at: -1 });

module.exports = mongoose.model("Quotation", quotationSchema);
