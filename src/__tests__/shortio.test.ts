import { ShortioClient, createClient, createSecure } from '../shortio';
import type { CreateLinkRequest, ExpandLinkRequest, ConversionTrackingOptions } from '../types';
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

const worker = setupWorker();

// Mock crypto key for deterministic output
const mockCryptoKey = {
  algorithm: { name: 'AES-GCM', length: 128 },
  extractable: true,
  type: 'secret',
  usages: ['encrypt', 'decrypt']
} as unknown as CryptoKey;

describe('ShortioClient', () => {
  let client: ShortioClient;
  const mockConfig = {
    publicKey: 'test-public-key'
  };

  beforeAll(async () => {
    await worker.start({ quiet: true, onUnhandledRequest: 'bypass' });
  });

  afterAll(() => {
    worker.stop();
  });

  beforeEach(() => {
    client = new ShortioClient(mockConfig);

    // Mock crypto.subtle methods for deterministic output
    vi.spyOn(crypto.subtle, 'generateKey').mockResolvedValue(mockCryptoKey);
    vi.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(32));
    vi.spyOn(crypto.subtle, 'exportKey').mockResolvedValue(new ArrayBuffer(16));
    vi.spyOn(crypto, 'getRandomValues').mockReturnValue(new Uint8Array(12));

    // Mock sendBeacon
    vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);

    // Reset URL to clean state
    history.replaceState({}, '', window.location.pathname);
  });

  afterEach(() => {
    worker.resetHandlers();
    vi.restoreAllMocks();
  });

  describe('createLink', () => {
    it('should create a link successfully', async () => {
      const mockResponse = {
        shortURL: 'https://9qr.de/abc123',
        originalURL: 'https://example.com',
        path: 'abc123',
        title: 'Example',
        domain: '9qr.de',
        createdAt: '2023-01-01T00:00:00.000Z',
        DomainId: 1,
        LinkId: 123
      };

      let capturedRequest: Request | null = null;
      worker.use(
        http.post('https://api.short.io/links/public', async ({ request }) => {
          capturedRequest = request.clone();
          return HttpResponse.json(mockResponse);
        })
      );

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'Example'
      };

      const result = await client.createLink(request);

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get('Authorization')).toBe('test-public-key');
      expect(capturedRequest!.headers.get('Content-Type')).toBe('application/json');
      const body = await capturedRequest!.json();
      expect(body).toEqual(request);
      expect(result).toEqual(mockResponse);
    });

    it('should send all optional parameters', async () => {
      let capturedBody: unknown = null;
      worker.use(
        http.post('https://api.short.io/links/public', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        })
      );

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        path: 'custom',
        title: 'Title',
        tags: ['tag1', 'tag2'],
        folderId: 'folder-1',
        cloaking: true,
        password: 'secret',
        passwordContact: true,
        redirectType: 301,
        utmSource: 'twitter',
        utmMedium: 'social',
        utmCampaign: 'launch',
        utmContent: 'cta',
        utmTerm: 'sdk',
        androidURL: 'https://play.google.com/app',
        iphoneURL: 'https://apps.apple.com/app',
        clicksLimit: 100,
        skipQS: true,
        archived: false,
        splitURL: 'https://example.com/b',
        splitPercent: 50,
        integrationGA: 'UA-123',
        integrationGTM: 'GTM-123',
        integrationFB: 'fb-pixel',
        integrationAdroll: 'adroll-id',
      };

      await client.createLink(request);

      expect(capturedBody).toEqual(request);
    });

    it('should handle API errors', async () => {
      worker.use(
        http.post('https://api.short.io/links/public', () => {
          return HttpResponse.json({ error: 'Invalid URL' }, { status: 400 });
        })
      );

      const request: CreateLinkRequest = {
        originalURL: 'invalid-url',
        domain: '9qr.de'
      };

      await expect(client.createLink(request)).rejects.toThrow('Invalid URL');
    });

    it('should prefer message over error in API error response', async () => {
      worker.use(
        http.post('https://api.short.io/links/public', () => {
          return HttpResponse.json(
            { error: 'validation_error', message: 'Domain is required' },
            { status: 422 }
          );
        })
      );

      await expect(client.createLink({
        originalURL: 'https://example.com',
        domain: ''
      })).rejects.toThrow('Domain is required');
    });

    it('should handle fetch rejection (network failure)', async () => {
      worker.use(
        http.post('https://api.short.io/links/public', () => {
          return HttpResponse.error();
        })
      );

      await expect(client.createLink({
        originalURL: 'https://example.com',
        domain: '9qr.de'
      })).rejects.toThrow('Failed to fetch');
    });
  });

  describe('expandLink', () => {
    it('should expand a link successfully', async () => {
      const mockResponse = {
        originalURL: 'https://example.com',
        shortURL: 'https://9qr.de/abc123',
        path: 'abc123',
        title: 'Example',
        domain: '9qr.de',
        createdAt: '2023-01-01T00:00:00.000Z',
        DomainId: 1,
        LinkId: 123,
        clicks: 42
      };

      let capturedRequest: Request | null = null;
      worker.use(
        http.get('https://api.short.io/links/expand', async ({ request }) => {
          capturedRequest = request.clone();
          return HttpResponse.json(mockResponse);
        })
      );

      const request: ExpandLinkRequest = {
        domain: '9qr.de',
        path: 'abc123'
      };

      const result = await client.expandLink(request);

      const url = new URL(capturedRequest!.url);
      expect(url.searchParams.get('domain')).toBe('9qr.de');
      expect(url.searchParams.get('path')).toBe('abc123');
      expect(capturedRequest!.headers.get('Authorization')).toBe('test-public-key');
      expect(result).toEqual(mockResponse);
    });

    it('should handle network errors', async () => {
      worker.use(
        http.get('https://api.short.io/links/expand', () => {
          return new HttpResponse('Server Error', {
            status: 500,
            statusText: 'Internal Server Error'
          });
        })
      );

      const request: ExpandLinkRequest = {
        domain: '9qr.de',
        path: 'abc123'
      };

      await expect(client.expandLink(request)).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('createClient', () => {
    it('should create a client instance', () => {
      const instance = createClient(mockConfig);
      expect(instance).toBeInstanceOf(ShortioClient);
    });
  });

  describe('configuration', () => {
    it('should use custom base URL', async () => {
      const customClient = new ShortioClient({
        publicKey: 'test-key',
        baseUrl: 'https://custom.api.url'
      });

      let capturedUrl = '';
      worker.use(
        http.post('https://custom.api.url/links/public', async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({});
        })
      );

      await customClient.createLink({
        originalURL: 'https://example.com',
        domain: '9qr.de'
      });

      expect(capturedUrl).toBe('https://custom.api.url/links/public');
    });

    it('should default base URL to https://api.short.io', async () => {
      let capturedUrl = '';
      worker.use(
        http.get('https://api.short.io/links/expand', async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({});
        })
      );

      await client.expandLink({ domain: '9qr.de', path: 'test' });

      expect(capturedUrl).toContain('https://api.short.io/');
    });
  });

  describe('trackConversion', () => {
    it('should track conversion successfully with clid in URL', () => {
      history.replaceState({}, '', '?clid=test-click-id');

      const options: ConversionTrackingOptions = {
        domain: 'example.com',
        conversionId: 'purchase'
      };

      const result = client.trackConversion(options);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        'https://example.com/.shortio/conversion?clid=test-click-id&c=purchase'
      );
      expect(result).toEqual({
        success: true,
        conversionId: 'purchase',
        clid: 'test-click-id',
        domain: 'example.com'
      });
    });

    it('should track conversion without conversionId', () => {
      history.replaceState({}, '', '?clid=test-click-id');

      const options: ConversionTrackingOptions = {
        domain: 'example.com'
      };

      const result = client.trackConversion(options);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        'https://example.com/.shortio/conversion?clid=test-click-id'
      );
      expect(result).toEqual({
        success: true,
        clid: 'test-click-id',
        domain: 'example.com'
      });
    });

    it('should return failure when no clid in URL', () => {
      const options: ConversionTrackingOptions = {
        domain: 'example.com',
        conversionId: 'purchase'
      };

      const result = client.trackConversion(options);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        domain: 'example.com'
      });
    });

    it('should handle errors gracefully', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      vi.spyOn(navigator, 'sendBeacon').mockImplementation(() => {
        throw new Error('Network error');
      });

      const options: ConversionTrackingOptions = {
        domain: 'example.com',
        conversionId: 'purchase'
      };

      const result = client.trackConversion(options);

      expect(result).toEqual({
        success: false,
        domain: 'example.com'
      });
    });

    it('should extract clid when URL has multiple query params', () => {
      history.replaceState({}, '', '?utm_source=twitter&clid=abc&ref=home');

      const result = client.trackConversion({ domain: 'example.com' });

      expect(result.success).toBe(true);
      expect(result.clid).toBe('abc');
    });
  });

  describe('getClickId', () => {
    it('should return clid from URL params', () => {
      history.replaceState({}, '', '?clid=test-click-id&other=param');

      const result = client.getClickId();

      expect(result).toBe('test-click-id');
    });

    it('should return null when no clid in URL', () => {
      history.replaceState({}, '', '?other=param');

      const result = client.getClickId();

      expect(result).toBeNull();
    });

    it('should return null when search string is empty', () => {
      expect(client.getClickId()).toBeNull();
    });
  });

  describe('createEncryptedLink', () => {
    it('should create encrypted link successfully', async () => {
      const mockResponse = {
        shortURL: 'https://9qr.de/abc123',
        originalURL: 'https://example.com',
        path: 'abc123',
        title: 'Example',
        domain: '9qr.de',
        createdAt: '2023-01-01T00:00:00.000Z',
        DomainId: 1,
        LinkId: 123,
        isEncrypted: true,
        hasPassword: true
      };

      let capturedBody: Record<string, unknown> | null = null;
      worker.use(
        http.post('https://api.short.io/links/public', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(mockResponse);
        })
      );

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'Example',
        password: 'secret123'
      };

      const result = await client.createEncryptedLink(request);

      expect(capturedBody!.originalURL).toMatch(/^shortsecure:\/\//);
      expect(result.shortURL).toMatch(/^https:\/\/9qr\.de\/abc123#/);
      expect(result.originalURL).toBe(mockResponse.originalURL);
    });

    it('should not send original URL in plaintext', async () => {
      let capturedBody: Record<string, unknown> | null = null;
      worker.use(
        http.post('https://api.short.io/links/public', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ shortURL: 'https://9qr.de/x' });
        })
      );

      await client.createEncryptedLink({
        originalURL: 'https://secret.example.com',
        domain: '9qr.de'
      });

      expect(capturedBody!.originalURL).not.toBe('https://secret.example.com');
      expect(capturedBody!.originalURL).toMatch(/^shortsecure:\/\//);
    });

    it('should preserve other request fields in encrypted link', async () => {
      let capturedBody: Record<string, unknown> | null = null;
      worker.use(
        http.post('https://api.short.io/links/public', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ shortURL: 'https://9qr.de/x' });
        })
      );

      await client.createEncryptedLink({
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'My Title',
        tags: ['encrypted']
      });

      expect(capturedBody!.domain).toBe('9qr.de');
      expect(capturedBody!.title).toBe('My Title');
      expect(capturedBody!.tags).toEqual(['encrypted']);
    });

    it('should handle encrypted link creation errors', async () => {
      worker.use(
        http.post('https://api.short.io/links/public', () => {
          return HttpResponse.json({ error: 'Invalid password' }, { status: 400 });
        })
      );

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        password: 'weak'
      };

      await expect(client.createEncryptedLink(request)).rejects.toThrow('Invalid password');
    });
  });

  describe('trackConversion with value', () => {
    it('should append value as v param in beacon URL', () => {
      history.replaceState({}, '', '?clid=test-click-id');

      const result = client.trackConversion({
        domain: 'example.com',
        conversionId: 'purchase',
        value: 49.99,
      });

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        'https://example.com/.shortio/conversion?clid=test-click-id&c=purchase&v=49.99'
      );
      expect(result).toEqual({
        success: true,
        conversionId: 'purchase',
        clid: 'test-click-id',
        domain: 'example.com',
        value: 49.99,
      });
    });

    it('should send value without conversionId', () => {
      history.replaceState({}, '', '?clid=test-click-id');

      const result = client.trackConversion({
        domain: 'example.com',
        value: 10,
      });

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        'https://example.com/.shortio/conversion?clid=test-click-id&v=10'
      );
      expect(result.value).toBe(10);
    });

    it('should not include v param when value is undefined', () => {
      history.replaceState({}, '', '?clid=test-click-id');

      client.trackConversion({ domain: 'example.com' });

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).not.toContain('&v=');
    });
  });

  describe('declarative conversion tracking', () => {
    let observer: ReturnType<typeof client.observeConversions>;

    afterEach(() => {
      observer?.disconnect();
      document.body.innerHTML = '';
    });

    it('should bind to <form> on submit', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const form = document.createElement('form');
      form.setAttribute('data-shortio-conversion', 'signup');
      document.body.appendChild(form);

      observer = client.observeConversions({ domain: 'example.com' });
      form.dispatchEvent(new Event('submit'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=signup')
      );
    });

    it('should bind to <button> on click', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'cta');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      button.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=cta')
      );
    });

    it('should bind to <a> on click', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const anchor = document.createElement('a');
      anchor.setAttribute('data-shortio-conversion', 'link-click');
      document.body.appendChild(anchor);

      observer = client.observeConversions({ domain: 'example.com' });
      anchor.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=link-click')
      );
    });

    it('should bind to <input> on change', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('data-shortio-conversion', 'field-change');
      document.body.appendChild(input);

      observer = client.observeConversions({ domain: 'example.com' });
      input.dispatchEvent(new Event('change'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=field-change')
      );
    });

    it('should bind to <input type="submit"> on click', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const input = document.createElement('input');
      input.type = 'submit';
      input.setAttribute('data-shortio-conversion', 'form-submit');
      document.body.appendChild(input);

      observer = client.observeConversions({ domain: 'example.com' });
      input.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=form-submit')
      );
    });

    it('should read data-shortio-conversion-value and send as v param', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'purchase');
      button.setAttribute('data-shortio-conversion-value', '29.99');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      button.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('v=29.99')
      );
    });

    it('should ignore invalid/NaN value attributes', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'purchase');
      button.setAttribute('data-shortio-conversion-value', 'not-a-number');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      button.dispatchEvent(new Event('click'));

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).not.toContain('&v=');
    });

    it('should treat empty data-shortio-conversion as undefined conversionId', () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', '');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      button.dispatchEvent(new Event('click'));

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).not.toContain('&c=');
    });

    it('should pick up dynamically added elements via MutationObserver', async () => {
      history.replaceState({}, '', '?clid=test-click-id');
      observer = client.observeConversions({ domain: 'example.com' });

      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'dynamic');
      document.body.appendChild(button);

      // Wait for MutationObserver to process
      await new Promise((resolve) => setTimeout(resolve, 0));

      button.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=dynamic')
      );
    });

    it('should pick up descendants of dynamically added elements', async () => {
      history.replaceState({}, '', '?clid=test-click-id');
      observer = client.observeConversions({ domain: 'example.com' });

      const wrapper = document.createElement('div');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'nested');
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);

      await new Promise((resolve) => setTimeout(resolve, 0));

      button.dispatchEvent(new Event('click'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        expect.stringContaining('clid=test-click-id&c=nested')
      );
    });

    it('should remove all listeners and stop observing on disconnect()', async () => {
      history.replaceState({}, '', '?clid=test-click-id');
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'cta');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      observer.disconnect();

      button.dispatchEvent(new Event('click'));
      expect(navigator.sendBeacon).not.toHaveBeenCalled();

      // Dynamically added elements should not be bound after disconnect
      const newButton = document.createElement('button');
      newButton.setAttribute('data-shortio-conversion', 'new');
      document.body.appendChild(newButton);

      await new Promise((resolve) => setTimeout(resolve, 0));

      newButton.dispatchEvent(new Event('click'));
      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it('should work without clid in URL (conversion returns failure)', () => {
      const button = document.createElement('button');
      button.setAttribute('data-shortio-conversion', 'cta');
      document.body.appendChild(button);

      observer = client.observeConversions({ domain: 'example.com' });
      button.dispatchEvent(new Event('click'));

      // sendBeacon should not be called since trackConversion returns early without clid
      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });
  });

  describe('createSecure', () => {
    it('should return securedOriginalURL with shortsecure:// protocol', async () => {
      const result = await createSecure('https://example.com');

      expect(result.securedOriginalURL).toMatch(/^shortsecure:\/\//);
    });

    it('should return securedShortUrl starting with #', async () => {
      const result = await createSecure('https://example.com');

      expect(result.securedShortUrl).toMatch(/^#/);
    });

    it('should call crypto.subtle.generateKey with AES-GCM', async () => {
      await createSecure('https://example.com');

      expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 128 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should propagate crypto errors', async () => {
      vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValueOnce(new Error('Crypto not available'));

      await expect(createSecure('https://example.com')).rejects.toThrow('Crypto not available');
    });
  });
});
