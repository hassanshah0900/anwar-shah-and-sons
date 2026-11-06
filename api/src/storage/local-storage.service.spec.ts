import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { LocalStorageService } from './local-storage.service.js';

describe('LocalStorageService', () => {
  let directory: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'storage-'));
    storage = new LocalStorageService(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('stores, reads and deletes objects', async () => {
    await storage.put('products/p1/a.webp', Buffer.from('image'), 'image/webp');

    const stored = await storage.get('products/p1/a.webp');
    expect(stored).toMatchObject({ contentType: 'image/webp', size: 5 });
    expect(await text(stored!.body)).toBe('image');

    await storage.delete('products/p1/a.webp');
    expect(await storage.get('products/p1/a.webp')).toBeNull();
  });

  it('treats deleting a missing object as success', async () => {
    await expect(storage.delete('products/p1/missing.webp')).resolves.toBeUndefined();
  });

  it.each(['../secret.txt', '/etc/passwd', 'products/../../x.jpg', 'a b.jpg'])(
    'rejects the key %s',
    async (key) => {
      await expect(storage.put(key, Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
        /Invalid storage key/,
      );
    },
  );
});
