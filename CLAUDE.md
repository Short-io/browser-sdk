# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser SDK for Short.io API (`@short.io/client-browser`). Zero runtime dependencies, browser-first, public key auth only.

## Commands

```bash
pnpm build           # Rollup build → CJS, ESM, UMD in dist/
pnpm dev             # Rollup watch mode
pnpm test            # Vitest in a real Chromium browser (@vitest/browser + Playwright)
pnpm test:watch      # Vitest watch mode
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint src/**/*.ts
```

Run a single test by name: `pnpm test -t 'creates a link'`

Tests run in a real browser via Playwright. If the Chromium binary is missing, run `pnpm exec playwright install chromium` once.

## Architecture

Four source files in `src/`:

- **types.ts** — All TypeScript interfaces (`ShortioConfig`, `CreateLinkRequest/Response`, `ExpandLinkRequest/Response`, `ConversionTrackingOptions/Result`, `ApiError`)
- **shortio.ts** — Core implementation: `ShortioClient` class and `createSecure()` encryption utility
- **index.ts** — Public API surface: re-exports `ShortioClient`, `createClient()` factory, and all types
- **`__tests__/shortio.test.ts`** — Full test suite. HTTP is intercepted with MSW (`msw/browser` `setupWorker`); `navigator.sendBeacon` and `crypto.subtle` are stubbed with `vi.spyOn`

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
- Tests run in real Chromium (via `@vitest/browser` + Playwright), so browser APIs are native — only `crypto.subtle`/`sendBeacon` are spied and HTTP is mocked via MSW
