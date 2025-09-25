# EchoTrail Photo Functionality - Quick Reference

**Implementert av:** Kent Rune Henriksen <Kent@zentric.no>  
**Status:** ✅ Produksjonsklar

## 🚀 Hurtigstart

### Enkelt Foto-opptak
```tsx
import { PhotoCapture } from '../components/common/PhotoCapture';

<PhotoCapture 
  onPhotoSelected={(asset) => setPhoto(asset.uri)}
  mode="both" // kamera, galeri, eller begge
  size="large" 
  shape="circle" 
/>
```

### Photo Gallery
```tsx
import PhotoGallery from '../components/common/PhotoGallery';

<PhotoGallery 
  photos={photos}
  onPhotosChanged={setPhotos}
  maxPhotos={10}
/>
```

### Direct Service Usage
```tsx
import { PhotoService } from '../services/media/PhotoService';

const photoService = PhotoService.getInstance();
const result = await photoService.takePhoto({ quality: 0.8 });
```

## 📦 Installerte Pakker

```json
{
  "expo-image-picker": "~17.0.8",
  "expo-media-library": "~18.2.0", 
  "expo-file-system": "~19.0.15"
}
```

## 🔑 Nøkkel-funksjoner

| Funksjon | PhotoService | PhotoCapture | PhotoGallery |
|----------|--------------|--------------|--------------|
| Ta foto fra kamera | ✅ | ✅ | ✅ |
| Velg fra galeri | ✅ | ✅ | ✅ |
| Flere bilder samtidig | ✅ | ❌ | ✅ |
| Auto-optimalisering | ✅ | ✅ | ✅ |
| Lagring til galeri | ✅ | ❌ | ❌ |
| Fullskjerm-visning | ❌ | ❌ | ✅ |
| Permission handling | ✅ | ✅ | ✅ |

## ⚙️ Vanlige Konfigurasjoner

### Profil-foto (Rundt)
```tsx
<PhotoCapture
  size="large"
  shape="circle" 
  mode="both"
  photoOptions={{ aspect: [1, 1], allowsEditing: true }}
/>
```

### Trail-galeri
```tsx
<PhotoGallery
  maxPhotos={20}
  columns={3}
  aspectRatio={1.33} // 4:3 ratio
  photoOptions={{ quality: 0.7, allowsMultipleSelection: true }}
/>
```

### Høykvalitets foto
```tsx
const result = await photoService.takePhoto({
  quality: 1.0,
  allowsEditing: true,
  exif: true
});
```

## 🎯 Component Props (Mest brukte)

### PhotoCapture
```typescript
interface PhotoCaptureProps {
  onPhotoSelected?: (asset: PhotoAsset) => void;
  currentImageUri?: string;
  mode?: 'camera' | 'gallery' | 'both';
  size?: 'small' | 'medium' | 'large';
  shape?: 'circle' | 'square' | 'rounded';
  autoOptimize?: boolean; // default: true
}
```

### PhotoGallery  
```typescript
interface PhotoGalleryProps {
  photos?: PhotoAsset[];
  onPhotosChanged?: (photos: PhotoAsset[]) => void;
  maxPhotos?: number;
  columns?: number; // default: 3
  allowFullscreen?: boolean; // default: true
}
```

## 🔧 PhotoService API

### Hovedmetoder
```typescript
// Permissions
await photoService.checkPermissions()

// Ta/velg foto
await photoService.takePhoto(options?)
await photoService.selectFromGallery(options?)
await photoService.showPhotoOptions(options?) // viser dialog

// Fil-operasjoner
await photoService.optimizePhoto(uri, options?)
await photoService.saveToGallery(uri, albumName?)
await photoService.deletePhoto(uri)
```

### PhotoOptions
```typescript
interface PhotoOptions {
  quality?: number; // 0-1, default: 0.8
  allowsEditing?: boolean; // default: true
  aspect?: [number, number]; // f.eks [1, 1] for kvadrat
  allowsMultipleSelection?: boolean; // default: false
  maxWidth?: number;
  maxHeight?: number;
}
```

## ⚡ Performance Tips

1. **Bruk lazy loading** for store gallerier
```tsx
import { LazyPhotoGalleryComponent } from '../components/lazy';
```

2. **Auto-optimaliser** er aktivert som standard (0.8 kvalitet)

3. **Sett maxPhotos** for å unngå minneproblemer

4. **Bruk aspect ratio** for konsistent layout

## 🚨 Error Handling

### Vanlige feil og løsninger

```tsx
// Permission denied
const permissions = await photoService.checkPermissions();
if (!permissions.camera) {
  // Be om tillatelse eller vis feilmelding
}

// Optimization failure (graceful fallback)
try {
  const optimized = await photoService.optimizePhoto(uri);
  setPhoto(optimized);
} catch (error) {
  setPhoto(uri); // bruk original
}

// Cancelled operations (ignore)
if (result.error?.includes('cancelled')) {
  // Ikke vis feilmelding
  return;
}
```

## 🧪 Testing Commands

```bash
# Alle foto-tester
npm test -- --testPathPattern="photo|camera"

# Spesifikke tester
npm test PhotoService.test.ts
npm test PhotoCapture.test.tsx

# Med coverage
npm run test:coverage -- --testPathPattern="photo"
```

## 📁 Filstruktur

```
src/
├── services/media/
│   ├── PhotoService.ts
│   └── __tests__/PhotoService.test.ts
├── components/common/
│   ├── PhotoCapture.tsx
│   ├── PhotoGallery.tsx 
│   └── __tests__/
│       ├── PhotoCapture.test.tsx
│       └── PhotoGallery.test.tsx
└── components/lazy/
    └── index.tsx (lazy loading exports)
```

## 📋 Sjekkliste for Implementering

- [ ] Importer `PhotoService` eller komponenter
- [ ] Konfigurer permissions i app.json (hvis ikke allerede gjort)
- [ ] Test på både iOS og Android
- [ ] Håndter permission-feil gracefully
- [ ] Sett opp error callbacks
- [ ] Test med ulike bildestørrelser og -formater
- [ ] Verify auto-optimalisering fungerer
- [ ] Test offline-scenario (cached bilder)

## 🆘 Vanlige Problemer

| Problem | Løsning |
|---------|---------|
| "Permission denied" | Sjekk app.json permissions og iOS Info.plist |
| Bilder vises ikke | Verify URI format og fil-eksistens |
| Memory issues | Sett maxPhotos og aktiver autoOptimize |
| Slow loading | Bruk LazyPhotoGalleryComponent |
| Images too large | Konfigurer quality og maxWidth/Height |

## 📞 Support

**Utvikler:** Kent Rune Henriksen <Kent@zentric.no>  
**Full dokumentasjon:** `docs/PHOTO_CAMERA_FUNCTIONALITY.md`

---

*Quick reference oppdatert Januar 2025*