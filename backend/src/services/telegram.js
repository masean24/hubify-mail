/**
 * Telegram Bot Service
 * Personal bot for generating emails and receiving OTP notifications.
 * Only responds to TELEGRAM_OWNER_ID.
 *
 * Telegraf is imported dynamically in startBot() so that email-handler.js
 * can import this module for notifyNewEmail() without needing telegraf.
 */

import domainService from './domain.js';
import inboxService from './inbox.js';
import namesService from './names.js';
import otpExtract from './otpExtract.js';

let bot = null;
const OWNER_ID = process.env.TELEGRAM_OWNER_ID;

/**
 * Initialize and start the Telegram bot
 */
export async function startBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log('ℹ️  Telegram bot disabled (no TELEGRAM_BOT_TOKEN)');
        return;
    }

    if (!OWNER_ID) {
        console.log('⚠️  Telegram bot disabled (no TELEGRAM_OWNER_ID)');
        return;
    }

    const { Telegraf } = await import('telegraf');
    bot = new Telegraf(token);

    // Owner-only middleware
    bot.use((ctx, next) => {
        if (String(ctx.from?.id) !== String(OWNER_ID)) {
            return ctx.reply('⛔ Bot ini hanya untuk owner.');
        }
        return next();
    });

    // /start
    bot.start((ctx) => {
        ctx.reply(
            `🚀 *Hubify Mail Bot*\n\n` +
            `Perintah yang tersedia:\n` +
            `/gen [jumlah] [domainId] — Generate email\n` +
            `/inbox <email> — Cek inbox\n` +
            `/otp <email> — Ambil OTP\n` +
            `/domains — List domain aktif\n` +
            `/del <email> — Hapus inbox`,
            { parse_mode: 'Markdown' }
        );
    });

    // /domains - List active domains with IDs
    bot.command('domains', async (ctx) => {
        try {
            const domains = await domainService.getActiveDomains();
            if (domains.length === 0) {
                return ctx.reply('❌ Tidak ada domain aktif.');
            }

            let msg = '🌐 *Domain Aktif:*\n\n';
            domains.forEach((d) => {
                msg += `ID \`${d.id}\` → \`${d.domain}\`\n`;
            });
            msg += `\n_Gunakan ID untuk /gen [jumlah] [domainId]_`;

            ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Bot - Error fetching domains:', error);
            ctx.reply('❌ Gagal mengambil daftar domain.');
        }
    });

    // /gen [count] [domainId] - Generate emails
    bot.command('gen', async (ctx) => {
        try {
            const args = ctx.message.text.split(' ').slice(1);
            const count = Math.min(Math.max(parseInt(args[0]) || 1, 1), 10);
            const forceDomainId = args[1] ? parseInt(args[1]) : null;

            // Validate forced domain if specified
            if (forceDomainId) {
                const domain = await domainService.getDomainById(forceDomainId);
                if (!domain || !domain.is_active) {
                    return ctx.reply(`❌ Domain ID \`${forceDomainId}\` tidak valid/aktif.\nGunakan /domains untuk cek.`, { parse_mode: 'Markdown' });
                }
            }

            // Get all active domains for random picking
            const domains = await domainService.getActiveDomains();
            if (domains.length === 0) {
                return ctx.reply('❌ Tidak ada domain aktif.');
            }

            const generated = [];

            for (let i = 0; i < count; i++) {
                // Pick domain: forced or random
                const domainId = forceDomainId || domains[Math.floor(Math.random() * domains.length)].id;

                // Generate human-like name
                const firstNameResult = await namesService.getRandomNameByGender('random');
                const lastNameResult = await namesService.getRandomNameByGender(firstNameResult.gender);
                const randomNum = Math.floor(Math.random() * 90) + 10;
                const localPart = (firstNameResult.name && lastNameResult.name)
                    ? `${firstNameResult.name}${lastNameResult.name}${randomNum}`
                    : inboxService.generateRandomLocalPart();

                const inbox = await inboxService.getOrCreateInbox(localPart, domainId);
                generated.push(`\`${inbox.local_part}@${inbox.domain}\``);
            }

            let msg = `✅ *${count} Email Generated:*\n\n`;
            generated.forEach((email, i) => {
                msg += `${i + 1}. ${email}\n`;
            });
            msg += `\n⏳ _Expired dalam 24 jam_`;

            ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Bot - Error generating emails:', error);
            ctx.reply('❌ Gagal generate email.');
        }
    });

    // /inbox <email> - Check inbox
    bot.command('inbox', async (ctx) => {
        try {
            const address = ctx.message.text.split(' ')[1];
            if (!address || !address.includes('@')) {
                return ctx.reply('⚠️ Format: `/inbox email@domain.com`', { parse_mode: 'Markdown' });
            }

            const inbox = await inboxService.getInboxByAddress(address);
            if (!inbox) {
                return ctx.reply(`📭 Inbox \`${address}\` kosong atau belum ada email.`, { parse_mode: 'Markdown' });
            }

            const emails = await inboxService.getInboxEmails(inbox.id);
            if (emails.length === 0) {
                return ctx.reply(`📭 Inbox \`${address}\` kosong.`, { parse_mode: 'Markdown' });
            }

            let msg = `📬 *Inbox:* \`${address}\`\n`;
            msg += `📩 ${emails.length} email\n\n`;

            emails.slice(0, 10).forEach((e, i) => {
                const time = new Date(e.received_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                msg += `${i + 1}. *${e.subject || '(no subject)'}*\n`;
                msg += `   👤 ${e.from_address}\n`;
                msg += `   🕐 ${time}\n\n`;
            });

            if (emails.length > 10) {
                msg += `_...dan ${emails.length - 10} email lainnya_`;
            }

            ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Bot - Error fetching inbox:', error);
            ctx.reply('❌ Gagal mengambil inbox.');
        }
    });

    // /otp <email> - Extract OTP
    bot.command('otp', async (ctx) => {
        try {
            const address = ctx.message.text.split(' ')[1];
            if (!address || !address.includes('@')) {
                return ctx.reply('⚠️ Format: `/otp email@domain.com`', { parse_mode: 'Markdown' });
            }

            const inbox = await inboxService.getInboxByAddress(address);
            if (!inbox) {
                return ctx.reply(`📭 Inbox \`${address}\` kosong.`, { parse_mode: 'Markdown' });
            }

            const emails = await inboxService.getInboxEmails(inbox.id);

            for (const email of emails) {
                const otp = otpExtract.extractOtp(email.body_text, email.body_html);
                if (otp) {
                    const time = new Date(email.received_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                    return ctx.reply(
                        `🔑 *OTP Ditemukan!*\n\n` +
                        `📬 To: \`${address}\`\n` +
                        `👤 From: \`${email.from_address}\`\n` +
                        `📝 Subject: ${email.subject || '-'}\n` +
                        `🔑 Code: \`${otp}\`\n` +
                        `🕐 ${time}`,
                        { parse_mode: 'Markdown' }
                    );
                }
            }

            ctx.reply(`❌ Tidak ada OTP ditemukan di inbox \`${address}\``, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Bot - Error extracting OTP:', error);
            ctx.reply('❌ Gagal mengambil OTP.');
        }
    });

    // /del <email> - Delete inbox
    bot.command('del', async (ctx) => {
        try {
            const address = ctx.message.text.split(' ')[1];
            if (!address || !address.includes('@')) {
                return ctx.reply('⚠️ Format: `/del email@domain.com`', { parse_mode: 'Markdown' });
            }

            const inbox = await inboxService.getInboxByAddress(address);
            if (!inbox) {
                return ctx.reply(`❌ Inbox \`${address}\` tidak ditemukan.`, { parse_mode: 'Markdown' });
            }

            await inboxService.deleteInbox(inbox.id);
            ctx.reply(`🗑️ Inbox \`${address}\` berhasil dihapus.`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Bot - Error deleting inbox:', error);
            ctx.reply('❌ Gagal menghapus inbox.');
        }
    });

    // Launch bot with long polling
    bot.launch()
        .then(() => console.log('🤖 Telegram bot started'))
        .catch((err) => console.error('❌ Telegram bot failed to start:', err.message));

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

/**
 * Send notification to owner when new email arrives.
 * Uses direct Telegram API call (not bot instance) so it works
 * from email-handler.js which runs as a separate Postfix pipe process.
 * @param {string} toEmail - recipient address
 * @param {string} fromAddress - sender address
 * @param {string} subject - email subject
 * @param {string|null} otp - extracted OTP code (if any)
 */
export async function notifyNewEmail(toEmail, fromAddress, subject, otp) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_OWNER_ID;

    if (!token || !chatId) return;

    try {
        let msg = `📧 *Email Masuk*\n\n`;
        msg += `📬 To: \`${toEmail}\`\n`;
        msg += `👤 From: \`${fromAddress}\`\n`;
        msg += `📝 Subject: ${(subject || '-').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}\n`;

        if (otp) {
            msg += `🔑 OTP: \`${otp}\``;
        }

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: msg,
                parse_mode: 'Markdown',
            }),
        });
    } catch (error) {
        console.error('⚠️ Telegram notify failed:', error.message);
    }
}

export default { startBot, notifyNewEmail };
