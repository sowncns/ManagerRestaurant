// src/modules/customer/reservation/reservation.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./reservation.service");
const { parseId } = require("../../../shared/utils/parseId");

exports.create = asyncHandler(async (req, res) => {
  const reservation = await service.create(req.user.id, req.body);
  res.status(201).json({ message: "Đặt bàn thành công. Nhà hàng sẽ xếp bàn khi bạn đến.", reservation });
});

exports.list = asyncHandler(async (req, res) => {
  const reservations = await service.list(req.user.id);
  res.json({ message: "Lấy danh sách đặt bàn thành công", reservations });
});

exports.get = asyncHandler(async (req, res) => {
  const reservation = await service.get(req.user.id, parseId(req.params.id, "reservation id"));
  res.json({ message: "Lấy phiếu đặt bàn thành công", reservation });
});

exports.cancel = asyncHandler(async (req, res) => {
  const reservation = await service.cancel(req.user.id, parseId(req.params.id, "reservation id"));
  res.json({ message: "Đã hủy phiếu đặt bàn", reservation });
});
