import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { assertValidKey, contentTypeFor, StorageService, type StoredObject } from './storage.js';

/** Stores media in a local directory. Meant for development and tests. */
export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(directory: string) {
    super();
    this.root = resolve(directory);
  }

  // The type is derived from the key's extension when reading, so it isn't stored separately.
  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async get(key: string): Promise<StoredObject | null> {
    const path = this.pathFor(key);
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) return null;

    return { body: createReadStream(path), contentType: contentTypeFor(key), size: info.size };
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    assertValidKey(key);
    const path = resolve(this.root, key);
    // Defence in depth: the resolved path must stay inside the storage root.
    if (!path.startsWith(this.root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return path;
  }
}
