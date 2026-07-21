// Ma doi voucher ngan, ngau nhien (khong doan duoc). Bo cac ky tu de nham (O,0,I,1).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 ky tu

function genRedeemCode(len = 8) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

module.exports = { genRedeemCode };
