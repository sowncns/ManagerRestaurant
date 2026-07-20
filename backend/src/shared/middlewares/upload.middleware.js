
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : "";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + safeExt);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("Chỉ cho phép tải lên ảnh JPG/PNG/WEBP/GIF"), false);
  },
});

// Kiem tra "magic bytes" (chu ky dau file) de xac nhan file THAT su la anh,
// chong truong hop doi duoi/MIME header de lot qua fileFilter (vd .php doi thanh .jpg).
// Doc vai byte dau cua file da luu tren dia; neu khong khop -> xoa file + bao loi.
function sniffImage(buf) {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // GIF: "GIF87a" hoac "GIF89a"
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")
    return "image/gif";
  // WEBP: "RIFF"...."WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

function readHeader(filePath, size = 12) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

// Middleware chay SAU upload.single/array de xac thuc noi dung file.
function verifyImageContent(req, res, next) {
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];
  for (const f of files) {
    try {
      const detected = sniffImage(readHeader(f.path));
      if (!detected || !ALLOWED_MIME.has(detected)) {
        for (const g of files) fs.unlink(g.path, () => {}); // xoa toan bo file cua request
        return next(new Error("File tải lên không phải ảnh hợp lệ"));
      }
    } catch {
      return next(new Error("Không đọc được file tải lên"));
    }
  }
  next();
}

module.exports = { upload, verifyImageContent };
