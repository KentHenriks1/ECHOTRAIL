# Photo and Camera Functionality - EchoTrail Mobile

## Oversikt

EchoTrail mobile-appen har nå full støtte for kamera- og fotofunksjonalitet, implementert med moderne React Native-komponenter og Expo-biblioteker. Systemet tilbyr omfattende foto-håndtering med optimalisering, feilhåndtering og brukervenlige grensesnitt.

**Forfatter:** Kent Rune Henriksen <Kent@zentric.no>  
**Implementert:** Januar 2025  
**Status:** ✅ Produksjonsklar

## Arkitektur og Komponenter

### 🏗️ System-arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Photo System                         │
├─────────────────────────────────────────────────────────┤
│  UI Components          Services           Utilities     │
│  ┌─────────────────┐   ┌─────────────────┐ ┌──────────┐ │
│  │ PhotoCapture    │   │ PhotoService    │ │ ImageProc│ │
│  │ PhotoGallery    │───│ (Singleton)     │ │ essor    │ │
│  │ ProfileScreen   │   │                 │ │          │ │
│  └─────────────────┘   └─────────────────┘ └──────────┘ │
│                               │                         │
│  ┌─────────────────────────────┼─────────────────────────┤
│  │           Expo Dependencies │                         │
│  │  ┌─────────────────┬────────┼───────┬────────────────┐│
│  │  │ expo-image-     │ expo-  │       │ expo-file-     ││
│  │  │ picker          │ media- │       │ system         ││
│  │  │                 │ library│       │                ││
│  └──┴─────────────────┴────────┴───────┴────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 📱 Hovedkomponenter

#### 1. **PhotoService** (Singleton Service)
- **Plassering:** `src/services/media/PhotoService.ts`
- **Ansvar:** Sentral håndtering av alle foto-operasjoner
- **Funksjoner:**
  - Tillatelse-håndtering (kamera, galeri, skriving)
  - Foto-opptak med kamera
  - Foto-valg fra galeri  
  - Foto-optimalisering og prosessering
  - Lagring til enhetens galeri
  - Fil-håndtering og metadata

#### 2. **PhotoCapture** (UI Component)
- **Plassering:** `src/components/common/PhotoCapture.tsx`
- **Ansvar:** Gjenbrukbar komponent for foto-opptak
- **Egenskaper:**
  - Støtter kamera, galeri eller begge
  - Konfigurerbare størrelser og former
  - Auto-optimalisering
  - Loading states og feilhåndtering
  - Animasjoner og moderne UI

#### 3. **PhotoGallery** (UI Component)
- **Plassering:** `src/components/common/PhotoGallery.tsx`
- **Ansvar:** Galleri for visning og administrering av flere bilder
- **Egenskaper:**
  - Grid-basert responsive layout
  - Fullskjerm-visning med navigering
  - Batch-operasjoner (legg til/fjern)
  - Støtte for maks-antall bilder
  - Optimalisert ytelse med lazy loading

### 🔧 Konfigurasjon og Permissions

#### Expo App Configuration
```json
{
  "expo": {
    "plugins": [
      "expo-image-picker",
      ["expo-media-library", {
        "photosPermission": "EchoTrail lagrer bilder i fotobiblioteket...",
        "savePhotosPermission": "EchoTrail lagrer minner og bilder...",
        "isAccessMediaLocationEnabled": true
      }]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "EchoTrail bruker kameraet for å ta bilder...",
        "NSPhotoLibraryUsageDescription": "EchoTrail lagrer bilder i fotobiblioteket...",
        "NSPhotoLibraryAddUsageDescription": "EchoTrail lagrer minner og bilder..."
      }
    },
    "android": {
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.ACCESS_MEDIA_LOCATION"
      ]
    }
  }
}
```

#### Package Dependencies
```json
{
  "dependencies": {
    "expo-image-picker": "~17.0.8",
    "expo-media-library": "~18.2.0",
    "expo-file-system": "~19.0.15"
  }
}
```

## 📚 API Dokumentasjon

### PhotoService API

#### Hovedmetoder

```typescript
class PhotoService {
  static getInstance(): PhotoService
  
  async checkPermissions(): Promise<PhotoPermissions>
  async takePhoto(options?: PhotoOptions): Promise<PhotoResult>
  async selectFromGallery(options?: PhotoOptions): Promise<PhotoResult>
  async showPhotoOptions(options?: PhotoOptions): Promise<PhotoResult>
  
  async saveToGallery(uri: string, albumName?: string): Promise<boolean>
  async optimizePhoto(uri: string, options?: OptimizationOptions): Promise<string>
  async deletePhoto(uri: string): Promise<boolean>
  async getPhotoInfo(uri: string): Promise<FileInfo>
}
```

#### Type Definitions

```typescript
interface PhotoOptions {
  quality?: number; // 0-1
  allowsEditing?: boolean;
  aspect?: [number, number];
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
  exif?: boolean;
  base64?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

interface PhotoResult {
  success: boolean;
  assets: PhotoAsset[];
  error?: string;
}

interface PhotoAsset {
  uri: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  fileSize?: number;
  exif?: any;
  base64?: string;
  fileName?: string;
  mimeType?: string;
}

interface PhotoPermissions {
  camera: boolean;
  mediaLibrary: boolean;
  mediaLibraryWrite: boolean;
}
```

### PhotoCapture API

#### Props

```typescript
interface PhotoCaptureProps {
  // Callbacks
  onPhotoSelected?: (asset: PhotoAsset) => void;
  onPhotoRemoved?: () => void;
  onError?: (error: string) => void;
  
  // Configuration
  mode?: 'camera' | 'gallery' | 'both'; // Default: 'both'
  size?: 'small' | 'medium' | 'large'; // Default: 'medium' 
  shape?: 'circle' | 'square' | 'rounded'; // Default: 'rounded'
  
  // Photo options
  photoOptions?: PhotoOptions;
  currentImageUri?: string;
  
  // Behavior
  allowRemove?: boolean; // Default: true
  showPreview?: boolean; // Default: true
  autoOptimize?: boolean; // Default: true
  
  // Styling and text
  style?: ViewStyle;
  addPhotoText?: string;
  changePhotoText?: string;
  removePhotoText?: string;
}
```

### PhotoGallery API

#### Props

```typescript
interface PhotoGalleryProps {
  // Data
  photos?: PhotoAsset[];
  
  // Callbacks
  onPhotosChanged?: (photos: PhotoAsset[]) => void;
  onPhotoSelected?: (photo: PhotoAsset, index: number) => void;
  onPhotosAdded?: (photos: PhotoAsset[]) => void;
  onPhotoRemoved?: (photo: PhotoAsset, index: number) => void;
  onError?: (error: string) => void;
  
  // Configuration
  maxPhotos?: number; // Default: unlimited
  allowAdd?: boolean; // Default: true
  allowRemove?: boolean; // Default: true
  allowFullscreen?: boolean; // Default: true
  
  // UI configuration
  columns?: number; // Default: 3
  spacing?: number; // Default: 8
  aspectRatio?: number; // Default: 1 (square)
  
  // Styling
  style?: ViewStyle;
  emptyStateText?: string;
  addPhotoText?: string;
}
```

## 🎯 Brukseksempler

### Enkelt Foto-opptak

```tsx
import { PhotoCapture } from '../components/common/PhotoCapture';
import { PhotoAsset } from '../services/media/PhotoService';

const MyComponent = () => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const handlePhotoSelected = (asset: PhotoAsset) => {
    setProfilePhoto(asset.uri);
    // Lagre til backend eller lokal state
  };

  const handleError = (error: string) => {
    Alert.alert('Foto-feil', error);
  };

  return (
    <PhotoCapture
      currentImageUri={profilePhoto}
      onPhotoSelected={handlePhotoSelected}
      onPhotoRemoved={() => setProfilePhoto(null)}
      onError={handleError}
      size="large"
      shape="circle"
      mode="both"
      photoOptions={{
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1]
      }}
    />
  );
};
```

### Foto-galleri med Flere Bilder

```tsx
import PhotoGallery from '../components/common/PhotoGallery';

const TrailPhotosScreen = () => {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);

  return (
    <PhotoGallery
      photos={photos}
      onPhotosChanged={setPhotos}
      onPhotoSelected={(photo, index) => {
        console.log('Selected photo:', photo.uri);
      }}
      onError={(error) => Alert.alert('Error', error)}
      maxPhotos={10}
      allowAdd={true}
      allowRemove={true}
      allowFullscreen={true}
      columns={3}
      photoOptions={{
        quality: 0.7,
        allowsMultipleSelection: true
      }}
      emptyStateText="Ingen bilder lagt til enda. Trykk + for å legge til!"
    />
  );
};
```

### Avansert Photo Service Bruk

```tsx
import { PhotoService } from '../services/media/PhotoService';

const usePhotoOperations = () => {
  const photoService = PhotoService.getInstance();

  const takeHighQualityPhoto = async () => {
    const result = await photoService.takePhoto({
      quality: 1.0,
      allowsEditing: true,
      exif: true,
      aspect: [4, 3]
    });

    if (result.success && result.assets.length > 0) {
      const photo = result.assets[0];
      
      // Optimalisér for app-bruk
      const optimizedUri = await photoService.optimizePhoto(photo.uri, {
        maxWidth: 1200,
        maxHeight: 900,
        quality: 'high',
        format: 'jpg'
      });
      
      // Lagre til galleriet
      await photoService.saveToGallery(optimizedUri, 'EchoTrail');
      
      return optimizedUri;
    }
    
    throw new Error(result.error || 'Foto-opptak mislyktes');
  };

  const selectMultiplePhotos = async (maxCount: number = 5) => {
    const result = await photoService.selectFromGallery({
      allowsMultipleSelection: true,
      quality: 0.8
    });

    if (result.success) {
      // Begrens antall bilder
      return result.assets.slice(0, maxCount);
    }
    
    throw new Error(result.error || 'Kunne ikke velge bilder');
  };

  return {
    takeHighQualityPhoto,
    selectMultiplePhotos
  };
};
```

## 🧪 Testing

### Unit Testing

Systemet inkluderer omfattende tester for alle komponenter:

```typescript
// PhotoService testing
import { PhotoService } from '../PhotoService';

describe('PhotoService', () => {
  it('should take photo successfully', async () => {
    const photoService = PhotoService.getInstance();
    const result = await photoService.takePhoto();
    
    expect(result.success).toBe(true);
    expect(result.assets).toHaveLength(1);
  });
});

// PhotoCapture component testing  
import { render, fireEvent } from '@testing-library/react-native';
import { PhotoCapture } from '../PhotoCapture';

test('renders add photo button', () => {
  const { getByText } = render(<PhotoCapture />);
  expect(getByText('Add Photo')).toBeTruthy();
});
```

### Integration Testing

```bash
# Kjør alle foto-relaterte tester
npm run test -- --testPathPattern="photo|camera"

# Kjør kun PhotoService tester
npm run test -- PhotoService.test.ts

# Kjør komponent-tester
npm run test -- PhotoCapture.test.tsx PhotoGallery.test.tsx
```

## 🔄 Lazy Loading og Performance

### Lazy Loading Komponenter

```tsx
// Tilgjengelig via lazy loading system
import { 
  LazyPhotoCaptureComponent,
  LazyPhotoGalleryComponent,
  LazyPhotoService 
} from '../components/lazy';

// Bruk i stedet for direkte import for bedre ytelse
const LazyPhotoScreen = () => {
  return (
    <LazyPhotoGalleryComponent 
      photos={photos}
      onPhotosChanged={setPhotos}
    />
  );
};
```

### Performance Optimaliseringer

1. **Automatisk Bildekomprimering**
   - Standard kvalitet: 0.8 (80%)
   - Maks dimensjoner: 1200x1200px
   - Format-optimalisering: WebP når tilgjengelig

2. **Lazy Loading av Bilder**
   - Progressive loading med blur-effekt
   - Prioritering av synlige bilder
   - Bakgrunns-loading for ikke-synlige

3. **Memory Management**
   - Automatisk cleanup av temporary filer
   - Begrenset concurrent prosessering
   - Cache-optimalisering for hyppig brukte bilder

## 🚨 Feilhåndtering og Debugging

### Vanlige Problemer og Løsninger

#### 1. Permission Denied Errors
```typescript
// Sjekk tillatelser før bruk
const permissions = await photoService.checkPermissions();
if (!permissions.camera) {
  const granted = await photoService.requestPermissionWithAlert('camera');
  if (!granted) {
    // Vis brukervenlig feilmelding
    Alert.alert('Tillatelse nødvendig', 'Kamera-tilgang kreves for å ta bilder');
    return;
  }
}
```

#### 2. Optimalisering-feil
```typescript
// Graceful fallback ved optimalisering-feil
try {
  const optimizedUri = await photoService.optimizePhoto(originalUri);
  setPhotoUri(optimizedUri);
} catch (optimizeError) {
  console.warn('Optimization failed, using original:', optimizeError);
  setPhotoUri(originalUri); // Bruk originalen
}
```

#### 3. Memory Issues
```typescript
// Clean up temporary files
useEffect(() => {
  return () => {
    // Cleanup ved unmount
    if (tempPhotoUri) {
      photoService.deletePhoto(tempPhotoUri);
    }
  };
}, []);
```

### Debug-logging

```typescript
// Aktiver detaljert logging for foto-operasjoner
import { Logger } from '../core/utils/Logger';

const logger = new Logger('PhotoDebug');
logger.info('Photo operation started', { operation: 'takePhoto', options });
```

## 🔒 Sikkerhet og Personvern

### Data Protection
- Alle bilder lagres lokalt på enheten
- Ingen automatisk opplasting til eksterne servere
- EXIF-data kan fjernes for personvern
- Bruker har full kontroll over bilder

### Permissions Håndtering
- Eksplisitt tillatelses-forespørsler
- Brukervenlige forklaringer
- Graceful degradation ved manglende tillatelser
- Respekt for brukers valg

### Best Practices
```typescript
// Alltid sjekk tillatelser først
const hasPermission = await photoService.checkPermissions();

// Gi tydelige feilmeldinger
if (!result.success) {
  const userFriendlyMessage = translateErrorMessage(result.error);
  showUserMessage(userFriendlyMessage);
}

// Clean up sensitive data
await photoService.deletePhoto(tempUri);
```

## 📈 Metrics og Analytics

### Performance Metrics
- Gjennomsnittlig foto-opptak tid
- Optimalisering-effektivitet (før/etter filstørrelse)
- Memory usage under foto-operasjoner
- Feilrater for ulike operasjoner

### User Experience Metrics
- Permission grant rates
- Feature adoption rates
- Error frequency og typer
- User satisfaction ratings

## 🔮 Fremtidige Forbedringer

### Planlagte Features
1. **Batch Photo Processing** - Prosesser flere bilder samtidig
2. **Cloud Sync** - Valgfri synkronisering med sky-tjenester  
3. **Advanced Editing** - Innebygd bilderedigering
4. **AI-powered Features** - Automatisk tagging og organisering
5. **Video Support** - Støtte for video-opptak og -redigering

### Tekniske Oppgraderinger
1. **WebP/AVIF Support** - Modernere bildeformater
2. **Background Processing** - Asynkron prosessering
3. **PWA Camera Access** - Kamera-støtte for web-versjon
4. **AR Integration** - Augmented reality features

## 📞 Support og Kontakt

**Utvikler:** Kent Rune Henriksen  
**E-post:** Kent@zentric.no  
**Dokumentasjon oppdatert:** Januar 2025

For spørsmål, feilrapporter eller feature-ønsker, kontakt utviklingsteamet eller opprett en issue i prosjektets repository.

---

*Denne dokumentasjonen er en del av EchoTrail mobile-appens tekniske dokumentasjon og oppdateres jevnlig etter hvert som nye features implementeres.*