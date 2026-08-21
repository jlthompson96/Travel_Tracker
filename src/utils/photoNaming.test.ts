import { describe, expect, it } from 'vitest';
import { localPhotoName } from './photoNaming';

/**
 * These cases pin the contract that scripts/mirror-photos.mjs writes files under
 * exactly these names. If this file and that script ever disagree, every photo
 * URL the API rewrites points at a 404.
 */
describe('localPhotoName', () => {
  const base = 'https://prod-files-secure.s3.us-west-2.amazonaws.com';
  const workspace = 'a1b2c3d4-0000-0000-0000-000000000000';
  const block = 'deadbeef-1111-2222-3333-444444444444';

  it('names a photo after its block id, keeping the extension', () => {
    expect(localPhotoName(`${base}/${workspace}/${block}/santorini.jpg?X-Amz-Expires=3600`)).toBe(
      `${block}.jpg`,
    );
  });

  it('rewrites HEIC and HEIF to .jpg, matching the mirror transcode', () => {
    expect(localPhotoName(`${base}/${workspace}/${block}/IMG_0001.HEIC`)).toBe(`${block}.jpg`);
    expect(localPhotoName(`${base}/${workspace}/${block}/IMG_0002.heif`)).toBe(`${block}.jpg`);
  });

  it('lowercases the extension so one photo can only produce one filename', () => {
    expect(localPhotoName(`${base}/${workspace}/${block}/Trip.JPEG`)).toBe(`${block}.jpeg`);
  });

  it('decodes percent-encoded names before reading the extension', () => {
    expect(localPhotoName(`${base}/${workspace}/${block}/my%20photo.png`)).toBe(`${block}.png`);
  });

  it('defaults to .jpg when the original name has no extension', () => {
    expect(localPhotoName(`${base}/${workspace}/${block}/photo`)).toBe(`${block}.jpg`);
  });

  it('returns null for URLs that are not shaped like a Notion file', () => {
    // Callers keep the original URL in this case rather than guessing a path.
    expect(localPhotoName('https://example.com/photo.jpg')).toBeNull();
    expect(localPhotoName('not a url')).toBeNull();
    expect(localPhotoName('')).toBeNull();
  });
});
