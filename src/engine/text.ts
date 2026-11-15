import { measure } from './fonts';
import type { FontRef } from './scene';

/** Greedy word wrap; words wider than maxW are broken by character (long emails/URLs). */
export function wrapText(text: string, font: FontRef, size: number, maxW: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ').filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(font, size, candidate) <= maxW) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (measure(font, size, word) <= maxW) {
      current = word;
      continue;
    }
    let chunk = '';
    for (const ch of Array.from(word)) {
      if (chunk === '' || measure(font, size, chunk + ch) <= maxW) chunk += ch;
      else {
        lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines;
}

/** Largest size <= `size` at which `text` fits on one line within maxW. */
export function fitSize(text: string, font: FontRef, size: number, maxW: number): number {
  const w = measure(font, size, text);
  return w <= maxW || w === 0 ? size : (size * maxW) / w;
}
