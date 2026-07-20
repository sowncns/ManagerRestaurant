// src/modules/customer/voucher/voucher.service.js
const repo = require("./voucher.repository");

exports.getVouchersByCustomerId = (customerId) => repo.findUsableByCustomer(customerId);
