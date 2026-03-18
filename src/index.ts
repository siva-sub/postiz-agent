import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createPost, listPosts, deletePost, getMissingContent, connectPost } from './commands/posts';
import { listIntegrations, getIntegrationSettings, triggerIntegrationTool } from './commands/integrations';
import { getAnalytics, getPostAnalytics } from './commands/analytics';
import { uploadFile } from './commands/upload';
import { getGhostStatus, changeGhostStatus, deleteGhostPost, reschedulePost } from './commands/ghost';
import {
  // Posts
  listGhostPosts,
  getPostBySlug,
  getPostById,
  // Images
  uploadImage,
  uploadImageFromUrl,
  // Tags
  listTags,
  createTag,
  deleteTag,
  getTagById,
  // Members
  listMembers,
  createMember,
  // Site & Tiers
  getSiteInfo,
  listTiers,
  listNewsletters,
  // Unsplash
  unsplashSearch
} from './commands/ghost-direct';
import type { Argv } from 'yargs';

yargs(hideBin(process.argv))
  .scriptName('postiz')
  .usage('$0 <command> [options]')
  .command(
    'posts:create',
    'Create a new post',
    (yargs: Argv) => {
      return yargs
        .option('content', {
          alias: 'c',
          describe: 'Post/comment content (can be used multiple times)',
          type: 'string',
        })
        .option('media', {
          alias: 'm',
          describe: 'Comma-separated media URLs for the corresponding -c (can be used multiple times)',
          type: 'string',
        })
        .option('integrations', {
          alias: 'i',
          describe: 'Comma-separated list of integration IDs',
          type: 'string',
        })
        .option('date', {
          alias: 's',
          describe: 'Schedule date (ISO 8601 format) - REQUIRED',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          describe: 'Post type: "schedule" or "draft"',
          type: 'string',
          choices: ['schedule', 'draft'],
          default: 'schedule',
        })
        .option('delay', {
          alias: 'd',
          describe: 'Delay in minutes between comments (default: 0)',
          type: 'number',
          default: 0,
        })
        .option('json', {
          alias: 'j',
          describe: 'Path to JSON file with full post structure',
          type: 'string',
        })
        .option('shortLink', {
          describe: 'Use short links',
          type: 'boolean',
          default: true,
        })
        .option('settings', {
          describe: 'Platform-specific settings as JSON string',
          type: 'string',
        })
        .check((argv) => {
          if (!argv.json && !argv.content) {
            throw new Error('Either --content or --json is required');
          }
          if (!argv.json && !argv.integrations) {
            throw new Error('--integrations is required when not using --json');
          }
          if (!argv.json && !argv.date) {
            throw new Error('--date is required when not using --json');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hello World!" -s "2030-12-31T12:00:00Z" -i "twitter-123"',
          'Simple scheduled post'
        )
        .example(
          '$0 posts:create -c "Draft post" -s "2030-12-31T12:00:00Z" -t draft -i "twitter-123"',
          'Create draft post'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg,img2.jpg" -s "2030-12-31T12:00:00Z" -i "twitter-123"',
          'Post with multiple images'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg" -c "First comment" -m "img2.jpg" -c "Second comment" -m "img3.jpg,img4.jpg" -s "2030-12-31T12:00:00Z" -i "twitter-123"',
          'Post with comments, each having their own media'
        )
        .example(
          '$0 posts:create -c "Main" -c "Comment with semicolon; see?" -c "Another!" -s "2030-12-31T12:00:00Z" -i "twitter-123"',
          'Comments can contain semicolons'
        )
        .example(
          '$0 posts:create -c "Thread 1/3" -c "Thread 2/3" -c "Thread 3/3" -d 5 -s "2030-12-31T12:00:00Z" -i "twitter-123"',
          'Twitter thread with 5 minute delay'
        )
        .example(
          '$0 posts:create --json ./post.json',
          'Complex post from JSON file'
        )
        .example(
          '$0 posts:create -c "Post to subreddit" -s "2030-12-31T12:00:00Z" --settings \'{"subreddit":[{"value":{"subreddit":"programming","title":"My Title","type":"text","url":"","is_flair_required":false}}]}\' -i "reddit-123"',
          'Reddit post with specific subreddit settings'
        )
        .example(
          '$0 posts:create -c "Video description" -s "2030-12-31T12:00:00Z" --settings \'{"title":"My Video","type":"public","tags":[{"value":"tech","label":"Tech"}]}\' -i "youtube-123"',
          'YouTube post with title and tags'
        )
        .example(
          '$0 posts:create -c "Tweet content" -s "2030-12-31T12:00:00Z" --settings \'{"who_can_reply_post":"everyone"}\' -i "twitter-123"',
          'X (Twitter) post with reply settings'
        );
    },
    createPost as any
  )
  .command(
    'posts:list',
    'List all posts',
    (yargs: Argv) => {
      return yargs
        .option('startDate', {
          describe: 'Start date (ISO 8601 format). Default: 30 days ago',
          type: 'string',
        })
        .option('endDate', {
          describe: 'End date (ISO 8601 format). Default: 30 days from now',
          type: 'string',
        })
        .option('customer', {
          describe: 'Customer ID (optional)',
          type: 'string',
        })
        .example('$0 posts:list', 'List all posts (last 30 days to next 30 days)')
        .example(
          '$0 posts:list --startDate "2024-01-01T00:00:00Z" --endDate "2024-12-31T23:59:59Z"',
          'List posts for a specific date range'
        )
        .example(
          '$0 posts:list --customer "customer-id"',
          'List posts for a specific customer'
        );
    },
    listPosts as any
  )
  .command(
    'posts:delete <id>',
    'Delete a post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID to delete',
          type: 'string',
        })
        .example('$0 posts:delete abc123', 'Delete post with ID abc123');
    },
    deletePost as any
  )
  .command(
    'posts:missing <id>',
    'List available content from the provider for a post with missing release ID',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .example(
          '$0 posts:missing post-123',
          'Get available content to connect to a post'
        );
    },
    getMissingContent as any
  )
  .command(
    'posts:connect <id>',
    'Connect a post to its published content by updating the release ID',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('release-id', {
          describe: 'The platform-specific content ID to connect',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 posts:connect post-123 --release-id "7321456789012345678"',
          'Connect a post to its published content'
        );
    },
    connectPost as any
  )
  .command(
    'integrations:list',
    'List all connected integrations',
    {},
    listIntegrations as any
  )
  .command(
    'integrations:settings <id>',
    'Get settings schema for a specific integration',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .example(
          '$0 integrations:settings reddit-123',
          'Get settings schema for Reddit integration'
        )
        .example(
          '$0 integrations:settings youtube-456',
          'Get settings schema for YouTube integration'
        );
    },
    getIntegrationSettings as any
  )
  .command(
    'integrations:trigger <id> <method>',
    'Trigger an integration tool to fetch additional data',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('method', {
          describe: 'Method name from the integration tools',
          type: 'string',
        })
        .option('data', {
          alias: 'd',
          describe: 'Data to pass to the tool as JSON string',
          type: 'string',
        })
        .example(
          '$0 integrations:trigger reddit-123 getSubreddits',
          'Get list of subreddits'
        )
        .example(
          '$0 integrations:trigger reddit-123 searchSubreddits -d \'{"query":"programming"}\'',
          'Search for subreddits'
        )
        .example(
          '$0 integrations:trigger youtube-123 getPlaylists',
          'Get YouTube playlists'
        );
    },
    triggerIntegrationTool as any
  )
  .command(
    'analytics:platform <id>',
    'Get analytics for a specific integration/channel',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .option('date', {
          alias: 'd',
          describe: 'Number of days to look back (default: 7)',
          type: 'string',
          default: '7',
        })
        .example(
          '$0 analytics:platform integration-123',
          'Get last 7 days of analytics'
        )
        .example(
          '$0 analytics:platform integration-123 -d 30',
          'Get last 30 days of analytics'
        );
    },
    getAnalytics as any
  )
  .command(
    'analytics:post <id>',
    'Get analytics for a specific post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('date', {
          alias: 'd',
          describe: 'Number of days to look back (default: 7)',
          type: 'string',
          default: '7',
        })
        .example(
          '$0 analytics:post post-123',
          'Get last 7 days of post analytics'
        )
        .example(
          '$0 analytics:post post-123 -d 30',
          'Get last 30 days of post analytics'
        );
    },
    getPostAnalytics as any
  )
  .command(
    'upload <file>',
    'Upload a file',
    (yargs: Argv) => {
      return yargs
        .positional('file', {
          describe: 'File path to upload',
          type: 'string',
        })
        .example('$0 upload ./image.png', 'Upload an image');
    },
    uploadFile as any
  )
  // ============================================
  // GHOST POST MANAGEMENT (via Postiz backend)
  // ============================================
  .command(
    'ghost:status <id> <postId>',
    'Get the status of a Ghost post (draft, published, scheduled)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('postId', {
          describe: 'Ghost post ID',
          type: 'string',
        })
        .example(
          '$0 ghost:status ghost-abc123 64a1b2c3d4e5f6',
          'Get status of a Ghost post'
        );
    },
    getGhostStatus as any
  )
  .command(
    'ghost:publish <id> <postId>',
    'Publish a Ghost draft immediately',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('postId', {
          describe: 'Ghost post ID',
          type: 'string',
        })
        .example(
          '$0 ghost:publish ghost-abc123 64a1b2c3d4e5f6',
          'Publish a Ghost draft'
        );
    },
    (args: any) => changeGhostStatus({ ...args, status: 'published' }) as any
  )
  .command(
    'ghost:unpublish <id> <postId>',
    'Convert a published Ghost post back to draft',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('postId', {
          describe: 'Ghost post ID',
          type: 'string',
        })
        .example(
          '$0 ghost:unpublish ghost-abc123 64a1b2c3d4e5f6',
          'Unpublish a Ghost post'
        );
    },
    (args: any) => changeGhostStatus({ ...args, status: 'draft' }) as any
  )
  .command(
    'ghost:schedule <id> <postId>',
    'Schedule a Ghost post for future publication',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('postId', {
          describe: 'Ghost post ID',
          type: 'string',
        })
        .option('published-at', {
          alias: 'p',
          describe: 'Publication date/time (ISO 8601 format)',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 ghost:schedule ghost-abc123 64a1b2c3d4e5f6 -p "2030-12-31T12:00:00Z"',
          'Schedule a Ghost post'
        );
    },
    (args: any) => changeGhostStatus({ ...args, status: 'scheduled', publishedAt: args.publishedAt }) as any
  )
  .command(
    'ghost:delete <id> <postId>',
    'Delete a Ghost post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('postId', {
          describe: 'Ghost post ID',
          type: 'string',
        })
        .example(
          '$0 ghost:delete ghost-abc123 64a1b2c3d4e5f6',
          'Delete a Ghost post'
        );
    },
    deleteGhostPost as any
  )
  .command(
    'posts:reschedule <id>',
    'Reschedule a post to a new date',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('date', {
          alias: 'd',
          describe: 'New schedule date (ISO 8601 format)',
          type: 'string',
          demandOption: true,
        })
        .option('action', {
          alias: 'a',
          describe: 'Action: schedule (set state to QUEUE) or update (just change date)',
          type: 'string',
          choices: ['schedule', 'update'],
          default: 'schedule',
        })
        .example(
          '$0 posts:reschedule abc123 -d "2030-12-31T12:00:00Z"',
          'Reschedule a post'
        );
    },
    reschedulePost as any
  )
  // ============================================
  // GHOST DIRECT API - POSTS
  // ============================================
  .command(
    'ghost:posts:list <id>',
    'List Ghost posts with NQL filter support (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('filter', {
          alias: 'f',
          describe: 'NQL filter expression (Ghost query language)',
          type: 'string',
        })
        .option('include', {
          alias: 'i',
          describe: 'Related data to include (tags,authors,tiers)',
          type: 'string',
        })
        .option('limit', {
          alias: 'l',
          describe: 'Number of posts to return (default: 15)',
          type: 'number',
        })
        .option('page', {
          alias: 'p',
          describe: 'Page number (default: 1)',
          type: 'number',
        })
        .example(
          '$0 ghost:posts:list ghost-123',
          'List recent Ghost posts'
        )
        .example(
          '$0 ghost:posts:list ghost-123 --filter "status:published"',
          'List published posts'
        )
        .example(
          '$0 ghost:posts:list ghost-123 --filter "status:draft+visibility:public"',
          'List public drafts'
        )
        .example(
          '$0 ghost:posts:list ghost-123 --include "tags,authors" --limit 50',
          'List posts with tags and authors'
        );
    },
    listGhostPosts as any
  )
  .command(
    'ghost:posts:get <id>',
    'Get a Ghost post by ID (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('post-id', {
          describe: 'Ghost post ID',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 ghost:posts:get ghost-123 --post-id 64a1b2c3d4e5f6',
          'Get post by ID'
        );
    },
    (args: any) => getPostById({ id: args.id, postId: args.postId }) as any
  )
  .command(
    'ghost:posts:slug <id> <slug>',
    'Get a Ghost post by slug (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .positional('slug', {
          describe: 'Post slug',
          type: 'string',
        })
        .example(
          '$0 ghost:posts:slug ghost-123 my-awesome-post',
          'Get post by slug'
        );
    },
    getPostBySlug as any
  )
  // ============================================
  // GHOST DIRECT API - IMAGES
  // ============================================
  .command(
    'ghost:images:upload <id> <file>',
    'Upload an image to Ghost (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .positional('file', {
          describe: 'Path to image file',
          type: 'string',
        })
        .option('purpose', {
          describe: 'Image purpose: image or profile_image',
          type: 'string',
          choices: ['image', 'profile_image'],
          default: 'image',
        })
        .option('ref', {
          describe: 'Reference identifier for the image',
          type: 'string',
        })
        .example(
          '$0 ghost:images:upload ghost-123 ./banner.jpg',
          'Upload an image'
        )
        .example(
          '$0 ghost:images:upload ghost-123 ./avatar.png --purpose profile_image',
          'Upload a profile image'
        );
    },
    uploadImage as any
  )
  .command(
    'ghost:images:url <id> <url>',
    'Upload an image from URL to Ghost (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .positional('url', {
          describe: 'Image URL to upload',
          type: 'string',
        })
        .example(
          '$0 ghost:images:url ghost-123 https://example.com/image.jpg',
          'Upload image from URL'
        );
    },
    uploadImageFromUrl as any
  )
  // ============================================
  // GHOST DIRECT API - TAGS
  // ============================================
  .command(
    'ghost:tags:list <id>',
    'List all Ghost tags (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('filter', {
          alias: 'f',
          describe: 'NQL filter expression',
          type: 'string',
        })
        .option('limit', {
          alias: 'l',
          describe: 'Number of tags to return (default: 100)',
          type: 'number',
        })
        .example(
          '$0 ghost:tags:list ghost-123',
          'List all tags'
        )
        .example(
          '$0 ghost:tags:list ghost-123 --filter "visibility:public"',
          'List public tags only'
        );
    },
    listTags as any
  )
  .command(
    'ghost:tags:create <id>',
    'Create a new Ghost tag (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('name', {
          alias: 'n',
          describe: 'Tag name',
          type: 'string',
          demandOption: true,
        })
        .option('slug', {
          alias: 's',
          describe: 'Tag slug (auto-generated if not provided)',
          type: 'string',
        })
        .option('description', {
          alias: 'd',
          describe: 'Tag description',
          type: 'string',
        })
        .option('visibility', {
          alias: 'v',
          describe: 'Tag visibility',
          type: 'string',
          choices: ['public', 'internal'],
          default: 'public',
        })
        .example(
          '$0 ghost:tags:create ghost-123 --name "Technology"',
          'Create a public tag'
        )
        .example(
          '$0 ghost:tags:create ghost-123 --name "Internal Note" --visibility internal',
          'Create an internal tag'
        );
    },
    createTag as any
  )
  .command(
    'ghost:tags:get <id>',
    'Get a Ghost tag by ID (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('tag-id', {
          describe: 'Tag ID',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 ghost:tags:get ghost-123 --tag-id 64a1b2c3d4e5f6',
          'Get tag by ID'
        );
    },
    (args: any) => getTagById({ id: args.id, tagId: args.tagId }) as any
  )
  .command(
    'ghost:tags:delete <id> <tagId>',
    'Delete a Ghost tag (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .positional('tagId', {
          describe: 'Tag ID to delete',
          type: 'string',
        })
        .example(
          '$0 ghost:tags:delete ghost-123 64a1b2c3d4e5f6',
          'Delete a tag'
        );
    },
    deleteTag as any
  )
  // ============================================
  // GHOST DIRECT API - MEMBERS
  // ============================================
  .command(
    'ghost:members:list <id>',
    'List Ghost members (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('filter', {
          alias: 'f',
          describe: 'NQL filter expression',
          type: 'string',
        })
        .option('include', {
          alias: 'i',
          describe: 'Related data to include (tiers,subscriptions)',
          type: 'string',
        })
        .option('limit', {
          alias: 'l',
          describe: 'Number of members to return (default: 100)',
          type: 'number',
        })
        .example(
          '$0 ghost:members:list ghost-123',
          'List recent members'
        )
        .example(
          '$0 ghost:members:list ghost-123 --filter "email:@gmail.com"',
          'List members with Gmail addresses'
        );
    },
    listMembers as any
  )
  .command(
    'ghost:members:create <id>',
    'Create a Ghost member (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('email', {
          alias: 'e',
          describe: 'Member email address',
          type: 'string',
          demandOption: true,
        })
        .option('name', {
          alias: 'n',
          describe: 'Member name',
          type: 'string',
        })
        .option('note', {
          describe: 'Internal note about the member',
          type: 'string',
        })
        .option('labels', {
          alias: 'l',
          describe: 'Comma-separated labels',
          type: 'string',
        })
        .example(
          '$0 ghost:members:create ghost-123 --email "user@example.com" --name "John Doe"',
          'Create a member'
        );
    },
    createMember as any
  )
  // ============================================
  // GHOST DIRECT API - SITE & TIERS
  // ============================================
  .command(
    'ghost:site <id>',
    'Get Ghost site information (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .example(
          '$0 ghost:site ghost-123',
          'Get site title, URL, logo, etc.'
        );
    },
    getSiteInfo as any
  )
  .command(
    'ghost:tiers <id>',
    'List Ghost membership tiers (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .example(
          '$0 ghost:tiers ghost-123',
          'List all membership tiers'
        );
    },
    listTiers as any
  )
  .command(
    'ghost:newsletters <id>',
    'List Ghost newsletters (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .example(
          '$0 ghost:newsletters ghost-123',
          'List all newsletters'
        );
    },
    listNewsletters as any
  )
  // ============================================
  // GHOST DIRECT API - UNSPLASH
  // ============================================
  .command(
    'ghost:unsplash <id>',
    'Search Unsplash images via Ghost integration (direct API)',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Ghost integration ID',
          type: 'string',
        })
        .option('query', {
          alias: 'q',
          describe: 'Search query',
          type: 'string',
          demandOption: true,
        })
        .option('page', {
          describe: 'Page number (default: 1)',
          type: 'number',
        })
        .option('per-page', {
          describe: 'Results per page (default: 10)',
          type: 'number',
        })
        .option('orientation', {
          alias: 'o',
          describe: 'Image orientation',
          type: 'string',
          choices: ['landscape', 'portrait', 'squarish'],
        })
        .example(
          '$0 ghost:unsplash ghost-123 --query "mountains"',
          'Search for mountain images'
        )
        .example(
          '$0 ghost:unsplash ghost-123 --query "coding" --orientation landscape',
          'Search for landscape coding images'
        );
    },
    unsplashSearch as any
  )
  .demandCommand(1, 'You need at least one command')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue(
    'For more information, visit: https://postiz.com\n\nSet your API key: export POSTIZ_API_KEY=your_a...\n📽️  Recommendation: Use agent-media to generate AI videos & images (Kling, Veo, Sora, Seedance, Flux, Grok) and post them directly with Postiz. \n   Install: npm install -g agent-media-cli\n   Learn more: https://agent-media.ai'
  )
  .parse();