# Pulse Premier League (PPL)

**Offline Box Cricket Tournament Scoring Progressive Web Application**

## Overview

Pulse Premier League is a complete offline-first PWA for scoring underarm box cricket tournaments. Built with vanilla JavaScript, IndexedDB, and GitHub sync capabilities.

## Features

- ✅ Offline-first architecture with IndexedDB
- ✅ Ball-by-ball scoring with all 11 dismissal types
- ✅ Power Ball mode (2x run multiplier on 6th legal delivery)
- ✅ Super Over support with repeat until result
- ✅ MVP auto-calculation and 13 tournament awards
- ✅ Points table with NRR calculation
- ✅ Unlimited undo and ball-by-ball edit log
- ✅ GitHub sync for cloud backup
- ✅ Excel export (7 comprehensive sheets)
- ✅ IPL-style theme with dark mode
- ✅ Responsive design (mobile-first)

## Installation

### For Development

1. Clone this repository
2. Generate PWA icons (see below)
3. Serve via local server or GitHub Pages

### PWA Icon Generation

Generate 192x192 and 512x512 PNG icons for the app:

```bash
# Create icons directory if not exists
mkdir -p icons

# Use any icon generator tool or create custom icons
# Required: icons/icon-192.png (192x192)
# Required: icons/icon-512.png (512x512)
# Color scheme: Deep blue/purple (#1A1A6C, #4B0082) with gold accent (#FFD700)
```

Recommended: Use [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or similar tools.

### GitHub Pages Deployment

1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select source: main branch / docs folder (or root)
4. Save and wait 1-2 minutes
5. Access via provided URL

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: IndexedDB (browser-native)
- **Offline**: Service Worker + Cache API
- **Cloud Backup**: GitHub REST API v3
- **Hosting**: GitHub Pages (free HTTPS)
- **Excel Export**: SheetJS (xlsx.min.js)

## File Structure

```
pulse-premier-league/
├── index.html              # Single Page Application
├── css/style.css           # IPL-style theme (light/dark)
├── js/
│   ├── app.js              # App initialization & routing
│   ├── storage.js          # IndexedDB operations
│   ├── scoring.js          # Ball processing & validation
│   ├── powerball.js        # Power ball logic
│   ├── stats.js            # Statistics aggregation
│   ├── mvp.js              # MVP calculation
│   ├── points.js           # Points table & NRR
│   ├── sync.js             # GitHub sync
│   ├── export.js           # Excel export
│   └── utils.js            # Helper functions
├── lib/xlsx.min.js         # SheetJS library
├── icons/                  # PWA icons
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
└── README.md
```

## Usage

### First-Time Setup

1. Open the app (online for first load)
2. Tap "Add to Home Screen" to install PWA
3. Go to Settings → Configure GitHub sync (optional)
4. Create Tournament → Add Teams → Add Players → Create Fixtures

### Scoring a Match

1. Dashboard → Fixtures → Select match → Start Match
2. Complete 7-step setup wizard
3. Score ball-by-ball using touch-friendly buttons
4. Undo anytime or edit any ball via Ball Log
5. Complete innings → View Match Summary
6. Confirm/Override MVP → Sync to Cloud

### Data Management

- **Auto-save**: Every ball saved to IndexedDB automatically
- **Manual sync**: Tap "Sync to Cloud" to push to GitHub
- **Excel export**: Download comprehensive 7-sheet report anytime
- **Offline**: 100% functional without internet after first load

## Cricket Rules (Box Cricket Variant)

- **Format**: Default 5 overs per side (configurable per match)
- **Bowling**: Max 1 over per bowler (app-enforced)
- **Boundaries**: Maximum 4 runs (no sixes allowed)
- **Hit Six**: Batter dismissed for 0 runs, bowler gets wicket
- **Power Ball**: 6th legal delivery of every over = 2x run multiplier
- **No Free Hits**: No-balls do NOT result in free hits
- **Super Over**: Tied matches go to super over (repeat until result)

## Browser Compatibility

| Browser | Priority | Min Version |
|---------|----------|-------------|
| Chrome (Android/Desktop) | Primary | 80+ |
| Edge (Desktop) | Primary | 80+ |
| Safari (iOS/iPad) | Secondary | 13+ |
| Firefox (Android/Desktop) | Secondary | 75+ |

## License

Private project - All rights reserved

## Version

1.0.0 - Initial Release

## Support

For issues or questions, refer to the PPL_MASTER_DOCUMENT_v2.md
