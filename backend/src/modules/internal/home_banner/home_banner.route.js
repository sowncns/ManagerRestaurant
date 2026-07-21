// src/modules/internal/home_banner/home_banner.route.js
// Mount tai /api/internal/home-banners. Chi SUPER_ADMIN.
const express = require("express");
const controller = require("./home_banner.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createBannerSchema } = require("./home_banner.schema");

const router = express.Router();
router.use(requireAuth, authorize("SUPER_ADMIN"));

router.get("/", controller.list);
router.post("/", validate(createBannerSchema), controller.create);
router.delete("/:id", controller.remove);

module.exports = router;
