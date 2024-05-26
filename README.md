# Mage

A simple, naive implementation of a Micropub media endpoint.

## Project Structure

The project has the following directory structure:

```
├── src
|   ├── app.mjs
|   ├── routes
|   |   └── upload.mjs
|   ├── utils
|   |   └── fileHandler.mjs
|   └── middleware
|       └── auth.mjs
├── temp
├── package.json
└── README.md
```

## Installation

To run the project, follow these steps:

1. Clone the repository.
2. Navigate to the project directory: `cd /home/chris/src/mage.chrismcleod.dev/`.
3. Install the dependencies: `npm install`.
4. Start the server: `npm start`.

## Usage

Once the server is running, you can send a POST request to the `/micropub/media` endpoint with a JSON payload and an image file. The request should include a Bearer token for authentication.

Example cURL command:

```bash
curl -X POST \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg;type=image/jpeg" \
  -i \
  http://localhost:3000/micropub/media
```

Replace `<your_token>` with your actual Bearer token, and `image.jpg` with the path to your image file.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## Contact

If you have any questions or suggestions, feel free to reach out to the project maintainers.

## Acknowledgements

This project was inspired by the need for a simple Node.js REST API that handles JSON + image file uploads and authentication using Bearer tokens.

