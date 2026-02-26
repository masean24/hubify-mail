import { convert } from 'html-to-text';

/**
 * Extract OTP/code from email body text.
 * Matches common patterns: 4-8 digit codes, "code: 123456", "OTP is 123456", etc.
 * Also checks subject line for alphanumeric codes (e.g. "H21-0Z0").
 */

/**
 * Get plain text from HTML
 */
function htmlToText(html) {
    if (!html) return '';
    try {
        return convert(html, {
            wordwrap: false,
            selectors: [
                { selector: 'a', options: { ignoreHref: true } },
                { selector: 'img', format: 'skip' },
            ],
        });
    } catch (e) {
        return '';
    }
}

/**
 * Extract code from subject line.
 * Supports both digit codes and alphanumeric codes with dash.
 */
function extractFromSubject(subject) {
    if (!subject || !subject.trim()) return null;

    // Alphanumeric code with dash (e.g. "H21-0Z0 xAI confirmation code")
    const alpha = subject.match(/\b([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})\b/i);
    if (alpha && alpha[1]) {
        const code = alpha[1];
        if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) return code;
    }

    // Digit code in subject
    const digit = subject.match(/\b(\d{4,8})\b/);
    if (digit && digit[1]) return digit[1];

    return null;
}

/**
 * Extract OTP from email subject, body text, and/or body HTML.
 * Checks subject FIRST since some services put the code there.
 * Body extraction is digit-only to avoid false positives.
 * Returns first likely OTP string or null.
 */
export function extractOtp(bodyText, bodyHtml, subject) {
    // 0. Try subject first
    if (subject) {
        const fromSubject = extractFromSubject(subject);
        if (fromSubject) return fromSubject;
    }

    // Body text
    let text = bodyText || '';
    if (!text.trim() && bodyHtml) {
        text = htmlToText(bodyHtml);
    }
    if (!text.trim()) return null;

    // Prefer explicit patterns (code:, OTP:, verification code, etc.)
    const explicitPatterns = [
        /(?:code|otp|verification\s*code|pin|password)[\s:]*[:\s]*(\d{4,8})/i,
        /(?:is|:)\s*(\d{4,8})\s*(?:\.|$|\s)/i,
        /(\d{4,8})\s*(?:is your|is the)\s*(?:code|otp|pin)/i,
    ];
    for (const re of explicitPatterns) {
        const m = text.match(re);
        if (m && m[1]) return m[1];
    }

    // Fallback: first 5–8 digit number (skip 4-digit years/dates when possible)
    const sixDigit = text.match(/\b(\d{6})\b/);
    if (sixDigit) return sixDigit[1];
    const fiveDigit = text.match(/\b(\d{5})\b/);
    if (fiveDigit) return fiveDigit[1];
    const eightDigit = text.match(/\b(\d{8})\b/);
    if (eightDigit) return eightDigit[1];
    const fourDigit = text.match(/\b(\d{4})\b/);
    if (fourDigit) return fourDigit[1];

    return null;
}

export default {
    extractOtp,
    htmlToText,
};
