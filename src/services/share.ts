import LZString from 'lz-string';
import { ApiError } from '../errors';
import { CardConfigSchema, type CardConfig } from '../schema';

const PREFIX = 'v1.';
export const MAX_TOKEN_LENGTH = 4096;
const MAX_JSON_LENGTH = 20_000;

/** config -> JSON -> LZ-String (Uint8Array) -> base64url. Pure function, no storage. */
export function encodeConfig(config: CardConfig): string {
  const bytes = LZString.compressToUint8Array(JSON.stringify(config));
  return PREFIX + Buffer.from(bytes).toString('base64url');
}

export function decodeConfig(token: string): CardConfig {
  if (token.length > MAX_TOKEN_LENGTH || !/^v1\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Share token is malformed.');
  }
  const bytes = new Uint8Array(Buffer.from(token.slice(PREFIX.length), 'base64url'));
  let json: string | null | undefined;
  try {
    json = LZString.decompressFromUint8Array(bytes);
  } catch {
    json = null;
  }
  if (!json || json.length > MAX_JSON_LENGTH) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Share token could not be decoded.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ApiError(400, 'INVALID_TOKEN', 'Share token does not contain a card configuration.');
  }
  const parsed = CardConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Share token holds an invalid or outdated card configuration.');
  }
  return parsed.data;
}
