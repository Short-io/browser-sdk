# Short.io Browser SDK

A lightweight TypeScript/JavaScript SDK for Short.io's URL shortening API, designed specifically for browser environments with public key authentication.

## Features

- 🌐 **Browser-first**: Optimized for client-side applications
- 🔑 **Public Key Auth**: Works with Short.io public API keys
- 📦 **Lightweight**: Minimal dependencies, small bundle size
- 🎯 **TypeScript**: Full type safety with TypeScript support
- 🚀 **Modern**: Uses fetch API and ES modules

## Installation

```bash
npm install @short.io/client-browser
```

## Quick Start

```typescript
import { createClient } from '@short.io/client-browser';

// Initialize the client with your public API key
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

**Parameters:**
- `config.publicKey` (string): Your Short.io public API key
- `config.baseUrl` (string, optional): Custom API base URL (defaults to `https://api.short.io/links`)

### `client.createLink(request)`

Creates a new short link.

**Parameters:**
- `request.originalURL` (string): The URL to shorten
- `request.domain` (string): Your Short.io domain
- `request.path` (string, optional): Custom path for the short link
- `request.title` (string, optional): Title for the link
- `request.tags` (string[], optional): Tags for organization
- `request.allowDuplicates` (boolean, optional): Allow duplicate links

**Returns:** Promise<CreateLinkResponse>

### `client.expandLink(request)`

Expands a short link to get its details.

**Parameters:**
- `request.domain` (string): The Short.io domain
- `request.path` (string): The path of the short link

**Returns:** Promise<ExpandLinkResponse>

## Usage Examples

### Basic Link Creation

```typescript
const link = await client.createLink({
  originalURL: 'https://github.com/Short-io/client-browser',
  domain: 'your-domain.com',
  title: 'Short.io Browser SDK'
});
```

### Custom Path

```typescript
const link = await client.createLink({
  originalURL: 'https://docs.short.io',
  domain: 'your-domain.com',
  path: 'docs'
});
```

### With Tags

```typescript
const link = await client.createLink({
  originalURL: 'https://example.com',
  domain: 'your-domain.com',
  tags: ['marketing', 'campaign-2024']
});
```

### Error Handling

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

## Browser Support

This SDK works in all modern browsers that support:
- Fetch API
- ES2018 features
- Promises/async-await

For older browsers, you may need polyfills for the fetch API.

## Bundle Formats

The SDK is available in multiple formats:

- **ES Modules**: `dist/index.esm.js` (recommended for modern bundlers)
- **CommonJS**: `dist/index.js` (Node.js compatibility)
- **UMD**: `dist/index.umd.js` (direct browser usage)

### Direct Browser Usage

```html
<script src="https://unpkg.com/@short.io/client-browser/dist/index.umd.js"></script>
<script>
  const client = ShortioClient.createClient({
    publicKey: 'your-public-api-key'
  });
</script>
```

## Getting Your API Key

1. Visit your [Short.io dashboard](https://app.short.io)
2. Go to Integrations & API
3. Create a new public API key for your domain

⚠️ **Security Note**: Public keys are safe to use in browser environments but have limited permissions. Never use private API keys in client-side code.

## TypeScript Support

The SDK includes full TypeScript definitions. All methods and responses are fully typed:

```typescript
import type { CreateLinkRequest, CreateLinkResponse } from '@short.io/client-browser';

const request: CreateLinkRequest = {
  originalURL: 'https://example.com',
  domain: 'your-domain.com'
};

const response: CreateLinkResponse = await client.createLink(request);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © Short.io