import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { assertValidKey, StorageService, type StoredObject } from './storage.js';

type S3StorageOptions = { bucket: string; region: string; endpoint?: string };

/**
 * Stores media in S3 (or an S3-compatible service when an endpoint is given).
 * Credentials come from the AWS default provider chain, e.g. an ECS task role.
 */
export class S3StorageService extends StorageService {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    super();
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      // S3-compatible services such as MinIO address buckets by path.
      forcePathStyle: Boolean(options.endpoint),
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertValidKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are never reused, so objects can be cached forever.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidKey(key);
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      return {
        body: object.Body as Readable,
        contentType: object.ContentType ?? 'application/octet-stream',
        size: object.ContentLength,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }
}
