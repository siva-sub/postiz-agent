import { GhostAdminAPI, GhostPost, GhostTag, GhostMember, GhostTier, GhostSite, GhostImage } from '../ghost-api';
import { getIntegrationSettings } from './integrations';

/**
 * Get Ghost configuration from integration settings
 * @param integrationId - Postiz integration ID
 * @returns GhostAdminAPI instance with credentials
 */
async function getGhostApi(integrationId: string): Promise<GhostAdminAPI> {
  const settings = await getIntegrationSettings(integrationId);
  
  if (!settings || !settings.url || !settings.key) {
    throw new Error('Invalid Ghost integration. Ensure URL and Admin Key are configured.');
  }

  return new GhostAdminAPI({
    url: settings.url,
    adminKey: settings.key
  });
}

/**
 * Get Ghost post status
 */
export async function getGhostStatus(args: { id: string; postId: string }) {
  const api = await getGhostApi(args.id);
  const post = await api.getPostById(args.postId, { include: 'tags,authors' });

  if (!post) {
    console.log(JSON.stringify({ error: 'Post not found' }));
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    visibility: post.visibility,
    published_at: post.published_at,
    url: post.url,
    feature_image: post.feature_image,
    tags: post.tags?.map(t => t.name),
    authors: post.authors?.map(a => a.name || a.email)
  }, null, 2));
}

/**
 * Change Ghost post status (publish, unpublish, schedule)
 */
export async function changeGhostStatus(args: { 
  id: string; 
  postId: string; 
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
}) {
  const api = await getGhostApi(args.id);
  
  const updateData: any = { status: args.status };
  
  if (args.publishedAt) {
    updateData.published_at = args.publishedAt;
  }

  const post = await api.updatePost(args.postId, updateData);

  console.log(JSON.stringify({
    success: true,
    id: post.id,
    status: post.status,
    published_at: post.published_at
  }, null, 2));
}

/**
 * Delete a Ghost post
 */
export async function deleteGhostPost(args: { id: string; postId: string }) {
  const api = await getGhostApi(args.id);
  
  // Note: Ghost Admin API doesn't have a direct delete endpoint
  // Posts must be deleted via the admin UI. This is a limitation.
  console.log(JSON.stringify({
    error: 'Ghost posts cannot be deleted via API. Use the Ghost admin UI.',
    postId: args.postId
  }));
  process.exit(1);
}

// ============================================
// POSTS COMMANDS
// ============================================

/**
 * List posts with NQL filter support
 */
export async function listGhostPosts(args: { 
  id: string;
  filter?: string;
  include?: string;
  limit?: number;
  page?: number;
}) {
  const api = await getGhostApi(args.id);
  
  const result = await api.listPosts({
    filter: args.filter,
    include: args.include,
    limit: args.limit || 15,
    page: args.page || 1,
    order: 'created_at DESC'
  });

  console.log(JSON.stringify({
    posts: result.posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      visibility: p.visibility,
      published_at: p.published_at,
      url: p.url
    })),
    pagination: result.meta?.pagination
  }, null, 2));
}

/**
 * Get post by slug
 */
export async function getPostBySlug(args: { id: string; slug: string }) {
  const api = await getGhostApi(args.id);
  const post = await api.getPostBySlug(args.slug, { include: 'tags,authors' });

  if (!post) {
    console.log(JSON.stringify({ error: 'Post not found' }));
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    visibility: post.visibility,
    published_at: post.published_at,
    url: post.url,
    feature_image: post.feature_image,
    feature_image_caption: post.feature_image_caption,
    excerpt: post.excerpt,
    tags: post.tags,
    authors: post.authors
  }, null, 2));
}

/**
 * Get post by ID
 */
export async function getPostById(args: { id: string; postId: string }) {
  const api = await getGhostApi(args.id);
  const post = await api.getPostById(args.postId, { include: 'tags,authors' });

  if (!post) {
    console.log(JSON.stringify({ error: 'Post not found' }));
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    visibility: post.visibility,
    published_at: post.published_at,
    url: post.url,
    feature_image: post.feature_image,
    feature_image_caption: post.feature_image_caption,
    excerpt: post.excerpt,
    tags: post.tags,
    authors: post.authors
  }, null, 2));
}

// ============================================
// IMAGE COMMANDS
// ============================================

/**
 * Upload an image to Ghost
 */
export async function uploadImage(args: { 
  id: string; 
  file: string;
  purpose?: 'image' | 'profile_image';
  ref?: string;
}) {
  const api = await getGhostApi(args.id);
  const fs = await import('fs');
  const path = await import('path');

  if (!fs.existsSync(args.file)) {
    console.log(JSON.stringify({ error: `File not found: ${args.file}` }));
    process.exit(1);
  }

  const filename = path.basename(args.file);

  const result = await api.uploadImage({
    path: args.file,
    filename,
    purpose: args.purpose || 'image',
    ref: args.ref
  });

  console.log(JSON.stringify({
    success: true,
    url: result.url,
    ref: result.ref
  }, null, 2));
}

/**
 * Upload an image from URL to Ghost
 */
export async function uploadImageFromUrl(args: { 
  id: string; 
  url: string;
}) {
  const api = await getGhostApi(args.id);

  const result = await api.uploadImageFromUrl(args.url);

  console.log(JSON.stringify({
    success: true,
    url: result.url,
    ref: result.ref
  }, null, 2));
}

// ============================================
// TAGS COMMANDS
// ============================================

/**
 * List all tags
 */
export async function listTags(args: { 
  id: string;
  filter?: string;
  limit?: number;
}) {
  const api = await getGhostApi(args.id);

  const result = await api.listTags({
    filter: args.filter,
    include: 'count.posts',
    limit: args.limit || 100,
    order: 'name ASC'
  });

  console.log(JSON.stringify({
    tags: result.tags.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      visibility: t.visibility,
      post_count: t.count?.posts
    }))
  }, null, 2));
}

/**
 * Create a new tag
 */
export async function createTag(args: {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  visibility?: 'public' | 'internal';
}) {
  const api = await getGhostApi(args.id);

  const result = await api.createTag({
    name: args.name,
    slug: args.slug,
    description: args.description,
    visibility: args.visibility || 'public'
  });

  console.log(JSON.stringify({
    success: true,
    id: result.id,
    name: result.name,
    slug: result.slug
  }, null, 2));
}

/**
 * Delete a tag
 */
export async function deleteTag(args: { id: string; tagId: string }) {
  const api = await getGhostApi(args.id);

  await api.deleteTag(args.tagId);

  console.log(JSON.stringify({ success: true }));
}

/**
 * Get tag by ID
 */
export async function getTagById(args: { id: string; tagId: string }) {
  const api = await getGhostApi(args.id);
  const tag = await api.getTagById(args.tagId);

  if (!tag) {
    console.log(JSON.stringify({ error: 'Tag not found' }));
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    visibility: tag.visibility
  }, null, 2));
}

// ============================================
// MEMBERS COMMANDS (P3)
// ============================================

/**
 * List members
 */
export async function listMembers(args: {
  id: string;
  filter?: string;
  include?: string;
  limit?: number;
}) {
  const api = await getGhostApi(args.id);

  const result = await api.listMembers({
    filter: args.filter,
    include: args.include || 'tiers',
    limit: args.limit || 100,
    order: 'created_at DESC'
  });

  console.log(JSON.stringify({
    members: result.members.map(m => ({
      id: m.id,
      email: m.email,
      name: m.name,
      note: m.note,
      created_at: m.created_at
    })),
    pagination: result.meta?.pagination
  }, null, 2));
}

/**
 * Create a member
 */
export async function createMember(args: {
  id: string;
  email: string;
  name?: string;
  note?: string;
  labels?: string;
}) {
  const api = await getGhostApi(args.id);

  const result = await api.createMember({
    email: args.email,
    name: args.name,
    note: args.note,
    labels: args.labels ? args.labels.split(',').map(l => l.trim()) : undefined
  });

  console.log(JSON.stringify({
    success: true,
    id: result.id,
    email: result.email,
    name: result.name
  }, null, 2));
}

// ============================================
// SITE & TIERS COMMANDS (P3)
// ============================================

/**
 * Get site information
 */
export async function getSiteInfo(args: { id: string }) {
  const api = await getGhostApi(args.id);
  const site = await api.getSite();

  console.log(JSON.stringify({
    title: site.title,
    description: site.description,
    url: site.url,
    icon: site.icon,
    logo: site.logo,
    cover_image: site.cover_image
  }, null, 2));
}

/**
 * List membership tiers
 */
export async function listTiers(args: { id: string }) {
  const api = await getGhostApi(args.id);
  const result = await api.listTiers();

  console.log(JSON.stringify({
    tiers: result.tiers.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      type: t.type,
      monthly_price: t.monthly_price,
      yearly_price: t.yearly_price,
      currency: t.currency
    }))
  }, null, 2));
}

/**
 * List newsletters
 */
export async function listNewsletters(args: { id: string }) {
  const api = await getGhostApi(args.id);
  const result = await api.listNewsletters();

  console.log(JSON.stringify(result, null, 2));
}

// ============================================
// UNSPLASH COMMANDS (P2)
// ============================================

/**
 * Search Unsplash images via Ghost integration
 */
export async function unsplashSearch(args: {
  id: string;
  query: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}) {
  const api = await getGhostApi(args.id);

  const result = await api.unsplashSearch(args.query, {
    page: args.page || 1,
    per_page: args.perPage || 10,
    orientation: args.orientation
  });

  console.log(JSON.stringify(result, null, 2));
}