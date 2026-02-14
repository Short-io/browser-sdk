# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser SDK for Short.io API (`@short.io/client-browser`). Zero runtime dependencies, browser-first, public key auth only.

## Commands

```bash
npm run build        # Rollup build → CJS, ESM, UMD in dist/
npm run dev          # Rollup watch mode
npm test             # Jest with jsdom
npm run test:watch   # Jest watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/**/*.ts
```

Run a single test: `npx jest --testPathPattern='shortio.test'`

## Architecture

Four source files in `src/`:

- **types.ts** — All TypeScript interfaces (`ShortioConfig`, `CreateLinkRequest/Response`, `ExpandLinkRequest/Response`, `ConversionTrackingOptions/Result`, `ApiError`)
- **shortio.ts** — Core implementation: `ShortioClient` class and `createSecure()` encryption utility
- **index.ts** — Public API surface: re-exports `ShortioClient`, `createClient()` factory, and all types
- **`__tests__/shortio.test.ts`** — Full test suite with mocked `fetch`, `navigator.sendBeacon`, and `crypto.subtle`

### Key patterns

- `ShortioClient` wraps all HTTP calls with public key auth via `Authorization` header
- Encrypted links use Web Crypto API (AES-GCM) — key goes in URL fragment, not sent to server
- Conversion tracking uses `navigator.sendBeacon()` with `clid` query parameter from current URL
- Three build outputs via Rollup: CJS (`dist/index.js`), ESM (`dist/index.esm.js`), UMD (`dist/index.umd.js` as global `ShortioClient`)

## Conventions

- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- ESLint v9 config requires nullish coalescing (`??`) and optional chaining (`?.`)
- Explicit return types on functions (warning level)
- No `any` usage (warning level, relaxed in tests)
- Tests mock browser APIs (fetch, crypto.subtle, sendBeacon, TextEncoder) since Jest runs in jsdom
