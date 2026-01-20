#!/usr/bin/env node
/**
 * Postfix Pipe Handler
 * This script receives raw email from Postfix via stdin
 * and inserts it into the database
 */

import { parseEmail } from '../services/emailParser.js';
import inboxService from '../services/inbox.js';
import domainService from '../services/domain.js';
import db from '../config/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from backend root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

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

        // Close database connection
        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error processing email:', error);
        process.exit(1);
    }
}

main();
