const axios = require("axios");
const FormData = require("form-data");

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://localhost:8000";

/**
 * Identify a worker from an image buffer via the Python face service.
 * @param {Buffer} imageBuffer
 * @param {string} originalname
 * @returns {Promise<{worker_id: string, confidence: number}>}
 */
const recognizeFace = async (imageBuffer, originalname = "face.jpg") => {
  const form = new FormData();
  form.append("image", imageBuffer, { filename: originalname, contentType: "image/jpeg" });

  let response;
  try {
    response = await axios.post(`${FACE_SERVICE_URL}/recognize`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      throw new Error("Face recognition service is unavailable. Please try again later.");
    }
    const msg = err.response?.data?.detail || err.response?.data?.error || "Face recognition failed";
    throw new Error(msg);
  }

  const { worker_id, confidence } = response.data;
  if (!worker_id) throw new Error("No matching worker found for the provided face");
  return { worker_id: String(worker_id), confidence: confidence ?? null };
};

/**
 * Register a worker's face with the Python service.
 * Accepts a full URL (http://...) pointing to the worker photo.
 * Non-fatal — logs on failure.
 * @param {string} workerId
 * @param {string} imageUrl – full URL accessible by the face service
 */
const registerFace = async (workerId, imageUrl) => {
  try {
    await axios.post(
      `${FACE_SERVICE_URL}/register`,
      { worker_id: String(workerId), image_url: imageUrl },
      { timeout: 20000 }
    );
    console.log(`[FaceService] Registered face for worker ${workerId}`);
  } catch (err) {
    console.warn(`[FaceService] Could not register face for worker ${workerId}: ${err.message}`);
  }
};

/**
 * Delete a worker's face embedding from the Python service.
 * Non-fatal — logs on failure.
 * @param {string} workerId
 */
const deleteFace = async (workerId) => {
  try {
    await axios.delete(`${FACE_SERVICE_URL}/workers/${workerId}`, { timeout: 10000 });
    console.log(`[FaceService] Deleted face for worker ${workerId}`);
  } catch (err) {
    console.warn(`[FaceService] Could not delete face for worker ${workerId}: ${err.message}`);
  }
};

module.exports = { recognizeFace, registerFace, deleteFace };
