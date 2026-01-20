#!/usr/bin/env node
/**
 * Cleanup Cron Job Script
 * Can be run via system cron or node-cron
 * Usage: node scripts/cleanup-cron.js
 */

import cleanupService from '../src/services/cleanup.js';
import db from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🧹 Starting cleanup job...');
    console.log(`📅 Time: ${new Date().toISOString()}`);

    try {
        // Get stats before cleanup
        const statsBefore = await cleanupService.getCleanupStats();
        console.log(`📊 Before cleanup:`);
        console.log(`   - Expired inboxes: ${statsBefore.expiredInboxes}`);
        console.log(`   - Total inboxes: ${statsBefore.totalInboxes}`);
        console.log(`   - Total emails: ${statsBefore.totalEmails}`);

        // Run cleanup
        const deletedCount = await cleanupService.cleanupExpiredInboxes();
        console.log(`✅ Deleted ${deletedCount} expired inboxes`);

        // Get stats after cleanup
        const statsAfter = await cleanupService.getCleanupStats();
        console.log(`📊 After cleanup:`);
        console.log(`   - Total inboxes: ${statsAfter.totalInboxes}`);
        console.log(`   - Total emails: ${statsAfter.totalEmails}`);

        await db.end();
        console.log('🧹 Cleanup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

main();
