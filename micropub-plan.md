# Micropub Specification Compliance Remediation Plan

This document outlines a step-by-step plan to bring the Mage Micropub implementation into compliance with the [official Micropub specification](https://micropub.spec.indieweb.org/).

## Phase 1: Foundation & Configuration
*Goal: Improve the core configuration and error handling.*

1.  **Enhance Config Endpoint**: Update the `GET /micropub` endpoint to return a more complete configuration object, including standard fields like `syndicate-to` (even if empty) and ensuring all required discovery properties are present.
2.  **Standardize Error Responses**: Refactor error handling across all Micropub routes to ensure response bodies strictly follow the Micropub/OAuth 2.0 error format: `{ "error": "...", "error_description": "..." }`.
3.  **Configurable Upload Limits**: Move the hardcoded 150MB file size limit in `micropub.mjs` to an environment variable (e.g., `MICROPUB_MAX_UPLOAD_SIZE`).

## Phase 2: Media Endpoint Expansion
*Goal: Transform `/micropub/media` from a simple uploader to a compliant media resource endpoint.*

1.  **Implement GET for Media**: Add support for `GET /micropub/media` to allow clients to list or retrieve recently uploaded media metadata.
2.  **Add DELETE Support**: Implement the `DELETE /micropub/media/:id` functionality to allow users to remove media from Bunny Storage and Cosmos DB.
3.  **Implement PUT Support**: (Optional/Long-term) Add support for updating existing media metadata.

## Phase 3: Robust Post Management
*Goal: Move beyond simple post creation to full resource lifecycle management.*

1.  **Expand Post Type Support**: Update the handler to recognize and properly process other standard Micropub types such as `repost`, `event`, or `announcement`.
2.  **Implement Resource Updates (PUT)**: Enable the ability to update existing posts by targeting their specific URL, ensuring the GitHub commit logic handles updates/replacements correctly.
3.  **Implement Post Deletion (DELETE)**: Add functionality to delete posts from the GitHub repository via Octokit when a `DELETE` request is received at the post's URI.
4.  **Consistent Property Normalization**: Ensure all Micropub properties (like `category`) are consistently handled as arrays, regardless of how they are sent in the request.

## Phase 4: Security & Validation
*Goal: Strengthen authentication and input sanitization.*

1.  **Input Validation Layer**: Implement a validation schema (e.g., using Joi or Zod) for all incoming Micropub requests to validate:
    *   URL formats for `bookmark-of` and `like-of`.
    *   Date strings for timestamps.
    *   Content length and structure.
2.  **Authentication Refactoring (Long-term)**: Transition from the shared secret (`process.env.SHARED_SECRET`) toward a more standard OAuth 2.0 token validation approach or at least implement a more robust token introspection mechanism.
3.  **Explicit Content-Type Handling**: Ensure the server explicitly handles and validates `application/json` and `application/x-www-form-urlencoded` request bodies as per the spec.

## Phase 5: Testing & Verification
1.  **Integration Tests**: Create a test suite (once a framework is established) that uses standard Micropub client requests to verify compliance with each phase of this plan.
2.  **Schema Validation**: Use automated tools to validate the output of the configuration and post endpoints against the Micropub JSON-LD/Schema.org structures.
