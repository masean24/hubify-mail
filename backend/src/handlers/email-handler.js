#!/usr/bin/env node
/**
 * Postfix Pipe Handler
 * This script receives raw email from Postfix via stdin
 * and inserts it into the database
 * 
 * IMPORTANT: dotenv must be loaded BEFORE any other imports
 * because database.js reads process.env.DATABASE_URL on import
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Now import other modules (after dotenv is loaded)
import { parseEmail } from '../services/emailParser.js';
import inboxService from '../services/inbox.js';
import domainService from '../services/domain.js';
import discordService from '../services/discord.js';
import telegramService from '../services/telegram.js';
import otpExtract from '../services/otpExtract.js';
import db from '../config/database.js';

/**
 * Read stdin as buffer
 */
async function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.on('data', (chunk) => chunks.push(chunk));
        process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
        process.stdin.on('error', reject);
    });
}

/**
 * Main handler
 */
async function main() {
    try {
        // Read raw email from stdin
        const rawEmail = await readStdin();

        if (!rawEmail || rawEmail.length === 0) {
            console.error('No email data received');
            process.exit(1);
        }

        console.log(`📧 Received email (${rawEmail.length} bytes)`);

        // Parse email
        const parsed = await parseEmail(rawEmail);
        console.log(`📧 To: ${parsed.to}`);
        console.log(`📧 From: ${parsed.from}`);
        console.log(`📧 Subject: ${parsed.subject}`);

        // Extract local part and domain from "to" address
        const [localPart, domainName] = parsed.to.split('@');

        if (!localPart || !domainName) {
            console.error('Invalid recipient address:', parsed.to);
            process.exit(1);
        }

        // Find domain in database
        const domain = await domainService.getDomainByName(domainName);

        if (!domain) {
            console.error('Domain not found:', domainName);
            process.exit(0); // Exit gracefully - domain not registered
        }

        if (!domain.is_active) {
            console.error('Domain is inactive:', domainName);
            process.exit(0);
        }

        // Get or create inbox
        const inbox = await inboxService.getOrCreateInbox(localPart, domain.id);
        console.log(`📬 Inbox ID: ${inbox.id}`);

        // Insert email
        const email = await inboxService.insertEmail(inbox.id, {
            from: parsed.from,
            subject: parsed.subject,
            text: parsed.text,
            html: parsed.html,
            hasAttachment: parsed.hasAttachment,
        });

        console.log(`✅ Email saved with ID: ${email.id}`);

        // Extract OTP for notifications
        const otp = otpExtract.extractOtp(parsed.text, parsed.html, parsed.subject);

        // Send Discord webhook notification (await before exit)
        await discordService.sendNewEmailNotification(parsed.to, parsed.from)
            .catch(err => console.error('⚠️ Discord notify failed:', err.message));

        // Send Telegram notification with OTP
        await telegramService.notifyNewEmail(parsed.to, parsed.from, parsed.subject, otp)
            .catch(err => console.error('⚠️ Telegram notify failed:', err.message));

        // Close database connection
        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error processing email:', error);
        process.exit(1);
    }
}

main();
