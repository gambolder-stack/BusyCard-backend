# Business Card API - Contract (v1)

Base URL: `https://<your-service>.onrender.com`  
All bodies are `application/json`. Unknown keys are **rejected** (strict schemas).  
Units: all lengths in the PDF are points (1pt = 1/72in). `borderWidth` and `borderRadius` are points.

## Shared type: `CardConfig`

```json
{
  "standard": "US",
  "orientation": "horizontal",
  "front": {
    "fullName": "Elif Yılmaz",
    "title": "Product Designer",
    "company": "Northwind Studio",
    "email": "elif@northwind.studio",
    "phone": "+90 532 000 00 00",
    "website": "northwind.studio",
    "address": "Bağdat Cd. 12, Kadıköy, Istanbul",
    "customTagline": "Design that ships."
  },
  "back": {
    "showQrCode": true,
    "qrType": "vcard",
    "customUrl": "https://northwind.studio",
    "centerLogoText": "NS",
    "layout": "minimal"
  },
  "theme": {
    "preset": "midnight",
    "bgColor": "#ffffff",
    "textColor": "#111827",
    "accentColor": "#1d4ed8",
    "fontFamily": "inter",
    "fontScale": 1,
    "paddingScale": 1,
    "borderWidth": 0,
    "borderRadius": 0,
    "paperTexture": "matte",
    "pattern": "dots"
  }
}
```

| Field | Type / constraint |
|---|---|
| `standard` | `"US"` (3.5"x2.0") \| `"EU"` (85x55mm) |
| `orientation` | `"horizontal"` \| `"vertical"` |
| `front.*` | all 8 keys required, strings (`""` allowed). Max: fullName/title/company 80, email/website 120, phone 40, address 160, customTagline 100. Newlines are collapsed. |
| `back.showQrCode` | boolean |
| `back.qrType` | `"vcard"` (VCF 3.0 from `front`) \| `"url"` |
| `back.customUrl` | optional, max 300. Used when `qrType="url"`; falls back to `front.website`. Scheme-less values get `https://`. Only http(s) accepted. |
| `back.centerLogoText` | optional, max 4 chars. Badge in the QR centre (`minimal`, `qr-focus`) or the big monogram (`bold-brand`). |
| `back.layout` | `"minimal"` \| `"bold-brand"` \| `"qr-focus"` |
| `theme.preset` | string, max 40 (informational pass-through; the backend only uses the explicit values below) |
| `theme.bgColor/textColor/accentColor` | `#RGB` or `#RRGGBB` |
| `theme.fontFamily` | `"inter"` \| `"playfair"` \| `"jetbrains-mono"` \| `"space-grotesk"` |
| `theme.fontScale` | number 0.7 - 1.5 |
| `theme.paddingScale` | number 0.5 - 2 |
| `theme.borderWidth` | number 0 - 8 (pt). 0 = no border |
| `theme.borderRadius` | number 0 - 24 (pt). Only visible when `borderWidth > 0` |
| `theme.paperTexture` | `"none"` \| `"matte"` \| `"cotton"` \| `"kraft"` - **ignored by the PDF**; PNG only when `?includeTexture=true` |
| `theme.pattern` | `"none"` \| `"dots"` \| `"grid"` \| `"noise"` - full-bleed vector |

Layout notes: `bold-brand` back uses `accentColor` as the full-bleed background. All text, QR codes and borders are laid out inside the 0.125" safe zone; content that does not fit shrinks (down to 50%) and then drops trailing contact lines.

## Error envelope (every non-2xx)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [ { "path": "theme.bgColor", "message": "Expected #RGB or #RRGGBB" } ] } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query failed schema validation (`details[]` lists paths) |
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 400 | `INVALID_TOKEN` | Share token malformed / corrupt / outdated |
| 403 | `CORS_ORIGIN_DENIED` | Browser origin not in `FRONTEND_URL` |
| 404 | `NOT_FOUND` | Unknown route |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 64 KB |
| 422 | `QR_URL_INVALID` | `qrType="url"` with no valid http(s) URL |
| 422 | `QR_EMPTY` | `qrType="vcard"` but nothing to encode |
| 422 | `QR_TOO_LARGE` | Data does not fit a QR at error-correction H |
| 429 | `RATE_LIMITED` | Export limit (default 20 / 10 min / IP) or API limit (300 / 15 min / IP). See `RateLimit-*` / `Retry-After` headers |
| 500 | `INTERNAL_ERROR` | Unexpected |

## `GET /health`

`200` → `{ "status": "ok", "timestamp": 1731672000000 }`  
No rate limit, no body parsing. Call it on page load to wake a sleeping Render instance.

## `POST /api/export/pdf?cropMarks=true|false`

- Body: `CardConfig`. Query `cropMarks` optional, default `false`.
- `200 application/pdf`, `Content-Disposition: attachment; filename="business-cards-print.pdf"`
- 2 pages: page 1 = front, page 2 = back. Vector, fonts embedded (subset), RGB.
- Page size incl. 0.125" bleed: US `3.75" x 2.25"` (270x162pt), EU `91.35mm x 61.35mm`; swapped for `vertical`. `BleedBox` = full page, `TrimBox` = trimmed card.
- Backgrounds and patterns extend to the bleed edge; text/QR stay inside the safe zone. `paperTexture` is not rendered.
- `cropMarks=true`: 0.25pt hairline ticks in the bleed corners, aligned to the trim lines (black on light backgrounds, white on dark).

## `POST /api/export/png[?includeTexture=true]`

- Body: `CardConfig`.
- `200 application/zip`, filename `business-cards-300dpi.zip` containing `card-front-300dpi.png` and `card-back-300dpi.png`.
- 300 DPI, bleed included: US `1125 x 675` px (`675 x 1125` vertical), EU `1079 x 725`. PNGs carry 300 DPI `pHYs` metadata.
- `includeTexture` (default `false`) adds a preview-style paper texture overlay.

## `POST /api/qr`

- Body: `CardConfig` (uses `back.qrType`, `back.customUrl`, `front`, and `theme`; ignores `showQrCode`).
- `200`:

```json
{
  "svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 77 77\" ...>...</svg>",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

- Error-correction level **H**, 4-module quiet zone. Modules are `accentColor` when it has >= 4.5:1 contrast on `bgColor`, otherwise `textColor`; light plate = `bgColor` (white if neither ink is dark enough). `dataUrl` is a 512px PNG.

## `POST /api/share`

- Body: `CardConfig`. `201` → `{ "token": "v1.<base64url>" }`
- Stateless: the config is `JSON → lz-string → base64url`. Nothing is stored, so tokens survive Render restarts. Tokens are ~500-900 chars (max accepted: 4096).

## `GET /api/share/:token`

- `200` → `{ "config": <CardConfig> }` (re-validated on decode)
- `400 INVALID_TOKEN` if malformed, tampered with, or no longer matches the schema.

## Frontend snippets

```ts
// Wake Render as soon as the app loads (fire-and-forget)
useEffect(() => { fetch(`${API}/health`).catch(() => {}); }, []);

// Download a PDF / ZIP
async function download(path: string, config: CardConfig, filename: string) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw (await res.json()).error;   // { code, message, details? }
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
// download("/api/export/pdf?cropMarks=true", cfg, "business-cards-print.pdf")
// download("/api/export/png", cfg, "business-cards-300dpi.zip")
```

Share links: use the token in a path (`/s/${token}`) or query it with `encodeURIComponent(token)`; it only contains `A-Za-z0-9._-`.
