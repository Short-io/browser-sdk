export interface ShortioConfig {
  publicKey: string;
  baseUrl?: string;
}

export interface CreateLinkRequest {
  domain: string;
  originalURL: string;
  folderId?: string;
  cloaking?: boolean;
  password?: string;
  passwordContact?: boolean;
  redirectType?: 301 | 302 | 307 | 308;
  title?: string;
  tags?: string[];
  path?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  androidURL?: string;
  iphoneURL?: string;
  clicksLimit?: number;
  skipQS?: boolean;
  archived?: boolean;
  splitURL?: string;
  splitPercent?: number;
  integrationAdroll?: string;
  integrationFB?: string;
  integrationGA?: string;
  integrationGTM?: string;
}

export interface CreateLinkResponse {
  originalURL: string,
  cloaking: boolean,
  password: string | null,
  expiresAt: number | null,
  expiredURL: string | null,
  title: string | null,
  tags: string[],
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  utmTerm: string | null,
  utmContent: string | null,
  ttl: string | null,
  path: string,
  androidURL: string | null,
  iphoneURL: string | null,
  createdAt: number,
  clicksLimit: number | null,
  passwordContact: boolean,
  skipQS: boolean,
  archived: boolean,
  splitURL: string | null,
  splitPercent: number | null,
  integrationAdroll: string | null,
  integrationFB: string | null,
  integrationGA: string | null,
  integrationGTM: string | null,
  idString: string,
  id: string,
  shortURL: string,
  secureShortURL: string,
  redirectType: 301 | 302 | 307 | 308,
  FolderId: string | null,
  DomainId: number,
  OwnerId: number,
  hasPassword: boolean,
  User: {
    id: number,
    name: string | null,
    email: string,
    photoURL: string | null,
  },
  success: boolean,
  duplicate: boolean
}

export interface ExpandLinkRequest {
  domain: string;
  path: string;
}

export interface ExpandLinkResponse extends CreateLinkResponse {}

export interface ApiError {
  error: string;
  message?: string;
}

export interface ConversionTrackingOptions {
  conversionId?: string;
  domain: string;
}

export interface ConversionTrackingResult {
  success: boolean;
  conversionId?: string;
  clid?: string;
  domain: string;
}
