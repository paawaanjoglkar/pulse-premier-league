# PWA Icons

This directory should contain the Progressive Web App icons for installation.

## Required Icons

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

## Design Guidelines

### Color Scheme

- **Primary**: Deep blue/purple gradient (#1A1A6C to #4B0082)
- **Accent**: Gold (#FFD700)
- **Background**: Deep blue (#1A1A6C)

### Icon Content Suggestions

- Cricket bat and ball silhouette
- "PPL" text in bold letters
- Trophy or championship cup
- Circular or rounded square shape

## Generation Tools

### Online Generators

1. **PWA Asset Generator**
   - https://github.com/elegantapp/pwa-asset-generator
   - Command: `npx pwa-asset-generator logo.png ./icons`

2. **Real Favicon Generator**
   - https://realfavicongenerator.net/

3. **Favicon.io**
   - https://favicon.io/

### Manual Creation

Use any graphic design tool:
- Adobe Illustrator / Photoshop
- Figma
- Canva
- GIMP (free)

## Temporary Placeholder

For development/testing, you can create simple colored squares:

```bash
# Using ImageMagick (if installed)
convert -size 192x192 xc:#1A1A6C icons/icon-192.png
convert -size 512x512 xc:#1A1A6C icons/icon-512.png
```

Or use an online placeholder generator with "PPL" text.

## Testing

After adding icons:
1. Open the app in a browser
2. Check browser DevTools → Application → Manifest
3. Verify icons are detected
4. Test "Add to Home Screen" functionality

## Formats

- **PNG format** (required for best compatibility)
- **Transparent background** (optional)
- **Maskable** (for Android adaptive icons)
