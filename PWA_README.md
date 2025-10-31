# PWA (Progressive Web App) Setup

This expense tracker is now a fully functional Progressive Web App!

## Features

✅ **Offline Support** - Works without internet connection
✅ **Install Prompt** - Users can install the app on their devices
✅ **App Icons** - Custom icons for all platforms
✅ **Service Worker** - Caches assets for faster loading
✅ **Manifest** - Proper PWA configuration
✅ **Push Notifications** - Ready for future implementation
✅ **Background Sync** - Ready for offline data syncing

## Installation

### For Users

1. **Desktop (Chrome/Edge)**:
   - Look for the install icon in the address bar
   - Click "Install" when prompted
   - Or click the floating "Install App" button

2. **Mobile (Android)**:
   - Tap the menu (⋮) 
   - Select "Add to Home Screen"
   - Or use the install banner that appears

3. **iOS (Safari)**:
   - Tap the Share button
   - Select "Add to Home Screen"

### For Developers

The PWA is automatically configured. Just run:

```bash
npm run dev
```

Then open in a browser and test the install functionality.

## Files Structure

```
public/
├── manifest.json          # PWA manifest with app metadata
├── sw.js                  # Service worker for offline support
├── offline.html          # Offline fallback page
└── icons/                # App icons in various sizes
    ├── icon-72x72.png.svg
    ├── icon-96x96.png.svg
    ├── icon-128x128.png.svg
    ├── icon-144x144.png.svg
    ├── icon-152x152.png.svg
    ├── icon-192x192.png.svg
    ├── icon-384x384.png.svg
    ├── icon-512x512.png.svg
    └── apple-touch-icon.svg

src/components/ui/
└── InstallPrompt.tsx     # Install button and banner components
```

## Components

### `<InstallPrompt />`
Floating install button and auto-appearing banner that prompts users to install the app.

### `<FooterInstallSection />`
Footer section with install button for better visibility.

## Customization

### Change App Colors

Edit `public/manifest.json`:

```json
{
  "background_color": "#ffffff",
  "theme_color": "#2563eb"
}
```

### Change App Icons

1. Replace SVG files in `public/icons/`
2. Or run: `npm run generate-icons`
3. For production, convert SVGs to PNGs

### Modify Caching Strategy

Edit `public/sw.js` to change what gets cached and how.

## Testing PWA

1. **Lighthouse Audit**:
   - Open DevTools (F12)
   - Go to Lighthouse tab
   - Run PWA audit

2. **Application Tab**:
   - Check manifest
   - Verify service worker
   - Test offline mode

3. **Mobile Testing**:
   - Use Chrome DevTools device mode
   - Or test on real device

## Production Deployment

For production, ensure:

1. ✅ HTTPS is enabled (required for PWA)
2. ✅ All icons are proper PNG files
3. ✅ Service worker is properly registered
4. ✅ Manifest is accessible

## Browser Support

- ✅ Chrome (Desktop & Mobile)
- ✅ Edge
- ✅ Safari (iOS 11.3+)
- ✅ Firefox
- ✅ Samsung Internet
- ⚠️ IE (Not supported)

## Offline Functionality

The app caches:
- Static assets (CSS, JS, fonts)
- App shell
- Icons and manifest
- Previously visited pages

API requests are not cached by default to ensure data freshness.

## Future Enhancements

- [ ] Push notifications for loan reminders
- [ ] Background sync for offline transactions
- [ ] Share target API for importing data
- [ ] Periodic background sync for updates
- [ ] Install analytics tracking

## Troubleshooting

### Install button doesn't appear

- Ensure you're using HTTPS
- Check browser console for errors
- Verify manifest.json is accessible
- Clear cache and reload

### Service worker not registering

- Check console for errors
- Ensure sw.js is in public folder
- Verify HTTPS is enabled
- Try incognito mode

### Offline mode not working

- Check if service worker is active
- Verify caching strategy
- Test network throttling in DevTools

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
