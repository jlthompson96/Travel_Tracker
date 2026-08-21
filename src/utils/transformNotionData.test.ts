import { describe, expect, it } from 'vitest';
import {
  parseDateRange,
  parseLocation,
  parsePassportStamp,
  parsePhotos,
  parseRatingStars,
  parseRichText,
  parseTitle,
} from './transformNotionData';

describe('parseTitle', () => {
  it('joins rich-text runs, which Notion splits on formatting boundaries', () => {
    expect(parseTitle({ title: [{ plain_text: 'Santo' }, { plain_text: 'rini' }] } as never)).toBe('Santorini');
  });

  it('falls back to "Untitled trip" for missing or whitespace-only titles', () => {
    expect(parseTitle(undefined)).toBe('Untitled trip');
    expect(parseTitle({ title: [] } as never)).toBe('Untitled trip');
    expect(parseTitle({ title: [{ plain_text: '   ' }] } as never)).toBe('Untitled trip');
  });
});

describe('parseRichText', () => {
  it('returns null rather than an empty string, so `notes && ...` guards work', () => {
    expect(parseRichText(undefined)).toBeNull();
    expect(parseRichText({ rich_text: [] } as never)).toBeNull();
    expect(parseRichText({ rich_text: [{ plain_text: '  ' }] } as never)).toBeNull();
  });

  it('preserves surrounding whitespace once there is real content', () => {
    expect(parseRichText({ rich_text: [{ plain_text: ' hi ' }] } as never)).toBe(' hi ');
  });
});

describe('parseRatingStars', () => {
  it('counts star glyphs', () => {
    expect(parseRatingStars({ select: { name: '★★★' } } as never)).toBe(3);
    expect(parseRatingStars({ select: { name: '★★★★★' } } as never)).toBe(5);
  });

  it('is null for anything that is not a star string', () => {
    expect(parseRatingStars(undefined)).toBeNull();
    expect(parseRatingStars({ select: null } as never)).toBeNull();
    expect(parseRatingStars({ select: { name: 'Great' } } as never)).toBeNull();
  });
});

describe('parseDateRange', () => {
  it('computes nights from a start/end pair', () => {
    expect(parseDateRange({ date: { start: '2024-06-01', end: '2024-06-08' } } as never)).toEqual({
      start: '2024-06-01',
      end: '2024-06-08',
      isDateTime: false,
      nights: 7,
    });
  });

  it('leaves nights null for a single-day trip', () => {
    expect(parseDateRange({ date: { start: '2024-06-01' } } as never)?.nights).toBeNull();
  });

  it('detects datetime starts', () => {
    expect(parseDateRange({ date: { start: '2024-06-01T09:00:00Z' } } as never)?.isDateTime).toBe(true);
  });

  it('is null without a start date — the Timeline relies on this to skip undated trips', () => {
    expect(parseDateRange(undefined)).toBeNull();
    expect(parseDateRange({ date: null } as never)).toBeNull();
  });
});

describe('parseLocation', () => {
  it('accepts both spellings Notion uses for coordinates', () => {
    expect(parseLocation({ place: { name: 'A', lat: 1, lon: 2 } } as never)).toMatchObject({
      latitude: 1,
      longitude: 2,
    });
    expect(parseLocation({ place: { name: 'B', latitude: 3, longitude: 4 } } as never)).toMatchObject({
      latitude: 3,
      longitude: 4,
    });
  });

  it('is null when there is neither a name nor coordinates', () => {
    expect(parseLocation(undefined)).toBeNull();
    expect(parseLocation({ place: { name: '' } } as never)).toBeNull();
  });
});

describe('parsePhotos', () => {
  it('reads mirrored site-relative paths and external URLs alike', () => {
    const photos = parsePhotos({
      files: [
        { name: 'a.jpg', type: 'file', file: { url: '/photos/abc.jpg' } },
        { name: 'b.jpg', type: 'external', external: { url: 'https://example.com/b.jpg' } },
      ],
    } as never);

    expect(photos.map((p) => p.url)).toEqual(['/photos/abc.jpg', 'https://example.com/b.jpg']);
  });

  it('drops entries with no usable URL instead of rendering a broken image', () => {
    expect(parsePhotos({ files: [{ name: 'x', type: 'file', file: { url: '' } }] } as never)).toEqual([]);
    expect(parsePhotos(undefined)).toEqual([]);
  });
});

describe('parsePassportStamp', () => {
  it('reads whichever formula result variant Notion returns', () => {
    expect(parsePassportStamp({ formula: { type: 'string', string: 'GR' } } as never)).toBe('GR');
    expect(parsePassportStamp({ formula: { type: 'number', number: 7 } } as never)).toBe('7');
    expect(parsePassportStamp({ formula: { type: 'boolean', boolean: true } } as never)).toBe('true');
    expect(parsePassportStamp({ formula: { type: 'date', date: { start: '2024-01-01' } } } as never)).toBe(
      '2024-01-01',
    );
    expect(parsePassportStamp(undefined)).toBeNull();
  });
});
