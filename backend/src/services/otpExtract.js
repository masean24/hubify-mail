import { convert } from 'html-to-text';

/**
 * Extract OTP/code from email body text.
 * Matches common patterns: 4-8 digit codes, "code: 123456", "OTP is 123456", etc.
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
 * Extract OTP/code from email body (text or HTML).
 * Supports both digit-only codes (123456) and alphanumeric codes (O1O-HQ7).
 * Returns first likely code string or null.
 */
export function extractOtp(bodyText, bodyHtml) {
    let text = bodyText || '';
    if (!text.trim() && bodyHtml) {
        text = htmlToText(bodyHtml);
    }
    if (!text.trim()) return null;

    // 1. Explicit digit patterns (code:, OTP:, verification code, etc.)
    const explicitDigitPatterns = [
        /(?:code|otp|verification\s*code|pin|password)[\s:]*[:\s]*(\d{4,8})/i,
        /(?:is|:)\s*(\d{4,8})\s*(?:\.|$|\s)/i,
        /(\d{4,8})\s*(?:is your|is the)\s*(?:code|otp|pin)/i,
    ];
    for (const re of explicitDigitPatterns) {
        const m = text.match(re);
        if (m && m[1]) return m[1];
    }

    // 2. Explicit alphanumeric patterns (keyword + alphanumeric code with dash/space)
    const explicitAlphaPatterns = [
        /(?:code|otp|verification\s*code|pin)[\s:]*[:\s]*([A-Z0-9]{2,6}[-–\s][A-Z0-9]{2,6})/i,
        /(?:is|:)\s*([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})\s*(?:\.|$|\s)/i,
        /([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})\s*(?:is your|is the)\s*(?:code|otp|pin)/i,
    ];
    for (const re of explicitAlphaPatterns) {
        const m = text.match(re);
        if (m && m[1]) return m[1];
    }

    // 3. Standalone alphanumeric code on its own line (e.g. "O1O-HQ7", "ABCD-1234")
    //    Must contain at least one letter AND one digit, with a dash separator
    const standaloneAlpha = text.match(/^\s*([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})\s*$/mi);
    if (standaloneAlpha && standaloneAlpha[1]) {
        const code = standaloneAlpha[1];
        if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
            return code;
        }
    }

    // 4. Standalone alphanumeric code WITHOUT dash (e.g. "A8X92K", "XK7M2P")
    //    Must be on its own line, 5-8 chars, mix of letters+digits
    const standaloneNoDash = text.match(/^\s*([A-Z0-9]{5,8})\s*$/mi);
    if (standaloneNoDash && standaloneNoDash[1]) {
        const code = standaloneNoDash[1];
        if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
            return code;
        }
    }

    // 5. Fallback: digit-only codes (existing behavior)
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
