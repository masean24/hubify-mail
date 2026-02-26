import { convert } from 'html-to-text';

/**
 * Extract OTP/code from email body text and subject.
 * Supports digit codes (123456) and alphanumeric codes (O1O-HQ7).
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
 * Try to extract a code from a single string (subject or body line).
 * Returns code or null.
 */
function extractCodeFromString(str) {
    if (!str || !str.trim()) return null;

    // Digit code with keyword
    const digitKw = str.match(/(?:code|otp|verification\s*code|pin|password)[\s:]*[:\s]*(\d{4,8})/i);
    if (digitKw && digitKw[1]) return digitKw[1];

    // Alphanumeric code with dash + keyword (e.g. "H21-0Z0 xAI confirmation code")
    const alphaKw = str.match(/\b([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})\b/i);
    if (alphaKw && alphaKw[1]) {
        const code = alphaKw[1];
        if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) return code;
    }

    // Standalone digit code
    const digit = str.match(/\b(\d{4,8})\b/);
    if (digit && digit[1]) return digit[1];

    return null;
}

/**
 * Extract OTP from email subject, body text, and/or body HTML.
 * Checks subject FIRST since many services put the code there.
 * Returns first likely code string or null.
 */
export function extractOtp(bodyText, bodyHtml, subject) {
    // 0. Try subject first — many services put code in subject line
    if (subject) {
        const fromSubject = extractCodeFromString(subject);
        if (fromSubject) return fromSubject;
    }

    // Get body text
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

    // 2. Explicit alphanumeric patterns (keyword + code with dash ONLY, no space)
    const explicitAlphaPatterns = [
        /(?:code|otp|verification\s*code|pin)[\s:]*[:\s]*([A-Z0-9]{2,6}[-–][A-Z0-9]{2,6})/i,
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

    // 5. Fallback: digit-only codes
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
