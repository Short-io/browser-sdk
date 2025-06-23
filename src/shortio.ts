import type {
  ShortioConfig,
  CreateLinkRequest,
  CreateLinkResponse,
  ExpandLinkRequest,
  ExpandLinkResponse,
  ApiError
} from './types';

export class ShortioClient {
  private config: ShortioConfig;

  constructor(config: ShortioConfig) {
    this.config = {
      baseUrl: 'https://api.short.io/links',
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
    return this.makeRequest<CreateLinkResponse>('/public', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async expandLink(request: ExpandLinkRequest): Promise<ExpandLinkResponse> {
    const params = new URLSearchParams({
      domain: request.domain,
      path: request.path
    });

    return this.makeRequest<ExpandLinkResponse>(`/expand?${params}`);
  }
}

export function createClient(config: ShortioConfig): ShortioClient {
  return new ShortioClient(config);
}