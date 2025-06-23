export interface ShortioConfig {
  publicKey: string;
  baseUrl?: string;
}

export interface CreateLinkRequest {
  originalURL: string;
  domain: string;
  path?: string;
  title?: string;
  tags?: string[];
  allowDuplicates?: boolean;
}

export interface CreateLinkResponse {
  shortURL: string;
  originalURL: string;
  path: string;
  title: string;
  domain: string;
  createdAt: string;
  DomainId: number;
  LinkId: number;
}

export interface ExpandLinkRequest {
  domain: string;
  path: string;
}

export interface ExpandLinkResponse {
  originalURL: string;
  shortURL: string;
  path: string;
  title: string;
  domain: string;
  createdAt: string;
  DomainId: number;
  LinkId: number;
  clicks: number;
}

export interface ApiError {
  error: string;
  message?: string;
}