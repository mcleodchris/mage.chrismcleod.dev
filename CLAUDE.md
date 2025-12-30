# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mage** is a Node.js REST API server for authenticated image upload, processing, and metadata extraction with Micropub protocol support. It integrates with Azure Cosmos DB for metadata storage, Bunny Storage (primary) for image hosting, and GitHub for committing Micropub posts.

**Tech Stack:** Express.js, ES Modules (.mjs), Multer, @11ty/eleventy-img, Winston logging, OpenAI API, Octokit

## Development Commands

### Running the Server
```bash
npm start                 # Start server (default port 3000)
```

### Docker
```bash
docker build -t mage .    # Build Docker image
docker run -p 3000:3000 --env-file .env mage  # Run container
```

**Note:** No test suite currently exists in this project.

### Continuous Integration

**GitHub Actions Workflow:** `.github/workflows/docker-build-push.yml`

Automatically builds and pushes Docker images to Docker Hub on every push to `develop` branch.

**Image Tags:**
- `mrkapowski/magetower:latest` - Latest build from develop (tracked by Watchtower)
- `mrkapowski/magetower:sha-abc1234` - Specific commit version for rollback

**Setup Requirements:**
1. Configure GitHub Secrets (Settings → Secrets and variables → Actions):
   - `DOCKERHUB_USERNAME` - Docker Hub username
   - `DOCKERHUB_TOKEN` - Docker Hub Personal Access Token
2. Push to `develop` branch triggers automatic build
3. Check Actions tab for build status

**Watchtower Integration:**
Deploy with Watchtower to auto-update on new builds:
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 300 \
  mrkapowski/magetower:latest
```

**Manual Rollback (if needed):**
```bash
# Roll back to specific commit
docker pull mrkapowski/magetower:sha-e34407d
docker stop mage
docker run -d --name mage -p 3000:3000 --env-file .env mrkapowski/magetower:sha-e34407d
```

## Environment Configuration

Required environment variables (see `.env` template):

**Database & Storage:**
- `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` - Azure Cosmos DB
- `BUNNY_CONTAINER`, `BUNNY_ACCESS_KEY`, `BUNNY_REGION` - Bunny Storage (primary)
- `STORAGE_ACCOUNT`, `STORAGE_KEY`, `CONTAINER_NAME` - Azure Blob (optional, currently disabled)

**Paths:**
- `BASE_URL`, `UPLOAD_PATH`, `SAVE_PATH`, `TEMP_PATH`

**GitHub & Micropub:**
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `MICROPUB_REPO` - For Micropub post commits
- `SITE_BASE_URL` - Base URL for generated post links

**APIs:**
- `OPENAI_API_KEY` - OpenAI integration (model: gpt-5-mini)

## Architecture & Key Patterns

### Request Flow & Middleware Architecture

1. **Global middleware** ([app.mjs:30-51](src/app.mjs#L30-L51)):
   - Database and storage clients are attached to `req` object for all routes
   - `req.database` → Cosmos DB database instance
   - `req.bunnyStorageConfig` → Bunny Storage config object
   - Containers are created per-route: `req.container = req.database.container('images')`

2. **Authentication middleware** ([app.mjs:58](src/app.mjs#L58)):
   - Applied globally after public routes (`/api-docs`, `/photos`, `/`)
   - Bearer token auth via `authenticate` middleware ([middleware/auth.mjs](src/middleware/auth.mjs))
   - Micropub endpoints use separate `micropubAuth` ([middleware/micropubAuth.mjs](src/middleware/micropubAuth.mjs))

3. **Route registration order matters:**
   ```javascript
   // Public routes first
   app.use("/api-docs", ...)
   app.use("/", openapiRouter)
   app.use("/photos", photosRouter)

   // Auth middleware
   app.use(authenticate)

   // Protected routes
   app.use("/micropub", micropubRouter)
   app.use("/images", imagesRouter)
   ```

### Image Upload & Processing Pipeline

**Entry point:** `POST /micropub/media` ([routes/micropub.mjs:38](src/routes/micropub.mjs#L38))

1. **Multer upload** → saves to `temp/` directory (150MB limit)
2. **Save original** ([utils/fileHandler.mjs](src/utils/fileHandler.mjs)) → `saved/` directory
3. **Delete temp file** → cleanup after save
4. **Process images** ([utils/imageProcessor.mjs](src/utils/imageProcessor.mjs)):
   - Generates 6 sizes: 320, 570, 820, 650, 960, 1200px
   - 3 formats: AVIF, WebP, JPEG
   - Uses `@11ty/eleventy-img` for processing
5. **Extract metadata** ([utils/exifExtractor.mjs](src/utils/exifExtractor.mjs)):
   - EXIF for JPEG files
   - PNG metadata for PNG files
6. **Upload to Bunny Storage** ([utils/bunnyStorage.mjs](src/utils/bunnyStorage.mjs))
7. **Save metadata to Cosmos DB** ([utils/imageList.mjs](src/utils/imageList.mjs)):
   - Follows `ImageObject` typedef structure
   - Contains: original URL, metadata (avif/webp/jpeg arrays), createdAt, id

### Micropub Post Creation Flow

**Entry point:** `POST /micropub` ([routes/micropub.mjs:57-220](src/routes/micropub.mjs#L57-L220))

1. **Validate Micropub structure** → `type` and `properties` required
2. **Normalize properties** → ensure all values are arrays
3. **Detect post type** → note (default), bookmark, like
4. **Generate markdown** ([utils/micropubMarkdown.mjs](src/utils/micropubMarkdown.mjs)) → frontmatter + content
5. **Commit to GitHub** via Octokit → `develop` branch
6. **Return 202 Accepted** with `Location` header → post URL format: `/{postType}s/{YYYYMMDDHHmm}/`

### Data Storage Patterns

**Cosmos DB** ([utils/cosmosDb.mjs](src/utils/cosmosDb.mjs)):
- Connection created per-request in middleware
- Queries use `container.items.query()` with SQL-like syntax
- Always fetch all with `.fetchAll()` (pagination not implemented)
- Default sort: `ORDER BY c.createdAt DESC`

**File Storage**:
- **Original images:** `saved/` directory (temporary, deleted after upload)
- **Processed images:** Bunny Storage (primary)
- **Azure Blob Storage:** Code exists but commented out ([utils/azureStorage.mjs](src/utils/azureStorage.mjs))

### Logging Strategy

Winston logger ([utils/logger.mjs](src/utils/logger.mjs)):
- Debug mode: `NODE_ENV !== 'production'`
- Usage: `log.info()`, `log.debug()`, `log.error()`, `log.warn()`
- Environment variables logged at debug level on startup (non-production only)

## Code Conventions

### ES Modules
- All files use `.mjs` extension
- Use `import`/`export` syntax
- Top-level `await` is supported

### Type Hints
- Use JSDoc for type annotations
- Example: `@typedef {Object} ImageObject` in [imageList.mjs:1-10](src/utils/imageList.mjs#L1-L10)
- Reference types in params: `@param {Object} req`

### Commenting Philosophy (from .github/instructions)
- **Comment WHY, not WHAT** - code should be self-explanatory
- **Avoid obvious comments** - let variable/function names speak
- **Use annotations** - TODO, FIXME, HACK, SECURITY, PERF when needed
- **Comment exceptions:**
  - Complex business logic
  - Non-obvious algorithms
  - Regex patterns
  - API constraints or gotchas
  - Public API JSDoc

### Security Requirements (from .github/instructions)
- **No hardcoded secrets** - always use `process.env.*`
- **Parameterized queries only** - prevent SQL injection
- **Validate file paths** - prevent directory traversal
- **HTTPS by default** - for external requests
- **SSRF protection** - validate user-provided URLs
- **Rate limiting** - for auth endpoints (currently not implemented)

## Routes Overview

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /micropub/media` | Bearer | Upload image, process, store metadata |
| `GET /micropub/media` | Bearer | Get last uploaded image |
| `POST /micropub` | Micropub | Create post (note/bookmark/like), commit to GitHub |
| `GET /micropub?q=config` | None | Micropub discovery endpoint |
| `GET /images/list` | Bearer | List all image metadata from Cosmos DB |
| `GET /images/image/:index` | Bearer | Get specific image by index |
| `POST /photos/webhook` | None | Netlify webhook for photo feed processing |
| `GET /api-docs` | None | Swagger/OpenAPI documentation |

## Common Patterns & Extension Points

### Adding a New Route
1. Create router in `src/routes/`
2. Import and register in [app.mjs](src/app.mjs)
3. Place before or after `authenticate` middleware depending on auth requirements
4. Access clients via `req.database`, `req.bunnyStorageConfig`, `req.container`

### Adding Image Processing Steps
1. Extend [imageProcessor.mjs](src/utils/imageProcessor.mjs) with new processing function
2. Call from [micropubHandlers.mjs](src/utils/micropubHandlers.mjs) `handleUpload` function
3. Add results to metadata object before `saveImageData`

### Adding New Storage Provider
1. Follow pattern in [bunnyStorage.mjs](src/utils/bunnyStorage.mjs):
   - `createConfig()` function for configuration
   - `uploadTo*()` async function for upload logic
2. Attach config to `req` in [app.mjs](src/app.mjs) middleware
3. Call upload function in [micropubHandlers.mjs](src/utils/micropubHandlers.mjs)

## Known Architecture Notes

- **Azure Blob Storage upload is disabled** - code exists but commented out in upload handlers
- **OpenAI integration** - model set to `gpt-5-mini` in recent update (check [routes/openai.mjs](src/routes/openai.mjs))
- **No pagination** - all list endpoints return full results
- **No test coverage** - no test files exist in project
- **Temporary file cleanup** - files in `saved/` and `temp/` are deleted after processing
- **CORS** - configured for `http://localhost:8080` only
- **Graceful shutdown** - SIGINT handler registered in [app.mjs:86-89](src/app.mjs#L86-L89)
