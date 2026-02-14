import { ShortioClient, createClient, createSecure } from '../shortio';
import type { CreateLinkRequest, ExpandLinkRequest, ConversionTrackingOptions } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock navigator.sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn()
});

// Mock crypto.subtle for Node.js test environment
const mockCrypto = {
  subtle: {
    generateKey: jest.fn().mockResolvedValue({
      algorithm: { name: 'AES-GCM', length: 128 },
      extractable: true,
      type: 'secret',
      usages: ['encrypt', 'decrypt']
    }),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(16))
  },
  getRandomValues: jest.fn().mockReturnValue(new Uint8Array(12))
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock TextEncoder
Object.defineProperty(global, 'TextEncoder', {
  value: class TextEncoder {
    encoding = 'utf-8';
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf8'));
    }
    encodeInto() {
      throw new Error('encodeInto not implemented in mock');
    }
  },
  writable: true
});

describe('ShortioClient', () => {
  let client: ShortioClient;
  const mockConfig = {
    publicKey: 'test-public-key'
  };

  beforeEach(() => {
    client = new ShortioClient(mockConfig);
    (fetch as jest.Mock).mockClear();
    (navigator.sendBeacon as jest.Mock).mockClear();
    
    // Mock window.location.search
    delete (window as any).location;
    (window as any).location = { search: '' };
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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'Example'
      };

      const result = await client.createLink(request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.short.io/links/public',
        {
          method: 'POST',
          headers: {
            'Authorization': 'test-public-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should send all optional parameters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

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

      const sentBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(sentBody).toEqual(request);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid URL' })
      });

      const request: CreateLinkRequest = {
        originalURL: 'invalid-url',
        domain: '9qr.de'
      };

      await expect(client.createLink(request)).rejects.toThrow('Invalid URL');
    });

    it('should prefer message over error in API error response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({ error: 'validation_error', message: 'Domain is required' })
      });

      await expect(client.createLink({
        originalURL: 'https://example.com',
        domain: ''
      })).rejects.toThrow('Domain is required');
    });

    it('should handle fetch rejection (network failure)', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: ExpandLinkRequest = {
        domain: '9qr.de',
        path: 'abc123'
      };

      const result = await client.expandLink(request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.short.io/links/expand?domain=9qr.de&path=abc123',
        {
          headers: {
            'Authorization': 'test-public-key',
            'Content-Type': 'application/json'
          }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Parse error'); }
      });

      const request: ExpandLinkRequest = {
        domain: '9qr.de',
        path: 'abc123'
      };

      await expect(client.expandLink(request)).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('createClient', () => {
    it('should create a client instance', () => {
      const client = createClient(mockConfig);
      expect(client).toBeInstanceOf(ShortioClient);
    });
  });

  describe('configuration', () => {
    it('should use custom base URL', async () => {
      const customClient = new ShortioClient({
        publicKey: 'test-key',
        baseUrl: 'https://custom.api.url'
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await customClient.createLink({
        originalURL: 'https://example.com',
        domain: '9qr.de'
      });

      expect((fetch as jest.Mock).mock.calls[0][0]).toBe(
        'https://custom.api.url/links/public'
      );
    });

    it('should default base URL to https://api.short.io', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.expandLink({ domain: '9qr.de', path: 'test' });

      expect((fetch as jest.Mock).mock.calls[0][0]).toContain('https://api.short.io/');
    });
  });

  describe('trackConversion', () => {
    it('should track conversion successfully with clid in URL', () => {
      (window as any).location.search = '?clid=test-click-id';
      (navigator.sendBeacon as jest.Mock).mockReturnValue(true);

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
      (window as any).location.search = '?clid=test-click-id';
      (navigator.sendBeacon as jest.Mock).mockReturnValue(true);

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
      (window as any).location.search = '';

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
      (window as any).location.search = '?clid=test-click-id';
      (navigator.sendBeacon as jest.Mock).mockImplementation(() => {
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
      (window as any).location.search = '?utm_source=twitter&clid=abc&ref=home';
      (navigator.sendBeacon as jest.Mock).mockReturnValue(true);

      const result = client.trackConversion({ domain: 'example.com' });

      expect(result.success).toBe(true);
      expect(result.clid).toBe('abc');
    });
  });

  describe('getClickId', () => {
    it('should return clid from URL params', () => {
      (window as any).location.search = '?clid=test-click-id&other=param';

      const result = client.getClickId();

      expect(result).toBe('test-click-id');
    });

    it('should return null when no clid in URL', () => {
      (window as any).location.search = '?other=param';

      const result = client.getClickId();

      expect(result).toBeNull();
    });

    it('should return null when search string is empty', () => {
      (window as any).location.search = '';

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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'Example',
        password: 'secret123'
      };

      const result = await client.createEncryptedLink(request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.short.io/links/public',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'test-public-key',
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('shortsecure://')
        })
      );

      expect(result.shortURL).toMatch(/^https:\/\/9qr\.de\/abc123#/);
      expect(result.originalURL).toBe(mockResponse.originalURL);
    });

    it('should not send original URL in plaintext', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shortURL: 'https://9qr.de/x' })
      });

      await client.createEncryptedLink({
        originalURL: 'https://secret.example.com',
        domain: '9qr.de'
      });

      const sentBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(sentBody.originalURL).not.toBe('https://secret.example.com');
      expect(sentBody.originalURL).toMatch(/^shortsecure:\/\//);
    });

    it('should preserve other request fields in encrypted link', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shortURL: 'https://9qr.de/x' })
      });

      await client.createEncryptedLink({
        originalURL: 'https://example.com',
        domain: '9qr.de',
        title: 'My Title',
        tags: ['encrypted']
      });

      const sentBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(sentBody.domain).toBe('9qr.de');
      expect(sentBody.title).toBe('My Title');
      expect(sentBody.tags).toEqual(['encrypted']);
    });

    it('should handle encrypted link creation errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid password' })
      });

      const request: CreateLinkRequest = {
        originalURL: 'https://example.com',
        domain: '9qr.de',
        password: 'weak'
      };

      await expect(client.createEncryptedLink(request)).rejects.toThrow('Invalid password');
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

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 128 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should propagate crypto errors', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValueOnce(new Error('Crypto not available'));

      await expect(createSecure('https://example.com')).rejects.toThrow('Crypto not available');
    });
  });
});