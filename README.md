
# Mage

Node.js REST API for authenticated image upload, processing, and metadata extraction. Integrates with Azure Cosmos DB, Bunny Storage, and (optionally) Azure Blob Storage. Implements Micropub media endpoint and related image/photo APIs.


## Project Structure

```
├── src
│   ├── app.mjs                # Express app setup, middleware, routes
│   ├── routes/                # API endpoints (micropub, images, photos, etc.)
│   ├── utils/                 # Core utilities (storage, DB, image processing, logging)
│   ├── middleware/auth.mjs    # Bearer token authentication
│   └── types/                 # Type definitions
├── saved/                     # Saved images (temporary)
├── temp/                      # Multer temp uploads
├── package.json
└── README.md
```


## Installation & Setup

1. Clone the repository.
2. Navigate to the project directory: `cd ~/Projects/apis/mage.chrismcleod.dev/`
3. Install dependencies: `npm install`
4. Set up environment variables in a `.env` file (see below)
5. Start the server: `npm start`

### Required Environment Variables
- `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` (Azure Cosmos DB)
- `STORAGE_ACCOUNT`, `STORAGE_KEY`, `CONTAINER_NAME` (Azure Blob Storage)
- `BUNNY_CONTAINER`, `BUNNY_ACCESS_KEY`, `BUNNY_REGION` (Bunny Storage)
- `BASE_URL`, `UPLOAD_PATH`, `SAVE_PATH`, `TEMP_PATH` (paths)
- `OPENAI_API_KEY` (OpenAI API integration)


## Usage & Endpoints

### Authentication
All endpoints except `/api-docs`, `/photos`, and `/` require a Bearer token.

### Main Endpoints
- `POST /micropub/media` — Upload image (multipart/form-data, Bearer token required)
- `GET /images/list` — List all image metadata
- `GET /images/image/:index` — Get image metadata by index
- `POST /photos/webhook` — Netlify webhook for photo feed updates
- `GET /api-docs` — Swagger/OpenAPI documentation

#### Example: Upload an Image
```bash
curl -X POST \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg;type=image/jpeg" \
  http://localhost:3000/micropub/media
```

Replace `<your_token>` with your Bearer token, and `image.jpg` with your image file path.


## Data Flow & Integrations
- Uploaded images are saved to `saved/` (temp), then uploaded to Bunny Storage (default) and optionally Azure Blob Storage.
- Metadata (including EXIF/PNG info, resized formats) is stored in Azure Cosmos DB.
- All image metadata objects follow the `ImageObject` typedef in `src/utils/imageList.mjs`.
- Logging via Winston (`src/utils/logger.mjs`).

## Developer Notes
- Use ES modules (`.mjs`), async/await, and JSDoc for type hints.
- Extend endpoints by following patterns in `src/routes/` and attaching required clients to `req` in middleware.
- For new storage integrations, follow the structure in `azureStorage.mjs` and `bunnyStorage.mjs`.

## License
MIT License. See [LICENSE](./LICENSE).

## Contributing
Fork the repository and submit a pull request.

## Contact
Open an issue or reach out to the maintainers.

## Acknowledgements
Inspired by the need for a simple Node.js REST API for authenticated image uploads and metadata extraction.

