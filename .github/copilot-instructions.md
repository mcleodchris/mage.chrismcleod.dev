# Copilot Instructions for mage.chrismcleod.dev

## Project Overview
- This is a Node.js REST API for Micropub media endpoints, focused on authenticated image upload, processing, and metadata extraction.
- Core services: Azure Cosmos DB (metadata), Azure Blob Storage & Bunny Storage (image files), Express.js for routing, Multer for uploads, Winston for logging.
- Main entry: `src/app.mjs` (Express app setup, middleware, route registration).

## Key Components & Data Flow
- **Image Upload**: `/micropub/media` (POST) accepts multipart uploads, authenticates via Bearer token, saves original and resized images, extracts metadata, and stores info in Cosmos DB.
- **Image Listing**: `/images/list` returns all image metadata from Cosmos DB. `/images/image/:index` fetches a specific image by index.
- **Photo Feed**: `/photos/webhook` triggers feed processing (Netlify integration).
- **Storage**: Images are uploaded to Bunny Storage (default) and optionally Azure Blob Storage (code is present but commented out).
- **Metadata Extraction**: EXIF for JPEG, PNG metadata for PNGs, handled in `exifExtractor.mjs`.

## Developer Workflows
- **Start server**: `npm start` (entry: `src/app.mjs`).
- **Install dependencies**: `npm install`.
- **Environment variables**: Required for Cosmos DB, Azure Storage, Bunny Storage, and paths. See `.env` and references in `src/app.mjs`.
- **Debug logging**: Winston logger (`src/utils/logger.mjs`), debug output enabled unless `NODE_ENV=production`.
- **Temporary files**: Uploaded files are saved to `saved/` then deleted after processing.

## Project-Specific Patterns
- **Express Middleware**: Database and storage clients are attached to `req` in global middleware for easy access in routes.
- **Authentication**: All routes except `/api-docs`, `/photos`, and `/` require Bearer token authentication via custom middleware (`src/middleware/auth.mjs`).
- **Image Processing**: Resizing and format conversion handled by `imageProcessor.mjs` and `@11ty/eleventy-img`.
- **Error Handling**: Multer errors (file size) and general errors are handled in route-level middleware.
- **Swagger/OpenAPI**: API docs available at `/api-docs` (see `swaggerSpec.mjs`).

## Integration Points
- **Azure Cosmos DB**: Used for storing image metadata. See `cosmosDb.mjs`, `imageList.mjs`.
- **Azure Blob Storage**: Utility in `azureStorage.mjs`, but actual upload is commented out in handlers.
- **Bunny Storage**: Used for image file storage (see `bunnyStorage.mjs`).
- **Netlify Webhook**: `/photos/webhook` endpoint for feed updates.

## Conventions & Recommendations
- Use ES modules (`.mjs`), async/await, and JSDoc for type hints.
- Prefer logging via Winston (`log.info`, `log.error`, etc.).
- All image metadata objects follow the `ImageObject` typedef in `imageList.mjs`.
- When adding new endpoints, follow the pattern in `routes/` and attach required clients to `req` in middleware.
- For new storage integrations, follow the structure in `azureStorage.mjs` and `bunnyStorage.mjs`.

## Example: Adding a New Image Processing Step
- Add logic to `imageProcessor.mjs`.
- Update `micropubHandlers.mjs` to call the new processing function and include results in the metadata object.
- Ensure metadata is saved via `saveImageData` in `imageList.mjs`.

## Key Files & Directories
- `src/app.mjs`: Main app setup
- `src/routes/`: API endpoints
- `src/utils/`: Core utilities (storage, DB, image processing, logging)
- `src/middleware/auth.mjs`: Authentication
- `src/types/posts.d.ts`: Type definitions
- `README.md`: Basic usage and setup

---
If any section is unclear or missing, please provide feedback so this guide can be improved for future AI agents.
