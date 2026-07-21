// src/modules/internal/home_banner/home_banner.repository.js
const pool = require("../../../config/db");

exports.list = () =>
  pool
    .query(
      "SELECT banner_id AS id, image_url, type, sort_order, created_at FROM home_banners ORDER BY type, sort_order, banner_id"
    )
    .then((r) => r.rows);

exports.create = ({ image_url, type }) =>
  pool
    .query(
      "INSERT INTO home_banners (image_url, type) VALUES ($1, $2) RETURNING banner_id AS id, image_url, type, sort_order, created_at",
      [image_url, type]
    )
    .then((r) => r.rows[0]);

exports.remove = (id) =>
  pool.query("DELETE FROM home_banners WHERE banner_id = $1", [id]).then((r) => r.rowCount);
