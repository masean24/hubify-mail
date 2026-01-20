import { simpleParser } from 'mailparser';

/**
 * Parse raw email from stdin (Postfix pipe)
 */
export const parseEmail = async (rawEmail) => {
    const parsed = await simpleParser(rawEmail);

    // Extract recipient address
    const toHeader = parsed.to?.value?.[0];
    const toAddress = toHeader?.address?.toLowerCase() || '';

    // Extract sender
    const fromHeader = parsed.from?.value?.[0];
    const fromAddress = fromHeader?.address || '';
    const fromName = fromHeader?.name || '';
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    return {
        to: toAddress,
        from,
        subject: parsed.subject || '(No Subject)',
        text: parsed.text || '',
        html: parsed.html || '',
        hasAttachment: parsed.attachments?.length > 0,
        date: parsed.date || new Date(),
    };
};

export default {
    parseEmail,
};
