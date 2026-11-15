import QRCode from 'qrcode';
import { ApiError } from '../errors';
import { contrastRatio, relativeLuminance } from '../engine/color';
import type { QrArt, QrMatrix } from '../engine/qrDraw';
import type { CardConfig } from '../schema';

type Front = CardConfig['front'];

/** vCard 3.0 text escaping (RFC 2426). */
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Builds a minimal VCF 3.0 string (only filled fields are emitted to keep the QR sparse).
 * Lines are CRLF-separated and not folded at 75 octets: every mainstream phone scanner accepts that
 * and folding would only make the QR denser.
 */
export function buildVCard(front: Front): string {
  const tokens = front.fullName.split(' ').filter(Boolean);
  const family = tokens.length > 1 ? (tokens.pop() as string) : '';
  const given = tokens.join(' ');
  const fn = front.fullName || front.company || front.email || 'Contact';

  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(family)};${esc(given)};;;`, `FN:${esc(fn)}`];
  let hasData = false;
  const push = (line: string) => {
    lines.push(line);
    hasData = true;
  };
  if (front.company) push(`ORG:${esc(front.company)}`);
  if (front.title) push(`TITLE:${esc(front.title)}`);
  if (front.phone) push(`TEL;TYPE=WORK,VOICE:${esc(front.phone)}`);
  if (front.email) push(`EMAIL;TYPE=INTERNET,WORK:${esc(front.email)}`);
  if (front.website) push(`URL:${/^[a-z][a-z0-9+.-]*:/i.test(front.website) ? front.website : `https://${front.website}`}`);
  if (front.address) push(`ADR;TYPE=WORK:;;${esc(front.address)};;;;`);
  if (!hasData && !front.fullName) {
    throw new ApiError(422, 'QR_EMPTY', 'Cannot build a vCard: front has no contact data.');
  }
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function resolveQrPayload(config: CardConfig): { payload: string; caption: string } {
  const { back, front } = config;
  if (back.qrType === 'vcard') {
    return { payload: buildVCard(front), caption: 'SCAN TO SAVE CONTACT' };
  }
  const raw = back.customUrl || front.website;
  const url = raw ? normalizeUrl(raw) : null;
  if (!url) {
    throw new ApiError(422, 'QR_URL_INVALID', 'qrType "url" needs a valid http(s) back.customUrl (or front.website).');
  }
  return { payload: url.href, caption: url.host.replace(/^www\./, '').toUpperCase() };
}

/**
 * QR modules must be DARK on LIGHT. Prefer accentColor ("tinted") when it has >= 4.5:1 contrast
 * against bgColor, else textColor (>= 3:1), else fall back to a white plate with the best ink.
 */
export function resolveQrColors(theme: CardConfig['theme']): { dark: string; light: string } {
  const bg = theme.bgColor;
  const usable = (c: string, plate: string, min: number) =>
    relativeLuminance(c) < relativeLuminance(plate) && contrastRatio(c, plate) >= min;

  if (usable(theme.accentColor, bg, 4.5)) return { dark: theme.accentColor, light: bg };
  if (usable(theme.textColor, bg, 3)) return { dark: theme.textColor, light: bg };
  if (usable(theme.accentColor, bg, 3)) return { dark: theme.accentColor, light: bg };

  const onWhite = [theme.accentColor, theme.textColor]
    .filter((c) => contrastRatio(c, '#ffffff') >= 4.5)
    .sort((a, b) => contrastRatio(b, '#ffffff') - contrastRatio(a, '#ffffff'));
  return { dark: onWhite[0] ?? '#000000', light: '#ffffff' };
}

export function createMatrix(payload: string): QrMatrix {
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'H' });
    const m = qr.modules as unknown as { size: number; data: ArrayLike<number> };
    return { size: m.size, data: m.data };
  } catch {
    throw new ApiError(422, 'QR_TOO_LARGE', 'Contact data is too long to fit in an error-correction-H QR code. Shorten some fields.');
  }
}

/** Everything the print renderers need for the back-side QR. */
export function prepareQrArt(config: CardConfig): QrArt {
  const { payload, caption } = resolveQrPayload(config);
  const { dark, light } = resolveQrColors(config.theme);
  return { matrix: createMatrix(payload), dark, light, caption };
}

/** POST /api/qr response: tinted SVG (vector) + 512px PNG data URL. ECC level H. */
export async function generateQrForApi(config: CardConfig): Promise<{ svg: string; dataUrl: string }> {
  const { payload } = resolveQrPayload(config);
  const { dark, light } = resolveQrColors(config.theme);
  const opts = { errorCorrectionLevel: 'H' as const, margin: 4, color: { dark, light } };
  try {
    const [svg, dataUrl] = await Promise.all([
      QRCode.toString(payload, { ...opts, type: 'svg' }),
      QRCode.toDataURL(payload, { ...opts, width: 512 }),
    ]);
    return { svg, dataUrl };
  } catch {
    throw new ApiError(422, 'QR_TOO_LARGE', 'Contact data is too long to fit in an error-correction-H QR code. Shorten some fields.');
  }
}
