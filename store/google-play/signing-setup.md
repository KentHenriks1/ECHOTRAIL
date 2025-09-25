# App Signing Setup for Google Play Store - EchoTrail

## Overview

Google Play App Signing is the recommended method for securing your app. Google manages and protects your app's signing key for you, using Google's secure infrastructure.

## 1. App Signing Strategy

### Recommended: Google Play App Signing
- Google holds your app signing key and uses it to sign your APKs for distribution
- You keep an upload key to sign your app bundle
- Benefits: Key security, app bundle optimization, multiple APK generation

### Key Hierarchy
```
App Signing Key (Google Managed)
└── Upload Key (Developer Managed)
    └── APK/AAB (Signed with upload key)
```

## 2. EAS Build Configuration

### Current EAS Configuration
The app is already configured for proper signing in `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./android-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

## 3. Generate Upload Key for Google Play

### Method 1: Using EAS CLI (Recommended)
```bash
# Login to EAS
eas login

# Generate credentials for Android
eas credentials -p android

# Follow prompts to:
# 1. Generate new keystore
# 2. Set up Google Play service account
# 3. Configure upload key
```

### Method 2: Manual Keystore Generation
```bash
# Only use if EAS CLI method doesn't work
keytool -genkey -v -keystore echotrail-upload.keystore \
  -alias echotrail-upload -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass [SECURE_PASSWORD] \
  -keypass [SECURE_PASSWORD] \
  -dname "CN=Zentric AS, O=Zentric AS, L=Oslo, S=Oslo, C=NO"
```

## 4. Service Account Setup

### Steps in Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable Google Play Developer API
4. Create service account:
   - Name: `echotrail-play-console`
   - Role: `Service Account User`
5. Generate JSON key file
6. Download and save securely

### Required Permissions
In Google Play Console, grant the service account these permissions:
- **Release Management:** Create and manage releases
- **Store Listing:** Update store information  
- **Pricing & Distribution:** Manage availability

## 5. Keystore Security Best Practices

### Storage Guidelines
- **NEVER** commit keystores to version control
- Store keystores in secure, encrypted locations
- Create multiple backups in different locations
- Use strong passwords (min 20 characters)
- Document keystore details securely

### Backup Strategy
```
Primary: Encrypted cloud storage (personal)
Secondary: Physical encrypted USB drive
Tertiary: Secure company vault/safe
```

### Keystore Information Template
```
Keystore: echotrail-upload.keystore
Alias: echotrail-upload
Store Password: [REDACTED]
Key Password: [REDACTED]
Validity: 10000 days (until ~2051)
Created: [DATE]
Fingerprint: [SHA-256 FINGERPRINT]
```

## 6. Build Process for Play Store

### Production Build Command
```bash
# Build AAB for production
eas build --platform android --profile production

# This will:
# 1. Use production configuration
# 2. Sign with upload key
# 3. Generate optimized app bundle
# 4. Prepare for Play Store upload
```

### Build Verification
```bash
# After build completes, verify:
# 1. App bundle is signed with upload key
# 2. Size is optimized
# 3. All required permissions are included
# 4. Version code incremented properly
```

## 7. Google Play Console Upload

### First-Time Setup
1. Go to Google Play Console
2. Create new app
3. Complete store listing
4. Upload first AAB to Internal Testing
5. Opt into Google Play App Signing
6. Upload upload certificate

### Upload Process
```bash
# Option 1: Manual upload
# Download AAB from EAS and upload via Play Console

# Option 2: Automated with EAS Submit
eas submit --platform android --profile production
```

## 8. Certificate Management

### Upload Certificate
When you first upload your AAB, you'll need to provide the upload certificate:

```bash
# Extract certificate from keystore
keytool -export -rfc -keystore echotrail-upload.keystore \
  -alias echotrail-upload \
  -file upload-certificate.pem
```

### App Signing Certificate
Google will generate and manage the app signing certificate. You can download it from Play Console for:
- Third-party service integration
- Certificate pinning
- API authentication

## 9. Version Management

### Version Code Strategy
```javascript
// Auto-increment version code in eas.json
"production": {
  "android": {
    "buildType": "app-bundle",
    "autoIncrement": true  // EAS handles version code
  }
}
```

### Version Name Strategy
- **Major:** 1.0.0 (significant features)
- **Minor:** 1.1.0 (new features)
- **Patch:** 1.0.1 (bug fixes)

## 10. Security Checklist

### Before First Upload
- [ ] Upload key generated with strong password
- [ ] Keystore backed up in 3 locations
- [ ] Service account configured with minimal permissions
- [ ] JSON key file stored securely
- [ ] Upload certificate extracted and ready
- [ ] Build signed and verified

### Ongoing Security
- [ ] Rotate service account keys annually
- [ ] Monitor Play Console for suspicious activity
- [ ] Keep keystore passwords in secure password manager
- [ ] Regular backup verification
- [ ] Update team access permissions as needed

## 11. Troubleshooting

### Common Issues

**Build fails with signing error:**
```bash
# Check EAS credentials
eas credentials -p android

# Regenerate if needed
eas credentials -p android --clear-cache
```

**Upload rejected by Play Console:**
- Verify AAB is signed with upload key
- Check version code is higher than previous
- Ensure all required permissions are declared
- Validate app bundle format

**Service account authentication fails:**
```bash
# Verify service account JSON is valid
# Check permissions in Play Console
# Ensure API is enabled in Cloud Console
```

## 12. Emergency Procedures

### Lost Upload Key
If upload key is lost or compromised:
1. Contact Google Play Support immediately
2. Provide app signing certificate details
3. Generate new upload key
4. Update Play Console with new certificate

### Compromised Service Account
1. Revoke current service account access
2. Generate new service account and JSON key
3. Update EAS configuration
4. Verify no unauthorized changes made

## 13. Automated Pipeline

### GitHub Actions Integration (Future)
```yaml
# .github/workflows/release.yml
name: Release to Play Store
on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup EAS CLI
        run: npm install -g @expo/eas-cli
      - name: Build and Submit
        run: |
          eas build --platform android --profile production --non-interactive
          eas submit --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## 14. Monitoring & Alerts

### Key Metrics to Monitor
- Build success rate
- Upload success rate
- Certificate expiration dates
- Service account usage
- Unauthorized access attempts

### Alerts Setup
- Certificate expiration (90 days notice)
- Failed builds/uploads
- Unusual service account activity
- Play Console policy violations

---

## Important Notes

⚠️ **Critical Security Reminders:**
1. NEVER share keystore passwords via email or chat
2. NEVER commit keystores or service account JSON to git
3. Always use encrypted storage for sensitive files
4. Regular security audits of access permissions
5. Document all keystore details in secure location

📞 **Emergency Contacts:**
- Google Play Support: Available through Play Console
- EAS Support: support@expo.dev
- Internal Team: [Team contact details]

---

*This document contains sensitive security information and should be stored securely with limited access.*