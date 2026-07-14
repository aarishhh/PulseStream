import multer from "multer";

// We will use MemoryStorage so that we receive file buffers directly
// which can be streamed directly to Cloudinary without writing files to local disk
const storage = multer.memoryStorage();

// Accept standard image types up to 5MB
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  }
});
