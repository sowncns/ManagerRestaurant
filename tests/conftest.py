"""
Fixtures dùng chung cho bộ test API NhaHang / iGourmet.

Chạy backend trước (mặc định http://localhost:5000/api), rồi:
    cd tests
    pip install -r requirements.txt
    pytest -v

Đổi target: đặt biến môi trường API_BASE_URL (vd test/staging).

LƯU Ý: các endpoint auth có rate limit (authLimiter). Nếu chạy nhiều lần liên tiếp
gặp 429, chạy với môi trường test đã nới limit hoặc chờ hết window.
"""
import os
import uuid
import requests
import pytest

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000/api").rstrip("/")
DEFAULT_PASSWORD = "123456"


def unique_email() -> str:
    """Email duy nhất mỗi lần để tránh đụng ràng buộc trùng."""
    return f"qa_{uuid.uuid4().hex[:12]}@test.local"


@pytest.fixture(scope="session")
def base_url() -> str:
    return API_BASE_URL


@pytest.fixture()
def client() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()


@pytest.fixture()
def register_customer(base_url, client):
    """Đăng ký 1 khách mới, trả về dict thông tin đăng nhập."""
    def _register(email=None, password=DEFAULT_PASSWORD, full_name="QA Nguyễn Văn A"):
        email = email or unique_email()
        r = client.post(
            f"{base_url}/customer/auth/register",
            json={"full_name": full_name, "email": email, "password": password},
        )
        assert r.status_code == 201, f"Đăng ký thất bại: {r.status_code} {r.text}"
        return {"email": email, "password": password, "body": r.json()}
    return _register


@pytest.fixture()
def logged_in_customer(base_url, client, register_customer):
    """Khách đã đăng ký + đăng nhập; trả token + email/password."""
    cust = register_customer()
    r = client.post(
        f"{base_url}/customer/auth/login",
        json={"email": cust["email"], "password": cust["password"]},
    )
    assert r.status_code == 200, f"Login thất bại: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": cust["email"],
        "password": cust["password"],
        "accessToken": data["accessToken"],
        "refreshToken": data["refreshToken"],
        "customer": data.get("customer"),
    }


@pytest.fixture()
def auth_client(base_url, logged_in_customer):
    """Session gắn sẵn Bearer token của khách vừa đăng nhập."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {logged_in_customer['accessToken']}",
    })
    s._customer = logged_in_customer  # tiện lấy lại email/password trong test
    yield s
    s.close()
