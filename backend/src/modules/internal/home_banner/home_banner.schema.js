// src/modules/internal/home_banner/home_banner.schema.js
const { z } = require("zod");

// type 1 = slide, 2 = "Hom nay an gi"
const createBannerSchema = z.object({
  image_url: z.string().trim().url("URL ảnh không hợp lệ"),
  type: z.coerce.number().int().refine((v) => v === 1 || v === 2, {
    message: "Loại phải là 1 (slide) hoặc 2 (hôm nay ăn gì)",
  }),
});

module.exports = { createBannerSchema };
