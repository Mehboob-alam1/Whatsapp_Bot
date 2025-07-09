const { V2 } = require("cloudinary");
const cloudinary = V2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (file) => {
  try {
    const url = await cloudinary.uploader.upload(file);
    return url.secure_url;
  } catch (error) {
    console.log(error);
  }
};

const deleteFile = async (file) => {
  try {
    await cloudinary.uploader.destroy(file);
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};
