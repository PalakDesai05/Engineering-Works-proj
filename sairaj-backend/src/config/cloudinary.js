const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete an image from Cloudinary by public_id
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${publicId}: ${err.message}`);
  }
};

/**
 * Extract public_id from a Cloudinary URL
 * e.g. https://res.cloudinary.com/demo/image/upload/v123/workers/abc.jpg → workers/abc
 * @param {string} url
 * @returns {string|null}
 */
const extractPublicId = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const withVersion = parts[1];
    const withoutVersion = withVersion.replace(/^v\d+\//, "");
    return withoutVersion.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

module.exports = { cloudinary, deleteImage, extractPublicId };
