# VPS Setup Guide - Hubify Mail

Complete guide to deploy Hubify Mail on Ubuntu VPS.

## Prerequisites

- Ubuntu 22.04 VPS
- Domain with DNS access
- Root/sudo access

## Step 1: System Update

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

## Step 3: Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
```

In psql:
```sql
CREATE USER hubify WITH PASSWORD 'your_secure_password';
CREATE DATABASE hubify_mail OWNER hubify;
\q
```

## Step 4: Install Postfix

```bash
sudo apt install -y postfix
```

During installation:
- Select "Internet Site"
- Enter your primary domain (e.g., hubify.id)

## Step 5: Clone & Setup Application

```bash
# Create directory
sudo mkdir -p /var/www/hubify-mail
sudo chown $USER:$USER /var/www/hubify-mail
cd /var/www/hubify-mail

# Clone or upload your code
# git clone <your-repo> .

# Setup backend
cd backend
npm install
cp .env.example .env
nano .env  # Edit with your database credentials
```

Edit `.env`:
```
DATABASE_URL=postgresql://hubify:your_secure_password@localhost:5432/hubify_mail
PORT=3000
NODE_ENV=production
JWT_SECRET=generate_a_long_random_string_here
```

## Step 6: Initialize Database

```bash
cd /var/www/hubify-mail
psql -U hubify -d hubify_mail -f sql/schema.sql
```

## Step 7: Create Admin User

```bash
cd /var/www/hubify-mail/backend
node scripts/create-admin.js admin your_admin_password
```

## Step 8: Configure Postfix

Edit `/etc/postfix/main.cf`:
```bash
sudo nano /etc/postfix/main.cf
```

Add at the end:
```ini
# Hubify Mail Config
virtual_alias_domains = hubify.id, mail.hubify.id, temp.hubify.id
virtual_alias_maps = regexp:/etc/postfix/virtual
```

Create `/etc/postfix/virtual`:
```bash
sudo nano /etc/postfix/virtual
```

Add:
```
/^(.*)@(.*)$/   hubify
```

Edit `/etc/postfix/master.cf`:
```bash
sudo nano /etc/postfix/master.cf
```

Add at the end:
```ini
hubify unix - n n - - pipe
  flags=F user=www-data argv=/usr/bin/node /var/www/hubify-mail/backend/src/handlers/email-handler.js
```

Restart Postfix:
```bash
sudo postmap /etc/postfix/virtual
sudo systemctl restart postfix
```

## Step 9: Build Frontend

```bash
cd /var/www/hubify-mail/frontend
npm install
npm run build
```

## Step 10: Setup PM2

```bash
sudo npm install -g pm2

cd /var/www/hubify-mail/backend
pm2 start src/index.js --name hubify-api
pm2 startup
pm2 save
```

## Step 11: Install & Configure Nginx

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/hubify
```

Add:
```nginx
server {
    listen 80;
    server_name mail.hubify.id;

    # Frontend
    location / {
        root /var/www/hubify-mail/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/hubify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 12: SSL with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mail.hubify.id
```

## Step 13: DNS Configuration

Add these records in your DNS provider:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| A | mail | [Your VPS IP] | - |
| MX | @ | mail.hubify.id | 10 |

For each temp email domain:
| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | mail.hubify.id | 10 |

## Step 14: Firewall (UFW)

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 25    # SMTP
sudo ufw enable
```

## Step 15: Test

```bash
# Test sending email
echo "Test message" | mail -s "Test" test@hubify.id

# Check logs
pm2 logs hubify-api
sudo tail -f /var/log/mail.log
```

Open https://mail.hubify.id in browser.

## Maintenance

### Check Logs
```bash
pm2 logs hubify-api
sudo tail -f /var/log/mail.log
```

### Manual Cleanup
```bash
cd /var/www/hubify-mail/backend
node scripts/cleanup-cron.js
```

### Update Application
```bash
cd /var/www/hubify-mail
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart hubify-api
```

## Troubleshooting

### Email not received
1. Check MX records: `dig MX hubify.id`
2. Check Postfix logs: `sudo tail -f /var/log/mail.log`
3. Verify Postfix is running: `sudo systemctl status postfix`

### API not working
1. Check PM2: `pm2 status`
2. Check logs: `pm2 logs hubify-api`
3. Test locally: `curl http://localhost:3000/health`

### Database connection failed
1. Check PostgreSQL: `sudo systemctl status postgresql`
2. Verify .env credentials
3. Test connection: `psql -U hubify -d hubify_mail`
