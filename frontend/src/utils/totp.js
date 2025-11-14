// TOTP Generator utility

function base32Decode(base32) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';

  base32 = base32.replace(/=+$/, '').toUpperCase();

  for (let i = 0; i < base32.length; i++) {
    const val = base32Chars.indexOf(base32.charAt(i));
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8);
    hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
  }

  return hex;
}

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

async function hmacSha1(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

export async function generateTOTP(secret, period = 30, digits = 6) {
  try {
    // Decode base32 secret
    const decodedSecret = base32Decode(secret);
    const key = hexToBytes(decodedSecret);

    // Get current time counter
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / period);

    // Convert counter to 8-byte array
    const counterBytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = counter & 0xff;
      counter >>= 8;
    }

    // Generate HMAC
    const hash = await hmacSha1(key, counterBytes);

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  } catch (error) {
    console.error('TOTP generation error:', error);
    return '000000';
  }
}

export function getRemainingTime(period = 30) {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

export function parseOtpAuthUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'otpauth:') return null;

    const type = urlObj.host; // totp or hotp
    const label = decodeURIComponent(urlObj.pathname.slice(1));
    const [issuer, account] = label.includes(':') ? label.split(':') : ['', label];

    const params = new URLSearchParams(urlObj.search);
    const secret = params.get('secret');
    const algorithm = params.get('algorithm') || 'SHA1';
    const digits = parseInt(params.get('digits') || '6');
    const period = parseInt(params.get('period') || '30');

    return {
      type,
      issuer: issuer || params.get('issuer') || '',
      account,
      secret,
      algorithm,
      digits,
      period,
    };
  } catch (error) {
    console.error('Failed to parse OTP URL:', error);
    return null;
  }
}