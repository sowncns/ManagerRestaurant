"""
Module 01 — Customer Auth (API integration tests).
Mỗi test map tới Test Case ID trong docs/testcases/01-customer-auth.md.

Chỉ hiện thực các case kiểm được qua API thuần. Các case cần truy cập DB / đọc
email / token xác thực / PayOS được đánh dấu skip kèm lý do (không giả vờ pass).
"""
import uuid
import pytest
from conftest import DEFAULT_PASSWORD, unique_email

AUTH = "/customer/auth"


# ---------------- 1.1 Register — Happy Path ----------------

def test_register_happy(base_url, client):
    """TC-CAUTH-001: đăng ký thành công, không trả password."""
    email = unique_email()
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "Nguyễn Văn A", "email": email, "password": DEFAULT_PASSWORD})
    assert r.status_code == 201, r.text
    body = r.json()
    dump = str(body).lower()
    assert "password" not in dump and DEFAULT_PASSWORD not in dump, "Rò rỉ password trong response"
    assert body.get("email_verified") in (False, None) or body.get("body", {}).get("email_verified") is False


# ---------------- 1.2 Register — Validation ----------------

@pytest.mark.parametrize("payload,tc", [
    ({"email": unique_email(), "password": DEFAULT_PASSWORD}, "TC-CAUTH-005 thiếu full_name"),
    ({"full_name": "", "email": unique_email(), "password": DEFAULT_PASSWORD}, "TC-CAUTH-006 full_name rỗng"),
    ({"full_name": "A", "password": DEFAULT_PASSWORD}, "TC-CAUTH-008 thiếu email"),
    ({"full_name": "A", "email": "abc", "password": DEFAULT_PASSWORD}, "TC-CAUTH-009 email sai format"),
    ({"full_name": "A", "email": "a@", "password": DEFAULT_PASSWORD}, "TC-CAUTH-010 email thiếu domain"),
    ({"full_name": "A", "email": unique_email()}, "TC-CAUTH-012 thiếu password"),
    ({"full_name": "A", "email": unique_email(), "password": "12345"}, "TC-CAUTH-013 password 5 ký tự"),
    ({}, "TC-CAUTH-023 body rỗng"),
])
def test_register_validation_400(base_url, client, payload, tc):
    r = client.post(f"{base_url}{AUTH}/register", json=payload)
    assert r.status_code == 400, f"{tc}: kỳ vọng 400, nhận {r.status_code} {r.text}"


def test_register_password_min_boundary(base_url, client):
    """TC-CAUTH-014: password đúng 6 ký tự (min) -> 201."""
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "A", "email": unique_email(), "password": "123456"})
    assert r.status_code == 201, r.text


def test_register_unicode_name(base_url, client):
    """TC-CAUTH-017: tên tiếng Việt có dấu lưu được."""
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "Đặng Thị Ánh Tuyết", "email": unique_email(), "password": DEFAULT_PASSWORD})
    assert r.status_code == 201, r.text


def test_register_sqli_email_rejected(base_url, client):
    """TC-CAUTH-020: email chứa SQLi bị từ chối (sai format), không 500."""
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "A", "email": "a'; DROP TABLE customers;--@x.com", "password": DEFAULT_PASSWORD})
    assert r.status_code == 400, r.text


def test_register_mass_assignment_ignored(base_url, client):
    """TC-CAUTH-025: field lạ (role/points) bị bỏ qua, không leo thang."""
    email = unique_email()
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "A", "email": email, "password": DEFAULT_PASSWORD,
                          "role": "admin", "points": 999999, "rank": "platinum"})
    assert r.status_code == 201, r.text
    body = str(r.json()).lower()
    assert "999999" not in body and "platinum" not in body


# ---------------- 1.3 Register — Duplicate ----------------

def test_register_duplicate_email(base_url, client, register_customer):
    """TC-CAUTH-026: email trùng -> 400 'Email đã được sử dụng'."""
    cust = register_customer()
    r = client.post(f"{base_url}{AUTH}/register",
                    json={"full_name": "A", "email": cust["email"], "password": DEFAULT_PASSWORD})
    assert r.status_code == 400, r.text
    assert "sử dụng" in r.text or "email" in r.text.lower()


# ---------------- 1.4 Login — Happy & Business ----------------

def test_login_happy(base_url, client, register_customer):
    """TC-CAUTH-030: login đúng -> access/refresh token + customer."""
    cust = register_customer()
    r = client.post(f"{base_url}{AUTH}/login", json={"email": cust["email"], "password": cust["password"]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("accessToken") and data.get("refreshToken")
    assert "password" not in str(data.get("customer", {})).lower()


def test_login_wrong_password_generic(base_url, client, register_customer):
    """TC-CAUTH-031: sai mật khẩu -> 400 thông báo chung."""
    cust = register_customer()
    r = client.post(f"{base_url}{AUTH}/login", json={"email": cust["email"], "password": "saibet123"})
    assert r.status_code == 400, r.text
    return r.text


def test_login_unknown_email_same_message(base_url, client, register_customer):
    """TC-CAUTH-032: email không tồn tại trả thông báo GIỐNG HỆT sai pass (chống enumeration)."""
    cust = register_customer()
    wrong_pass = client.post(f"{base_url}{AUTH}/login",
                             json={"email": cust["email"], "password": "saibet123"})
    unknown = client.post(f"{base_url}{AUTH}/login",
                          json={"email": unique_email(), "password": "saibet123"})
    assert wrong_pass.status_code == unknown.status_code == 400
    assert wrong_pass.json().get("message") == unknown.json().get("message"), "Thông báo khác nhau -> lộ tài khoản tồn tại"


@pytest.mark.parametrize("payload,tc", [
    ({"email": unique_email()}, "TC-CAUTH-036 thiếu password"),
    ({"email": "abc", "password": DEFAULT_PASSWORD}, "TC-CAUTH-037 email sai format"),
])
def test_login_validation_400(base_url, client, payload, tc):
    r = client.post(f"{base_url}{AUTH}/login", json=payload)
    assert r.status_code == 400, f"{tc}: {r.status_code} {r.text}"


def test_login_sqli_no_bypass(base_url, client, register_customer):
    """TC-CAUTH-038: password SQLi không bypass được."""
    cust = register_customer()
    r = client.post(f"{base_url}{AUTH}/login", json={"email": cust["email"], "password": "' OR '1'='1"})
    assert r.status_code == 400, r.text


# ---------------- 1.6 Refresh Token ----------------

def test_refresh_happy(base_url, client, logged_in_customer):
    """TC-CAUTH-044: refresh token hợp lệ -> token mới."""
    r = client.post(f"{base_url}{AUTH}/refresh-token",
                    json={"refreshToken": logged_in_customer["refreshToken"]})
    assert r.status_code == 200, r.text
    assert r.json().get("accessToken")


def test_refresh_missing_token(base_url, client):
    """TC-CAUTH-045: thiếu refresh token -> 400."""
    r = client.post(f"{base_url}{AUTH}/refresh-token", json={})
    assert r.status_code == 400, r.text


def test_refresh_invalid_token(base_url, client):
    """TC-CAUTH-046: token sai chữ ký -> 401/403."""
    r = client.post(f"{base_url}{AUTH}/refresh-token", json={"refreshToken": "khong.phai.jwt"})
    assert r.status_code in (400, 401, 403), r.text


# ---------------- 1.11 Change Password ----------------

def test_change_password_happy(base_url, client, logged_in_customer):
    """TC-CAUTH-083: đổi mật khẩu đúng oldPassword -> login pass mới OK, pass cũ fail."""
    new_pass = "abcdef1"
    s_headers = {"Content-Type": "application/json",
                 "Authorization": f"Bearer {logged_in_customer['accessToken']}"}
    r = client.post(f"{base_url}{AUTH}/change-password",
                    json={"oldPassword": logged_in_customer["password"], "newPassword": new_pass},
                    headers=s_headers)
    assert r.status_code == 200, r.text
    # pass mới login được
    ok = client.post(f"{base_url}{AUTH}/login",
                     json={"email": logged_in_customer["email"], "password": new_pass})
    assert ok.status_code == 200, ok.text
    # pass cũ hỏng
    fail = client.post(f"{base_url}{AUTH}/login",
                       json={"email": logged_in_customer["email"], "password": logged_in_customer["password"]})
    assert fail.status_code == 400, fail.text


def test_change_password_wrong_old(base_url, client, logged_in_customer):
    """TC-CAUTH-084: sai oldPassword -> 400."""
    r = client.post(f"{base_url}{AUTH}/change-password",
                    json={"oldPassword": "saibet999", "newPassword": "abcdef1"},
                    headers={"Content-Type": "application/json",
                             "Authorization": f"Bearer {logged_in_customer['accessToken']}"})
    assert r.status_code == 400, r.text


def test_change_password_requires_auth(base_url, client):
    """TC-CAUTH-085: chưa đăng nhập -> 401."""
    r = client.post(f"{base_url}{AUTH}/change-password",
                    json={"oldPassword": "x", "newPassword": "abcdef1"})
    assert r.status_code == 401, r.text


def test_change_password_short_new(base_url, client, logged_in_customer):
    """TC-CAUTH-086: newPassword < 6 -> 400."""
    r = client.post(f"{base_url}{AUTH}/change-password",
                    json={"oldPassword": logged_in_customer["password"], "newPassword": "12345"},
                    headers={"Content-Type": "application/json",
                             "Authorization": f"Bearer {logged_in_customer['accessToken']}"})
    assert r.status_code == 400, r.text


# ---------------- 1.8/1.9/1.10 — cần DB/email token: skip có lý do ----------------

def test_forgot_password_always_ok(base_url, client, register_customer):
    """TC-CAUTH-055/056: forgot luôn trả ok (không lộ email tồn tại). Kiểm phần API được."""
    cust = register_customer()
    exists = client.post(f"{base_url}{AUTH}/forgot-password", json={"email": cust["email"]})
    unknown = client.post(f"{base_url}{AUTH}/forgot-password", json={"email": unique_email()})
    assert exists.status_code == unknown.status_code == 200
    assert exists.json().get("message") == unknown.json().get("message")


@pytest.mark.skip(reason="TC-CAUTH-061: cần đọc reset token từ DB/email — chạy ở tầng integration có DB")
def test_reset_password_happy():
    ...


@pytest.mark.skip(reason="TC-CAUTH-070: cần verify token từ DB/email — chạy ở tầng integration có DB")
def test_verify_email_happy():
    ...


@pytest.mark.skip(reason="TC-CAUTH-039: rate limit phụ thuộc cấu hình môi trường, chạy riêng để không nhiễu")
def test_login_rate_limit_429():
    ...


# ---------------- 1.12 Security ----------------

def test_tampered_jwt_rejected(base_url, client, logged_in_customer):
    """TC-CAUTH-090: sửa payload token -> 401 khi gọi endpoint cần auth."""
    tok = logged_in_customer["accessToken"]
    parts = tok.split(".")
    if len(parts) == 3:
        parts[1] = parts[1][:-2] + ("AA" if not parts[1].endswith("AA") else "BB")
    tampered = ".".join(parts)
    r = client.post(f"{base_url}{AUTH}/change-password",
                    json={"oldPassword": "x", "newPassword": "abcdef1"},
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {tampered}"})
    assert r.status_code == 401, r.text
