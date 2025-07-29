import { ShortioClient, createClient } from '../shortio';
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
    it('should use custom base URL', () => {
      const customClient = new ShortioClient({
        publicKey: 'test-key',
        baseUrl: 'https://custom.api.url'
      });

      expect(customClient).toBeInstanceOf(ShortioClient);
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
});