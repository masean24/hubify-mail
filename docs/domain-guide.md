# Domain Management Guide

Panduan lengkap untuk menambah dan mengelola domain di Hubify Mail.

## Cara Menambah Domain Baru

### 1. Tambahkan domain di Admin Dashboard
1. Login ke `https://mail.hubify.store/admin.html`
2. Klik tombol **+ Add Domain**
3. Masukkan nama domain baru (contoh: `temp.hubify.store`)
4. Klik **Add Domain**

### 2. Update Postfix Configuration
```bash
sudo nano /etc/postfix/main.cf
```

Cari baris `virtual_mailbox_domains` dan tambahkan domain baru:
```
virtual_mailbox_domains = hubify.store, newdomain.com, anotherdomain.com
```

Reload Postfix:
```bash
sudo postfix reload
```

### 3. Setup DNS untuk Domain Baru
Tambahkan DNS record di domain provider:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | mail.hubify.store | 10 |

> **Note**: Semua domain email akan diarahkan ke mail server yang sama (`mail.hubify.store`).

---

## Arsitektur Domain

```
┌─────────────────────────────────────────────────────┐
│                   HUBIFY.STORE                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Web Interface: mail.hubify.store (HTTPS)           │
│                                                      │
│  Email Domains (MX → mail.hubify.store):            │
│    - hubify.store        → test@hubify.store        │
│    - temp.hubify.store   → random@temp.hubify.store │
│    - newdomain.com       → user@newdomain.com       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Email tidak masuk ke domain baru
1. Cek MX record: `dig MX newdomain.com`
2. Pastikan domain ada di `virtual_mailbox_domains`
3. Pastikan domain aktif di Admin Dashboard
4. Cek log: `sudo tail -f /var/log/mail.log`

### Domain tidak muncul di dropdown
1. Pastikan domain ada di database dan statusnya `is_active = true`
2. Refresh halaman / clear cache browser
