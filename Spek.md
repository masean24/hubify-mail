# Hubify ID - Public Temporary Email System

Build a PUBLIC TEMPORARY EMAIL SYSTEM similar to tmail.io with the following constraints and features.

---

## INFRASTRUCTURE

- **VPS**: Ubuntu
- **Mail server**: Postfix (inbound only)
- **SMTP outbound**: BLOCKED (not allowed)
- **System only RECEIVES emails**
- **Multiple domains** (5-10) pointing via MX to the same server
- **Catch-all enabled** (no per-address mailbox creation)
- **Database**: PostgreSQL (local on VPS)
- **Backend**: Node.js
- **Frontend**: Vanilla HTML + CSS + JavaScript (with Vite for dev)

---

## CORE CONCEPT

- Only ONE mail storage backend
- Infinite disposable email addresses generated dynamically
- Addresses are NOT pre-created
- Backend filters emails by "To:" header (local-part + domain)

Example valid emails:
- `a8x92@domain1.com`
- `otp-google@domain2.net`
- `hello123@domain3.org`

All emails go to one storage, then separated logically.

---

## EMAIL RECEIVING MECHANISM

**Method: Postfix Pipe Script**

1. Postfix receives email
2. Postfix pipes email to Node.js script
3. Script parses email (headers + body)
4. Script inserts to PostgreSQL database
5. Frontend polls API for new emails

---

## BACKEND REQUIREMENTS

- **Language**: Node.js (Express.js)
- Store received emails (headers + body)
- Parse at minimum:
  - To
  - From
  - Subject
  - Date
  - Text body
  - HTML body (optional)
- **No attachment storage** (metadata only if present)
- **No sending email feature**

---

## TEMP MAIL LOGIC

1. User opens website
2. System generates:
   - Random local-part (e.g. `abc123`)
   - User selects domain from dropdown
3. Generated email is shown to user (e.g. `abc123@hubify.store`)
4. User can also:
   - Enter custom local-part + select domain
   - Enter full email address to check existing inbox
5. User receives OTP / verification email
6. Inbox auto-refreshes via **polling** (every 3-5 seconds)

---

## AUTO DELETE RULES (IMPORTANT)

- Emails are grouped by ADDRESS (local-part + domain)
- All emails older than **24 HOURS** are automatically deleted
- Addresses are reusable:
  - If user re-enters the SAME email address within 24 hours → inbox still exists
  - After 24 hours → inbox is fully purged and recreated if reused
- A daily **cron cleanup job** must run

---

## DATABASE DESIGN

**PostgreSQL Schema**

```sql
-- Domains table
CREATE TABLE domains (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inboxes table  
CREATE TABLE inboxes (
  id SERIAL PRIMARY KEY,
  local_part VARCHAR(255) NOT NULL,
  domain_id INTEGER REFERENCES domains(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(local_part, domain_id)
);

-- Emails table
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  inbox_id INTEGER REFERENCES inboxes(id) ON DELETE CASCADE,
  from_address VARCHAR(255),
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  has_attachment BOOLEAN DEFAULT false,
  received_at TIMESTAMP DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note**: No user accounts for public users. No authentication for temp email feature.

---

## SECURITY & ABUSE CONTROL

- Disable email sending entirely
- Block executable attachments (reject at Postfix level)
- Rate limit inbox fetch API (e.g. 60 requests/minute per IP)
- Reject very large emails (limit: 1MB)
- No open relay risk
- Sanitize HTML body before display (prevent XSS)

---

## MULTI DOMAIN SUPPORT

- System supports 5-10 domains
- Domains are interchangeable (same logic applies)
- Domain list configurable in database
- Admin can enable/disable domains

---

## ADMIN DASHBOARD

**Features:**
- Login with username/password
- View statistics:
  - Total emails received (today/all time)
  - Active inboxes count
  - Emails per domain breakdown
- Manage domains:
  - Add new domain
  - Enable/disable domain
  - Delete domain
- View recent emails (for monitoring/debugging)
- Manual cleanup trigger

---

## UI REQUIREMENTS

### Style: NEO BRUTALISM

**Characteristics:**
- High contrast colors
- Bold black borders (3-4px)
- Flat bright colors (yellow, lime green, pink, cyan)
- Large chunky typography
- Sharp edges (no border-radius)
- Thick drop shadows (offset, not blur)
- Uppercase headings

**General:**
- Mobile friendly (responsive)
- Clean, simple, fast
- Single page application feel

---

## UI LAYOUT (Reference: JANSTORE style)

### Header
- Logo: "Hubify ID" (bold, large)
- No navigation links needed (single purpose app)

### Main Section
- Title: "Your Temporary Email Address"
- Email display box with:
  - Input field showing generated email
  - Domain dropdown selector
  - Copy button (green)
- Action buttons row:
  - Refresh (poll manually)
  - New (generate new random address)
  - Delete (clear current inbox)

### Custom Email Input
- Input field for custom local-part
- Domain dropdown
- "Use This Email" button

### Inbox Area
- List of received emails showing:
  - From
  - Subject
  - Time received
- Empty state: "No Messages - Waiting for Incoming Messages"
- Loading spinner when checking

### Email Detail View
- Modal or expandable view
- Shows full email content
- Close button

### Footer
- Simple copyright text
- TTL indicator showing time until inbox expires

---

## API ENDPOINTS

### Public API

```
GET  /api/domains              - Get list of active domains
POST /api/inbox/generate       - Generate random email address
GET  /api/inbox/:address       - Get emails for address
GET  /api/email/:id            - Get single email detail
DELETE /api/inbox/:address     - Delete inbox manually
```

### Admin API (Protected)

```
POST /api/admin/login          - Admin login
GET  /api/admin/stats          - Get statistics
GET  /api/admin/domains        - List all domains
POST /api/admin/domains        - Add domain
PATCH /api/admin/domains/:id   - Update domain
DELETE /api/admin/domains/:id  - Delete domain
GET  /api/admin/emails/recent  - Get recent emails
POST /api/admin/cleanup        - Trigger manual cleanup
```

---

## DELIVERABLES

1. System architecture explanation
2. Postfix inbound handling with pipe script
3. Backend API (Node.js + Express)
4. PostgreSQL database schema
5. Auto-delete cron job logic
6. Frontend (Vanilla HTML/CSS/JS with Vite)
7. Admin dashboard
8. Neo-brutalism CSS styling
9. Security considerations
10. Deployment steps on Ubuntu VPS

---

## CONSTRAINTS

- ❌ Do NOT suggest third-party email services
- ❌ Do NOT use cPanel
- ❌ Do NOT include outbound SMTP
- ❌ Do NOT store attachments (metadata only)
- ❌ Do NOT use WebSocket (use polling)
- ❌ Do NOT use heavy frontend frameworks (React, Vue, etc.)

---

## FOCUS

✅ Simplicity
✅ Speed (fast load, fast polling)
✅ Scalability
✅ Clarity
✅ Neo-brutalism aesthetics