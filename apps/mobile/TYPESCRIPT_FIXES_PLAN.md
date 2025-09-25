# TypeScript Fixes Plan - EchoTrail AI Implementation

## 🎯 Current Status
Etter fullstendig review fant vi **191 TypeScript-feil** som må fikses før systemet er produksjonsklart.

## 📋 Prioritert Task Plan

### **Phase 1: Core Type System (Kritisk - må fikses først)**

#### 1.1 GeneratedStory Interface (18 feil)
- [x] ✅ Add `id: string` field to GeneratedStory
- [x] ✅ Add `locationContext?: LocationContext` field
- [ ] ⚠️ Update OpenAIService.parseGeneratedContent to generate IDs
- [ ] ⚠️ Fix all references to story.id in components

#### 1.2 AI Service Manager Integration (11 feil)
- [x] ✅ Fix AIServiceManager imports and exports
- [x] ✅ Remove duplicate service imports
- [ ] ⚠️ Update AIServiceManager.generateStory return type handling
- [ ] ⚠️ Fix playAudio method integration

#### 1.3 Location Context & Enums (9 feil)
- [ ] ⚠️ Fix EnhancedLocationContextService enum values
  - `storyLength: 'long'` → `'lang'`
  - `voiceStyle: 'energisk'` → valid enum values
- [ ] ⚠️ Fix LocationContext usage in components

### **Phase 2: Component Integration (35 feil)**

#### 2.1 MapsScreen Fixes (8 feil)
- [ ] ⚠️ Fix generateStory return type handling (story.story extraction)
- [ ] ⚠️ Update nearbyStories type mapping
- [ ] ⚠️ Fix playStoryAudio calls
- [ ] ⚠️ Remove unused imports

#### 2.2 TrailRecordingScreen Fixes (11 feil)
- [ ] ⚠️ Update to use AIServiceManager.generateStory
- [ ] ⚠️ Fix story state management
- [ ] ⚠️ Fix temporary trail object typing
- [ ] ⚠️ Remove unused imports

#### 2.3 AITestScreen Fixes (6 feil)
- [ ] ⚠️ Update to use AIServiceManager.generateStory
- [ ] ⚠️ Fix playAudio integration
- [ ] ⚠️ Remove unused feedback methods

#### 2.4 StoryMarkerCluster Fixes (18 feil)
- [ ] ⚠️ Update to use GeneratedStory with id and locationContext
- [ ] ⚠️ Remove unused ThemeConfig import
- [ ] ⚠️ Fix maxZoom unused parameter

### **Phase 3: Service Layer Cleanup (45 feil)**

#### 3.1 OpenAIService Fixes (2 feil)
- [ ] ⚠️ Remove unused AVPlaybackStatus import
- [ ] ⚠️ Fix Audio.loadAsync parameter type

#### 3.2 Location Services (18 feil)
- [ ] ⚠️ Fix LocationBasedStoryCacheService story.id references
- [ ] ⚠️ Fix LocationContextService null checks
- [ ] ⚠️ Remove unused parameters in EnhancedLocationContextService

#### 3.3 Performance & Cache Services (7 feil)
- [ ] ⚠️ Remove unused imports in AIPerformanceService
- [ ] ⚠️ Fix cache strategy implementations

### **Phase 4: Test Cleanup (90+ feil)**
- [ ] ⚠️ Clean up test files (performance, contracts, benchmarks)
- [ ] ⚠️ Fix automation test mocks
- [ ] ⚠️ Update type definitions

---

## 🚀 Immediate Action Items (Next 30 min)

### **Critical Path - Must Do Now:**

1. **Fix GeneratedStory ID Generation**
   ```typescript
   // In OpenAIService.parseGeneratedContent
   story.id = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   story.locationContext = trailData; // Add location context
   ```

2. **Fix AIServiceManager.generateStory Usage**
   ```typescript
   // In MapsScreen & TrailRecordingScreen
   const result = await aiServiceManager.generateStory(...);
   const story = result.story; // Extract story from result
   ```

3. **Fix Enum Values**
   ```typescript
   // In EnhancedLocationContextService
   enhanced.storyLength = 'lang'; // not 'long'
   enhanced.voiceStyle = 'rolig'; // use valid enum values
   ```

4. **Update Component Story Usage**
   ```typescript
   // Replace all story.id usage after fixing GeneratedStory
   // Replace all ApiServices.ai calls with aiServiceManager
   ```

---

## 🎯 Success Criteria

### **Phase 1 Complete When:**
- [ ] `pnpm typecheck` shows < 50 errors
- [ ] All AI service integrations work
- [ ] Core story generation functional

### **Phase 2 Complete When:**
- [ ] `pnpm typecheck` shows < 20 errors
- [ ] All screens compile without errors
- [ ] Map and trail integration works

### **Phase 3 Complete When:**
- [ ] `pnpm typecheck` shows 0 errors
- [ ] All services properly integrated
- [ ] System ready for testing

### **Phase 4 Complete When:**
- [ ] All tests pass
- [ ] No type errors anywhere
- [ ] Production ready

---

## ⚡ Quick Wins (Can do in parallel)

- Remove unused imports (automatic with IDE)
- Fix parameter names (rename unused params to `_param`)
- Update enum values to match interfaces
- Fix simple type mismatches

---

## 🔧 Tools & Commands

```bash
# Check progress
pnpm typecheck

# Auto-fix imports
# Use VS Code "Organize Imports" on each file

# Find specific error types
pnpm typecheck 2>&1 | grep "error TS6133" # unused variables
pnpm typecheck 2>&1 | grep "error TS2339" # missing properties
```

---

**Next Step:** Skal jeg starte med Phase 1.1 og fikse GeneratedStory ID-generering først?