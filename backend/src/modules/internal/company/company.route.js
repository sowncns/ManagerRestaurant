// src/modules/internal/company/company.route.js
// Mount tai /api/internal/companies
const express = require("express");
const controller = require("./company.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createCompanySchema, updateCompanySchema } = require("./company.schema");

const router = express.Router();

// Chi SUPER_ADMIN & COMPANY_ADMIN. Pham vi cong ty duoc siet o tang service.
const adminOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN");
router.use(requireAuth, adminOnly);

router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", validate(createCompanySchema), controller.create); // service chan COMPANY_ADMIN
router.put("/:id", validate(updateCompanySchema), controller.update);

module.exports = router;
