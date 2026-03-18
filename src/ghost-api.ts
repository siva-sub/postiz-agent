import fetch from 'node-fetch';
import * as crypto from 'crypto';

/**
 * Direct Ghost Admin API client.
 * Used for operations that need to call Ghost directly without going through Postiz.
 * 
 * Supports: posts, tags, members, tiers, images, site info, and NQL queries.
 */
export interface GhostConfig {
  url: string;        // e.g., https://blog.example.com
  adminKey: string;   // Admin API key in format id:secret
}

export interface GhostPost {
  id: string;
  title: string;
  slug: string;
  html?: string;
  status: 'draft' | 'published' | 'scheduled' | 'sent';
  visibility: 'public' | 'members' | 'paid';
  published_at?: string;
  updated_at: string;
  created_at: string;
  url: string;
  feature_image?: string;
  feature_image_caption?: string;
  excerpt?: string;
  tags?: GhostTag[];
  authors?: GhostAuthor[];
  primary_author?: GhostAuthor;
  primary_tag?: GhostTag;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'internal';
  created_at: string;
  updated_at: string;
  count?: { posts: number };
}

export interface GhostMember {
  id: string;
  email: string;
  name?: string;
  note?: string;
  created_at: string;
  updated_at: string;
  subscriptions?: any[];
  tiers?: GhostTier[];
}

export interface GhostTier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'free' | 'paid';
  currency?: string;
  monthly_price?: number;
  yearly_price?: number;
}

export interface GhostSite {
  title: string;
  description?: string;
  url: string;
  icon?: string;
  logo?: string;
  cover_image?: string;
}

export interface GhostImage {
  url: string;
  ref?: string;
}

export class GhostAdminAPI {
  private url: string;
  private adminKey: string;

  constructor(config: GhostConfig) {
    this.url = config.url.replace(/\/$/, '');
    
    if (!config.adminKey || !config.adminKey.includes(':')) {
      throw new Error('Invalid admin key. Expected format: id:secret');
    }
    
    this.adminKey = config.adminKey;
  }

  /**
   * Generate a JWT token for Ghost Admin API authentication
   */
  private generateJWT(): string {
    const [id, secret] = this.adminKey.split(':');
    if (!id || !secret) {
      throw new Error('Invalid admin key format');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5 minutes

    // Create JWT parts
    const header = Buffer.from(JSON.stringify({
      alg: 'HS256',
      kid: id,
      typ: 'JWT'
    })).toString('base64url');

    const payload = Buffer.from(JSON.stringify({
      iat: now,
      exp: exp,
      aud: '/admin/'
    })).toString('base64url');

    // Sign with HMAC-SHA256
    const signingInput = `${header}.${payload}`;
    const signature = crypto
      .createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(signingInput)
      .digest('base64url');

    return `${signingInput}.${signature}`;
  }

  /**
   * Make a request to Ghost Admin API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const token = this.generateJWT();
    let url = `${this.url}/ghost/api/admin/${path}`;
    
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([k, v]) => v !== undefined)
          .map(([k, v]) => [k, v])
      ).toString();
      url += `?${queryString}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Ghost ${token}`,
      'Accept-Version': 'v6.0'
    };

    if (data && !data._isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? (data._isFormData ? data.body : JSON.stringify(data)) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors[0]) {
          errorMessage = errorJson.errors[0].message;
        }
      } catch {}
      throw new Error(`Ghost API Error (${response.status}): ${errorMessage}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return null as T;
    }

    return JSON.parse(text);
  }

  // ============================================
  // POSTS API
  // ============================================

  /**
   * List posts with optional NQL filter and includes
   * @see https://ghost.org/docs/admin-api/#posts-browse
   */
  async listPosts(options: {
    filter?: string;     // NQL filter string
    include?: string;    // e.g., 'tags,authors'
    fields?: string;     // Limit fields returned
    order?: string;      // e.g., 'published_at DESC'
    limit?: number;
    page?: number;
  } = {}): Promise<{ posts: GhostPost[]; meta?: { pagination: any } }> {
    const params: Record<string, string> = {};
    
    if (options.filter) params.filter = options.filter;
    if (options.include) params.include = options.include;
    if (options.fields) params.fields = options.fields;
    if (options.order) params.order = options.order;
    if (options.limit) params.limit = String(options.limit);
    if (options.page) params.page = String(options.page);

    return this.request('GET', 'posts/', undefined, params);
  }

  /**
   * Get a single post by ID
   */
  async getPostById(id: string, options: { include?: string } = {}): Promise<GhostPost | null> {
    const params: Record<string, string> = {};
    if (options.include) params.include = options.include;
    
    const result = await this.request<{ posts: GhostPost[] }>('GET', `posts/${id}/`, undefined, options.include ? params : undefined);
    
    if (result && result.posts && result.posts.length > 0) {
      return result.posts[0];
    }
    return null;
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug: string, options: { include?: string } = {}): Promise<GhostPost | null> {
    const params: Record<string, string> = { slug };
    if (options.include) params.include = options.include;
    
    const result = await this.request('GET', 'posts/slug/' + slug, undefined, params);
    
    if (result && result.posts && result.posts.length > 0) {
      return result.posts[0];
    }
    return null;
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    postData: {
      title?: string;
      html?: string;
      status?: 'draft' | 'published' | 'scheduled';
      published_at?: string;
      slug?: string;
      feature_image?: string;
      feature_image_caption?: string;
      tags?: string[];
      [key: string]: any;
    }
  ): Promise<GhostPost> {
    // Get current post for updated_at
    const current = await this.getPostById(postId);
    if (!current) {
      throw new Error('Post not found');
    }

    const payload: any = {
      ...postData,
      updated_at: current.updated_at
    };

    // Convert tags array to Ghost format
    if (postData.tags) {
      payload.tags = postData.tags.map(tag => ({ name: tag }));
    }

    const result = await this.request<{ posts: GhostPost[] }>(
      'PUT',
      `posts/${postId}/`,
      { posts: [payload] },
      { source: 'html' }
    );

    return result.posts[0];
  }

  // ============================================
  // TAGS API
  // ============================================

  /**
   * List all tags
   */
  async listTags(options: {
    filter?: string;
    include?: string;
    order?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<{ tags: GhostTag[]; meta?: { pagination: any } }> {
    const params: Record<string, string> = {};
    
    if (options.filter) params.filter = options.filter;
    if (options.include) params.include = options.include;
    if (options.order) params.order = options.order;
    if (options.limit) params.limit = String(options.limit);
    if (options.page) params.page = String(options.page);

    return this.request('GET', 'tags/', undefined, params);
  }

  /**
   * Get a tag by ID
   */
  async getTagById(id: string): Promise<GhostTag | null> {
    const result = await this.request<{ tags: GhostTag[] }>('GET', `tags/${id}/`);
    return result?.tags?.[0] || null;
  }

  /**
   * Get a tag by slug
   */
  async getTagBySlug(slug: string): Promise<GhostTag | null> {
    const result = await this.request<{ tags: GhostTag[] }>('GET', `tags/slug/${slug}/`);
    return result?.tags?.[0] || null;
  }

  /**
   * Create a new tag
   */
  async createTag(data: {
    name: string;
    slug?: string;
    description?: string;
    visibility?: 'public' | 'internal';
    feature_image?: string;
  }): Promise<GhostTag> {
    const result = await this.request<{ tags: GhostTag[] }>('POST', 'tags/', {
      tags: [data]
    });
    return result.tags[0];
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    visibility?: 'public' | 'internal';
    feature_image?: string;
  }): Promise<GhostTag> {
    const result = await this.request<{ tags: GhostTag[] }>('PUT', `tags/${id}/`, {
      tags: [data]
    });
    return result.tags[0];
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    await this.request('DELETE', `tags/${id}/`);
  }

  // ============================================
  // MEMBERS API
  // ============================================

  /**
   * List members
   */
  async listMembers(options: {
    filter?: string;
    include?: string;
    order?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<{ members: GhostMember[]; meta?: { pagination: any } }> {
    const params: Record<string, string> = {};
    
    if (options.filter) params.filter = options.filter;
    if (options.include) params.include = options.include;
    if (options.order) params.order = options.order;
    if (options.limit) params.limit = String(options.limit);
    if (options.page) params.page = String(options.page);

    return this.request('GET', 'members/', undefined, params);
  }

  /**
   * Get a member by ID
   */
  async getMemberById(id: string): Promise<GhostMember | null> {
    const result = await this.request<{ members: GhostMember[] }>('GET', `members/${id}/`);
    return result?.members?.[0] || null;
  }

  /**
   * Get a member by email
   */
  async getMemberByEmail(email: string): Promise<GhostMember | null> {
    const result = await this.request<{ members: GhostMember[] }>('GET', `members/email/${encodeURIComponent(email)}/`);
    return result?.members?.[0] || null;
  }

  /**
   * Create a member
   */
  async createMember(data: {
    email: string;
    name?: string;
    note?: string;
    labels?: string[];
    newsletters?: string[];
  }): Promise<GhostMember> {
    const result = await this.request<{ members: GhostMember[] }>('POST', 'members/', {
      members: [data]
    });
    return result.members[0];
  }

  /**
   * Update a member
   */
  async updateMember(id: string, data: {
    name?: string;
    note?: string;
    labels?: string[];
    newsletters?: string[];
  }): Promise<GhostMember> {
    const result = await this.request<{ members: GhostMember[] }>('PUT', `members/${id}/`, {
      members: [data]
    });
    return result.members[0];
  }

  /**
   * Delete a member
   */
  async deleteMember(id: string): Promise<void> {
    await this.request('DELETE', `members/${id}/`);
  }

  // ============================================
  // TIERS API
  // ============================================

  /**
   * List all tiers (membership levels)
   */
  async listTiers(): Promise<{ tiers: GhostTier[] }> {
    return this.request('GET', 'tiers/');
  }

  /**
   * Get a tier by ID
   */
  async getTierById(id: string): Promise<GhostTier | null> {
    const result = await this.request<{ tiers: GhostTier[] }>('GET', `tiers/${id}/`);
    return result?.tiers?.[0] || null;
  }

  // ============================================
  // SITE & CONFIG API
  // ============================================

  /**
   * Get site information
   */
  async getSite(): Promise<GhostSite> {
    const result = await this.request<{ site: GhostSite[] }>('GET', 'site/');
    return result?.site?.[0] || result;
  }

  /**
   * Get Ghost configuration
   */
  async getConfig(): Promise<any> {
    const result = await this.request('GET', 'config/');
    return result;
  }

  // ============================================
  // IMAGES API
  // ============================================

  /**
   * Upload an image to Ghost
   */
  async uploadImage(file: {
    path: string;
    filename: string;
    purpose?: 'image' | 'profile_image';
    ref?: string;
  }): Promise<GhostImage> {
    const fs = await import('fs');
    const FormData = (await import('form-data')).default;
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), {
      filename: file.filename,
      contentType: this.getMimeType(file.filename)
    });
    formData.append('purpose', file.purpose || 'image');
    if (file.ref) {
      formData.append('ref', file.ref);
    }

    const token = this.generateJWT();
    const url = `${this.url}/ghost/api/admin/images/upload/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        ...formData.getHeaders()
      },
      body: formData as any
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Image upload failed (${response.status}): ${error}`);
    }

    const result = await response.json();
    return result.images[0];
  }

  /**
   * Upload an image from URL
   */
  async uploadImageFromUrl(imageUrl: string): Promise<GhostImage> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const buffer = await response.buffer();
    const urlPath = new URL(imageUrl).pathname;
    const filename = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;

    // Write to temp file
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upload-'));
    const tmpPath = path.join(tmpDir, filename);
    
    try {
      fs.writeFileSync(tmpPath, buffer);
      return await this.uploadImage({
        path: tmpPath,
        filename
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // ============================================
  // UNSPLASH INTEGRATION
  // ============================================

  /**
   * Search Unsplash photos (via Ghost's Unsplash integration)
   * Note: This requires Ghost's Unsplash integration to be configured
   */
  async unsplashSearch(query: string, options: {
    page?: number;
    per_page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  } = {}): Promise<any> {
    const params: Record<string, string> = {
      query,
    };
    
    if (options.page) params.page = String(options.page);
    if (options.per_page) params.per_page = String(options.per_page);
    if (options.orientation) params.orientation = options.orientation;

    return this.request('GET', 'images/', undefined, { 
      source: 'unsplash',
      ...params 
    });
  }

  // ============================================
  // NEWSLETTERS API
  // ============================================

  /**
   * List newsletters
   */
  async listNewsletters(): Promise<any> {
    return this.request('GET', 'newsletters/');
  }
}