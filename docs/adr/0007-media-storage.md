# 0007. Media storage behind a driver, served from the web origin

- **Status**: Accepted
- **Date**: 2026-11-02

## Context

Products need photos. Locally we want zero setup; in production on AWS, files must survive
container restarts and scale-out, so they belong in S3. Uploads are an attack surface:
files that pretend to be images (HTML, SVG with scripts) must never be stored and served.
Photos should be served in modern formats at the right size for each device.

## Decision

- **A `StorageService` interface with two drivers**, chosen by `STORAGE_DRIVER`:
  - `local` writes to a directory (`STORAGE_LOCAL_DIR`) for development and tests.
  - `s3` writes to a bucket (`S3_BUCKET`, `S3_REGION`, optional `S3_ENDPOINT` for MinIO).
    Credentials come from the AWS default provider chain (an ECS task role), never from
    env files.
- **Uploads are validated by content.** The API detects the type from the file's bytes and
  accepts only JPEG, PNG, WebP and AVIF (never SVG), up to 5 MB and 20 per product. File
  names are random UUIDs and never reused. If the database write fails, the file is
  removed again.
- **Files are served through the web origin.** The API serves `/api/v1/media/...` with
  immutable caching, and the web app streams it at `/media/...`. `next/image` then
  optimises the files as local images, resizing them and converting them to WebP or AVIF.
  `images.localPatterns` restricts optimisation to `/media/**`.
- **Files are deleted with their records.** Deleting an image or a product deletes its
  stored files. Storage failures after the record is gone are logged, not fatal.

## Consequences

- The same code runs locally and on AWS. Switching to S3 is configuration only.
- The browser never needs S3 or CORS access, and bucket objects stay private.
- Image traffic flows through the API and web app. If it grows, a CDN (CloudFront) in front
  of `/media` or the bucket can take it over without changing keys or code paths.
- The local driver is unsuitable for production containers, whose disks are ephemeral.
