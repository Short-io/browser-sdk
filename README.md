# Short.io Browser SDK

A lightweight TypeScript/JavaScript SDK for [Short.io](https://short.io)'s URL shortening API, designed for browser environments with public key authentication. Zero runtime dependencies.

## Installation

```bash
npm install @short.io/client-browser
```

## Quick Start

```typescript
import { createClient } from '@short.io/client-browser';

const client = createClient({
  publicKey: 'your-public-api-key'
});

// Create a short link
const link = await client.createLink({
  originalURL: 'https://example.com/very-long-url',
  domain: 'your-domain.com'
});
console.log(link.shortURL); // https://your-domain.com/abc123

// Expand a short link
const expanded = await client.expandLink({
  domain: 'your-domain.com',
  path: 'abc123'
});
console.log(expanded.originalURL); // https://example.com/very-long-url
```

## API Reference

### `createClient(config)`

Creates a new Short.io client instance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.publicKey` | `string` | Yes | Your Short.io public API key |
| `config.baseUrl` | `string` | No | Custom API base URL (default: `https://api.short.io`) |

### `client.createLink(request)`

Creates a new short link.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | Yes | Your Short.io domain |
| `originalURL` | `string` | Yes | The URL to shorten |
| `path` | `string` | No | Custom path for the short link |
| `title` | `string` | No | Link title |
| `tags` | `string[]` | No | Tags for organization |
| `folderId` | `string` | No | Folder ID |
| `cloaking` | `boolean` | No | Enable link cloaking |
| `password` | `string` | No | Password-protect the link |
| `passwordContact` | `boolean` | No | Require contact info with password |
| `redirectType` | `301 \| 302 \| 307 \| 308` | No | HTTP redirect status code |
| `utmSource` | `string` | No | UTM source parameter |
| `utmMedium` | `string` | No | UTM medium parameter |
| `utmCampaign` | `string` | No | UTM campaign parameter |
| `utmContent` | `string` | No | UTM content parameter |
| `utmTerm` | `string` | No | UTM term parameter |
| `androidURL` | `string` | No | Redirect URL for Android devices |
| `iphoneURL` | `string` | No | Redirect URL for iPhones |
| `clicksLimit` | `number` | No | Maximum number of clicks allowed |
| `skipQS` | `boolean` | No | Skip query string forwarding |
| `archived` | `boolean` | No | Create link as archived |
| `splitURL` | `string` | No | A/B test destination URL |
| `splitPercent` | `number` | No | A/B test traffic split percentage |
| `integrationAdroll` | `string` | No | AdRoll integration pixel |
| `integrationFB` | `string` | No | Facebook integration pixel |
| `integrationGA` | `string` | No | Google Analytics integration |
| `integrationGTM` | `string` | No | Google Tag Manager integration |

Returns `Promise<CreateLinkResponse>` with the full link object including `shortURL`, `secureShortURL`, `id`, and all configured properties.

### `client.expandLink(request)`

Expands a short link to get its details.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | Yes | The Short.io domain |
| `path` | `string` | Yes | The path of the short link |

Returns `Promise<ExpandLinkResponse>` (same shape as `CreateLinkResponse`).

### `client.createEncryptedLink(request)`

Creates an encrypted short link using AES-GCM encryption. The original URL is encrypted client-side before being sent to the API; the decryption key is placed in the URL fragment (hash) and never sent to the server.

Takes the same parameters as `createLink`. Returns `Promise<CreateLinkResponse>` where `shortURL` includes the `#key` fragment for decryption.

```typescript
const link = await client.createEncryptedLink({
  originalURL: 'https://sensitive-content.example.com/private',
  domain: 'your-domain.com'
});
// link.shortURL → https://your-domain.com/abc123#<base64-key>
```

### `client.trackConversion(options)`

Tracks a conversion event using `navigator.sendBeacon()`. Reads the `clid` (click ID) query parameter from the current page URL to attribute the conversion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | Yes | Your Short.io domain |
| `conversionId` | `string` | No | Custom conversion identifier |

Returns `ConversionTrackingResult`:

```typescript
{
  success: boolean;    // true if clid was found and beacon sent
  conversionId?: string;
  clid?: string;
  domain: string;
}
```

```typescript
const result = client.trackConversion({
  domain: 'your-domain.com',
  conversionId: 'signup'
});

if (result.success) {
  console.log('Conversion tracked for click:', result.clid);
}
```

### `client.getClickId()`

Returns the `clid` query parameter from the current page URL, or `null` if not present.

```typescript
const clickId = client.getClickId();
```

## Bundle Formats

| Format | File | Use case |
|--------|------|----------|
| ES Modules | `dist/index.esm.js` | Modern bundlers (Vite, webpack, etc.) |
| CommonJS | `dist/index.js` | Node.js / legacy bundlers |
| UMD | `dist/index.umd.js` | Direct `<script>` tag usage |

### Direct Browser Usage (UMD)

```html
<script src="https://unpkg.com/@short.io/client-browser/dist/index.umd.js"></script>
<script>
  const client = ShortioClient.createClient({
    publicKey: 'your-public-api-key'
  });
</script>
```

## TypeScript

Full type definitions are included. All types are exported:

```typescript
import type {
  ShortioConfig,
  CreateLinkRequest,
  CreateLinkResponse,
  ExpandLinkRequest,
  ExpandLinkResponse,
  ConversionTrackingOptions,
  ConversionTrackingResult,
  ApiError
} from '@short.io/client-browser';
```

## Error Handling

API errors throw a standard `Error` with the message from the Short.io API response:

```typescript
try {
  const link = await client.createLink({
    originalURL: 'https://example.com',
    domain: 'your-domain.com'
  });
} catch (error) {
  console.error('Failed to create link:', error.message);
}
```

## Getting Your API Key

1. Visit your [Short.io dashboard](https://app.short.io)
2. Go to **Integrations & API**
3. Create a new **public** API key for your domain

> **Security:** Public keys are safe to use in browser environments but have limited permissions. Never use private API keys in client-side code.

## Browser Support

Requires browsers supporting:
- [Fetch API](https://caniuse.com/fetch)
- [Web Crypto API](https://caniuse.com/cryptography) (for encrypted links)
- [Beacon API](https://caniuse.com/beacon) (for conversion tracking)

## License

MIT
