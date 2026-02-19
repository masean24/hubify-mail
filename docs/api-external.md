# Hubify Mail — External API Documentation

> **Base URL:** `https://mail.hubify.id/api/ext`  
> **Auth:** Header `X-API-Key: YOUR_API_KEY`  
> **Rate Limit:** 120 req/menit

Semua response pakai format:
```json
{ "success": true, "data": { ... } }
```

---

## 1. List Domain Aktif

```
GET /api/ext/domains
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "domain": "hubify.store" },
    { "id": 2, "domain": "cognexy.app" },
    { "id": 3, "domain": "mailnow.id" }
  ]
}
```

> 💡 Pakai `id` dari sini untuk param `domainId` di endpoint lain.

---

## 2. Buat Email Baru

```
POST /api/ext/inbox/create
Content-Type: application/json
```

**Body:**
| Field | Type | Required | Default |
|-------|------|:--------:|---------|
| `domainId` | number | ❌ | Random dari domain aktif |
| `localPart` | string | ❌ | Random nama manusia |
| `gender` | string | ❌ | `random` (`male` / `female` / `random`) |

**Contoh — Full random:**
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  https://mail.hubify.id/api/ext/inbox/create
```

**Contoh — Domain spesifik:**
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"domainId": 2}' \
  https://mail.hubify.id/api/ext/inbox/create
```

**Contoh — Custom email:**
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"localPart": "john.doe", "domainId": 1}' \
  https://mail.hubify.id/api/ext/inbox/create
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "sarahputri47@hubify.store",
    "localPart": "sarahputri47",
    "domain": "hubify.store",
    "domainId": 1,
    "expiresAt": "2026-02-20T15:00:00.000Z"
  }
}
```

---

## 3. Cek Inbox

```
GET /api/ext/inbox/{email}
```

**Contoh:**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://mail.hubify.id/api/ext/inbox/sarahputri47@hubify.store
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "sarahputri47@hubify.store",
    "emails": [
      {
        "id": 123,
        "from": "noreply@google.com",
        "subject": "Your verification code",
        "preview": "Your verification code is 847291...",
        "hasAttachment": false,
        "receivedAt": "2026-02-19T08:30:00.000Z"
      }
    ],
    "expiresAt": "2026-02-20T15:00:00.000Z"
  }
}
```

> Kalau inbox kosong, `emails` akan `[]`.

---

## 4. Email Terbaru

```
GET /api/ext/inbox/{email}/latest
```

**Contoh:**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://mail.hubify.id/api/ext/inbox/sarahputri47@hubify.store/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "from": "noreply@google.com",
    "subject": "Your verification code",
    "bodyText": "Your verification code is 847291. Do not share this code.",
    "bodyHtml": "<html>...</html>",
    "hasAttachment": false,
    "receivedAt": "2026-02-19T08:30:00.000Z"
  }
}
```

> Kalau belum ada email, `data` akan `null`.

---

## 5. Ambil OTP ⭐

```
GET /api/ext/inbox/{email}/otp
```

Ini endpoint paling berguna — langsung extract kode OTP/verifikasi dari email tanpa perlu parse manual. Scan dari email terbaru ke terlama.

**Contoh:**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://mail.hubify.id/api/ext/inbox/sarahputri47@hubify.store/otp
```

**Response (OTP ditemukan):**
```json
{
  "success": true,
  "data": {
    "email": "sarahputri47@hubify.store",
    "otp": "847291",
    "from": "noreply@google.com",
    "subject": "Your verification code",
    "receivedAt": "2026-02-19T08:30:00.000Z"
  }
}
```

**Response (tidak ada OTP):**
```json
{
  "success": true,
  "data": {
    "email": "sarahputri47@hubify.store",
    "otp": null,
    "from": null,
    "subject": null
  }
}
```

---

## 6. Detail Email

```
GET /api/ext/email/{id}
```

**Contoh:**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://mail.hubify.id/api/ext/email/123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "to": "sarahputri47@hubify.store",
    "from": "noreply@google.com",
    "subject": "Your verification code",
    "bodyText": "Your verification code is 847291.",
    "bodyHtml": "<html>...</html>",
    "hasAttachment": false,
    "receivedAt": "2026-02-19T08:30:00.000Z"
  }
}
```

---

## 7. Hapus Inbox

```
DELETE /api/ext/inbox/{email}
```

**Contoh:**
```bash
curl -X DELETE -H "X-API-Key: YOUR_KEY" \
  https://mail.hubify.id/api/ext/inbox/sarahputri47@hubify.store
```

**Response:**
```json
{
  "success": true,
  "message": "Inbox deleted successfully"
}
```

---

## Error Responses

| Status | Arti |
|--------|------|
| `401` | API key salah / tidak ada |
| `400` | Parameter salah (email format, domain inactive) |
| `404` | Email / inbox tidak ditemukan |
| `429` | Rate limit tercapai |
| `500` | Server error |

**Format error:**
```json
{
  "success": false,
  "error": "Invalid or missing API key. Set X-API-Key header."
}
```

---

## Flow Contoh: Register Akun → Ambil OTP

### Python
```python
import requests
import time

API = "https://mail.hubify.id/api/ext"
HEADERS = {"X-API-Key": "YOUR_KEY"}

# 1. Buat email
r = requests.post(f"{API}/inbox/create", headers=HEADERS)
email = r.json()["data"]["email"]
print(f"📧 Email: {email}")

# 2. Pakai email ini buat register di suatu website
# register_account(email)  # <-- kode register kamu

# 3. Tunggu OTP masuk (polling tiap 5 detik, max 60 detik)
otp = None
for i in range(12):
    time.sleep(5)
    r = requests.get(f"{API}/inbox/{email}/otp", headers=HEADERS)
    data = r.json()["data"]
    if data["otp"]:
        otp = data["otp"]
        print(f"🔑 OTP: {otp} (dari {data['from']})")
        break
    print(f"⏳ Menunggu... ({(i+1)*5}s)")

if not otp:
    print("❌ Timeout, OTP tidak ditemukan")

# 4. Verifikasi OTP
# verify_otp(otp)  # <-- kode verifikasi kamu

# 5. Hapus inbox (cleanup)
requests.delete(f"{API}/inbox/{email}", headers=HEADERS)
```

### Node.js
```javascript
const API = "https://mail.hubify.id/api/ext";
const headers = { "X-API-Key": "YOUR_KEY", "Content-Type": "application/json" };

// 1. Buat email
const res = await fetch(`${API}/inbox/create`, { method: "POST", headers });
const { email } = (await res.json()).data;
console.log(`📧 Email: ${email}`);

// 2. Register di website...

// 3. Polling OTP
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let otp = null;

for (let i = 0; i < 12; i++) {
  await sleep(5000);
  const r = await fetch(`${API}/inbox/${email}/otp`, { headers });
  const data = (await r.json()).data;
  if (data.otp) {
    otp = data.otp;
    console.log(`🔑 OTP: ${otp} (dari ${data.from})`);
    break;
  }
  console.log(`⏳ Menunggu... (${(i + 1) * 5}s)`);
}

// 4. Verifikasi & cleanup
await fetch(`${API}/inbox/${email}`, { method: "DELETE", headers });
```

---

## Telegram Bot

Bot pribadi untuk kontrol email via Telegram.

### Setup
1. Chat [@BotFather](https://t.me/BotFather) → `/newbot` → copy token
2. Chat [@userinfobot](https://t.me/userinfobot) → copy `Id`
3. Tambah di `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-your-token
   TELEGRAM_OWNER_ID=123456789
   ```
4. Restart backend

### Commands
| Command | Fungsi |
|---------|--------|
| `/start` | Info bot |
| `/domains` | List domain aktif + ID |
| `/gen 5` | Generate 5 email (domain random campur) |
| `/gen 3 2` | Generate 3 email, semua domain ID 2 |
| `/inbox user@domain.com` | List email masuk |
| `/otp user@domain.com` | Ambil OTP |
| `/del user@domain.com` | Hapus inbox |

### Auto-Notify
Setiap ada email masuk ke sistem, bot otomatis kirim notif:
```
📧 Email Masuk
📬 To:   test123@hubify.store
👤 From: noreply@google.com
📝 Subject: Your verification code
🔑 OTP:  847291
```
