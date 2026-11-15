import { z } from 'zod';

export const FONT_FAMILIES = ['inter', 'playfair', 'jetbrains-mono', 'space-grotesk'] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** Collapse newlines / control characters so every field is a single printable line. */
const sanitize = (s: string): string =>
  s
    .replace(/\s*[\r\n]+\s*/g, ', ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const text = (max: number) => z.string().max(max).transform(sanitize);

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected #RGB or #RRGGBB')
  .transform((v) => {
    const h = v.slice(1).toLowerCase();
    return '#' + (h.length === 3 ? h.split('').map((c) => c + c).join('') : h);
  });

export const FrontSchema = z
  .object({
    fullName: text(80),
    title: text(80),
    company: text(80),
    email: text(120),
    phone: text(40),
    website: text(120),
    address: text(160),
    customTagline: text(100),
  })
  .strict();

export const BackSchema = z
  .object({
    showQrCode: z.boolean(),
    qrType: z.enum(['vcard', 'url']),
    customUrl: text(300).optional(),
    centerLogoText: text(4).optional(),
    layout: z.enum(['minimal', 'bold-brand', 'qr-focus']),
  })
  .strict();

export const ThemeSchema = z
  .object({
    preset: text(40),
    bgColor: hexColor,
    textColor: hexColor,
    accentColor: hexColor,
    fontFamily: z.enum(FONT_FAMILIES),
    fontScale: z.number().min(0.7).max(1.5),
    paddingScale: z.number().min(0.5).max(2),
    /** points (1pt = 1/72in), 0-8 */
    borderWidth: z.number().min(0).max(8),
    /** points, 0-24. Only visible when borderWidth > 0 */
    borderRadius: z.number().min(0).max(24),
    paperTexture: z.enum(['none', 'matte', 'cotton', 'kraft']),
    pattern: z.enum(['none', 'dots', 'grid', 'noise']),
  })
  .strict();

export const CardConfigSchema = z
  .object({
    standard: z.enum(['US', 'EU']),
    orientation: z.enum(['horizontal', 'vertical']),
    front: FrontSchema,
    back: BackSchema,
    theme: ThemeSchema,
  })
  .strict();

export type CardConfig = z.output<typeof CardConfigSchema>;
