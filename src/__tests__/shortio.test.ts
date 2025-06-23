import { ShortioClient, createClient } from '../shortio';
import type { CreateLinkRequest, ExpandLinkRequest } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('ShortioClient', () => {
  let client: ShortioClient;
  const mockConfig = {
    publicKey: 'test-public-key'
  };

  beforeEach(() => {
    client = new ShortioClient(mockConfig);
    (fetch as jest.Mock).mockClear();
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
});