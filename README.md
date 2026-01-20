# Hubify ID - Temporary Email System

📧 A self-hosted temporary email service with Neo-brutalism UI.

## Features

- ✅ Infinite disposable email addresses
- ✅ Multiple domain support (5-10 domains)
- ✅ 24-hour email TTL with auto-cleanup
- ✅ Real-time inbox polling
- ✅ Admin dashboard with statistics
- ✅ Neo-brutalism design
- ✅ Mobile responsive

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JS + Vite
- **Mail Server**: Postfix (inbound only)

## Project Structure

```
hubify-mail/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── config/    # Database config
│   │   ├── handlers/  # Postfix pipe handler
│   │   ├── middleware/# Auth & rate limiting
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   └── index.js   # Entry point
│   └── scripts/       # CLI utilities
├── frontend/          # Vite frontend
│   ├── css/           # Neo-brutalism styles
│   ├── js/            # Frontend logic
│   ├── index.html     # Main page
│   └── admin.html     # Admin dashboard
└── sql/               # Database schema
```

## Quick Start (Development)

### 1. Setup Database

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE hubify_mail;
CREATE USER hubify WITH PASSWORD 'your_password';
GRANT ALL ON DATABASE hubify_mail TO hubify;
\q

# Run schema
psql -U hubify -d hubify_mail -f sql/schema.sql
```

### 2. Start Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Create Admin User

```bash
cd backend
node scripts/create-admin.js admin yourpassword
```

### 5. Open Browser

- Main: http://localhost:5173
- Admin: http://localhost:5173/admin.html

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/domains | List active domains |
| POST | /api/inbox/generate | Generate random email |
| POST | /api/inbox/custom | Create custom email |
| GET | /api/inbox/:address | Get inbox emails |
| GET | /api/email/:id | Get email detail |
| DELETE | /api/inbox/:address | Delete inbox |

### Admin (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/login | Admin login |
| GET | /api/admin/stats | Dashboard stats |
| GET/POST | /api/admin/domains | Manage domains |
| PATCH/DELETE | /api/admin/domains/:id | Update/delete domain |
| GET | /api/admin/emails/recent | Recent emails |
| POST | /api/admin/cleanup | Trigger cleanup |

## Production Deployment

See [VPS Setup Guide](docs/vps-setup.md) for full deployment instructions.

## License

MIT
