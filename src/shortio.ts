import type {
  ShortioConfig,
  CreateLinkRequest,
  CreateLinkResponse,
  ExpandLinkRequest,
  ExpandLinkResponse,
  ApiError,
  ConversionTrackingOptions,
  ConversionTrackingResult,
} from './types';

// Base64 encoding utility for ArrayBuffer
function base64encode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const createSecure = async (originalURL: string): Promise<{ securedOriginalURL: string; securedShortUrl: string }> => {
  try {
    const cryptoKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, [
      "encrypt",
      "decrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const urlData = new TextEncoder().encode(originalURL);
    const encryptedUrl = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, urlData);
    const encryptedUrlBase64 = base64encode(encryptedUrl);
    const encryptedIvBase64 = base64encode(iv.buffer);
    const securedOriginalURL = `shortsecure://${encryptedUrlBase64}?${encryptedIvBase64}`;
    const exportedKey = await crypto.subtle.exportKey("raw", cryptoKey);
    const keyBase64 = base64encode(exportedKey);
    const securedShortUrl = `#${keyBase64}`;
    return { securedOriginalURL, securedShortUrl };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export class ShortioClient {
  private config: ShortioConfig;

  constructor(config: ShortioConfig) {
    this.config = {
      baseUrl: 'https://api.short.io',
      ...config
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.config.publicKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(error.message || error.error);
    }

    return response.json();
  }

  async createLink(request: CreateLinkRequest): Promise<CreateLinkResponse> {
    return this.makeRequest<CreateLinkResponse>('/links/public', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async expandLink(request: ExpandLinkRequest): Promise<ExpandLinkResponse> {
    const params = new URLSearchParams({
      domain: request.domain,
      path: request.path
    });

    return this.makeRequest<ExpandLinkResponse>(`/links/expand?${params}`);
  }

  trackConversion(options: ConversionTrackingOptions): ConversionTrackingResult {
    const urlParams = new URLSearchParams(window.location.search);
    const clid = urlParams.get('clid');
    
    if (!clid) {
      return {
        success: false,
        domain: options.domain
      };
    }

    const conversionUrl = `https://${options.domain}/.shortio/conversion`;
    const params = new URLSearchParams({ clid });
    
    if (options.conversionId) {
      params.append('c', options.conversionId);
    }

    const fullUrl = `${conversionUrl}?${params}`;

    try {
      navigator.sendBeacon(fullUrl);
      
      return {
        success: true,
        conversionId: options.conversionId,
        clid,
        domain: options.domain
      };
    } catch {
      return {
        success: false,
        domain: options.domain
      };
    }
  }

  getClickId(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('clid');
  }

  async createEncryptedLink(request: CreateLinkRequest): Promise<CreateLinkResponse> {
    const { securedOriginalURL, securedShortUrl } = await createSecure(request.originalURL);
    
    const payload = {
      ...request,
      originalURL: securedOriginalURL,
    };

    const response = await this.makeRequest<CreateLinkResponse>('/links/public', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      ...response,
      shortURL: response.shortURL + securedShortUrl,
    };
  }
}

export function createClient(config: ShortioConfig): ShortioClient {
  return new ShortioClient(config);
}