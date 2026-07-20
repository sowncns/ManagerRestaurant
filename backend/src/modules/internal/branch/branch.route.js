// src/modules/internal/branch/branch.route.js
const express = require("express");
const controller = require("./branch.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createBranchSchema, updateBranchSchema, changeStatusSchema } = require("./branch.schema");

const router = express.Router();

const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");
router.use(requireAuth, managerOnly);

router.get("/", controller.listBranches);
router.get("/:id", controller.getBranch);
router.post("/", validate(createBranchSchema), controller.createBranch);
router.put("/:id", validate(updateBranchSchema), controller.updateBranch);
router.patch("/:id/status", validate(changeStatusSchema), controller.changeStatus);
router.delete("/:id", controller.deleteBranch);

module.exports = router;
