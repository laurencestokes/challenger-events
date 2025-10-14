# Metadata & SEO Setup

This document describes the metadata, Open Graph, and favicon setup for Challenger Events.

## Favicons

All favicon files are located in `public/favicon/` and include:

- `favicon.ico` - Main favicon for browsers
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon
- `apple-touch-icon.png` - 180x180 Apple touch icon
- `android-chrome-192x192.png` - 192x192 Android icon
- `android-chrome-512x512.png` - 512x512 Android icon

These are automatically referenced in `app/layout.tsx`.

## Web Manifest

The `public/site.webmanifest` file provides PWA (Progressive Web App) capabilities:

```json
{
  "name": "Challenger Events",
  "short_name": "Challenger",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

This allows the app to be installed on mobile devices and appear as a native app.

## Open Graph & Social Sharing

When links are shared on social media platforms (Facebook, LinkedIn, Twitter, etc.), they will display:

- **Title**: Challenger Events - Real-time Fitness Competitions
- **Description**: Create and manage fitness events with real-time leaderboards...
- **Image**: `/sign-in-background.png` (the branded background image)
- **Image dimensions**: 1920x1080

### Twitter Card

Twitter uses a large image card format (`summary_large_image`) for better visibility.

## SEO Metadata

The following metadata is included for search engines:

- **Keywords**: fitness events, competitions, leaderboard, fitness tracking, workout challenges, athlete performance, erg rowing, real-time scoring
- **Authors**: The Challenger Co.
- **Robots**: Index and follow enabled for all content

## Environment Variable

Make sure to set `NEXT_PUBLIC_APP_URL` in your `.env` file:

```env
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

This is used for:
- Open Graph URLs
- Canonical URLs
- Email links
- Sitemap generation (if implemented)

## Testing Social Share

To test how your links will appear when shared:

1. **Facebook**: https://developers.facebook.com/tools/debug/
2. **Twitter**: https://cards-dev.twitter.com/validator
3. **LinkedIn**: Share the link and preview it

Note: You may need to clear the cache on these platforms after making changes to metadata.

## Custom OG Image (Optional)

Currently using `/sign-in-background.png` as the OG image. For optimal social sharing, you may want to create a dedicated OG image:

- **Recommended size**: 1200x630px (Facebook's recommended size)
- **Format**: PNG or JPG
- **Location**: `public/og-image.png`
- **Content**: Should include your logo, tagline, and be visually appealing

Then update in `app/layout.tsx`:

```typescript
images: [
  {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Challenger Events - Fitness Competition Platform',
  },
]
```

