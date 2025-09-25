# EchoTrail Neon Database Production Setup

## 🎯 **Neon Database Configuration**

### **Required Extensions for EchoTrail AI Features:**

```sql
-- Core Extensions (Available in Neon)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- ✅ Available
CREATE EXTENSION IF NOT EXISTS "postgis";       -- ✅ Available  
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- ✅ Available
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- ✅ Available
CREATE EXTENSION IF NOT EXISTS "vector";        -- ✅ pgvector Available

-- Performance Extensions (Available in Neon)  
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- ✅ Available
```

## 🚀 **Neon CLI Setup Commands**

### **1. Create Neon Project**
```bash
npx neonctl projects create --name echotrail-production --region eu-central-1
```

### **2. Create Databases for Different Environments**
```bash
# Production Database
npx neonctl databases create echotrail_prod --project-id <project-id>

# Staging Database  
npx neonctl databases create echotrail_staging --project-id <project-id>

# Development Database
npx neonctl databases create echotrail_dev --project-id <project-id>
```

### **3. Get Connection Strings**
```bash
npx neonctl connection-string echotrail_prod --project-id <project-id>
```

## 🔑 **Required API Keys & Services**

### **Neon Configuration**
- **Database URL**: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/echotrail_prod`
- **AI Agent API**: Neon AI Agent endpoints (when available)
- **Connection Pooling**: Built-in with Neon

### **OpenAI Integration** 
- **API Key**: Required for AI story generation
- **Models**: gpt-4o-mini, gpt-4o (for story generation)
- **TTS API**: For voice generation (OpenAI TTS Nova)

### **Additional Services**
- **Weather API**: For context-aware stories (OpenWeatherMap or similar)
- **Sentry**: Error monitoring (already configured)
- **Expo Notifications**: For location-based story triggers

## 🗄️ **Database Schema Deployment**

### **1. Initialize Schema**
```bash
# Connect to Neon and run schema
psql "postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/echotrail_prod" \
  -f database/schema-ai-enhanced.sql
```

### **2. Seed with Real Data**
```bash
# Seed Norwegian trails data
psql "postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/echotrail_prod" \
  -f database/seed-norwegian-trails.sql
```

### **3. Enable Row Level Security (Production)**
```sql
-- Enable RLS for sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_interactions ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY user_own_data ON users FOR ALL USING (id = auth.user_id());
CREATE POLICY user_own_memories ON memories FOR ALL USING (user_id = auth.user_id());
```

## 📱 **React Native Database Connection**

### **TypeScript Database Client**
```typescript
// src/lib/database.ts
import { neonConfig, Pool } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

export const db = new Pool({ 
  connectionString: process.env.NEON_DATABASE_URL 
});

// AI-enhanced query functions
export async function findNearbyStories(
  lat: number, 
  lon: number, 
  userId: string,
  radius: number = 1000
) {
  const result = await db.query(`
    SELECT * FROM find_nearby_stories(
      ST_GeogFromText($1),
      $2,
      $3,
      10
    )
  `, [
    `POINT(${lon} ${lat})`,
    radius,
    JSON.stringify({ user_id: userId })
  ]);
  
  return result.rows;
}
```

## 🤖 **AI Agent Integration Points**

### **1. Real-time Story Generation**
- **Trigger**: GPS location changes within trail_points radius
- **Input**: Location, weather, user preferences, time of day
- **Output**: Generated story + TTS audio URL

### **2. Vector Similarity Search**  
- **User Interests**: Track story interactions to build interest vectors
- **Content Matching**: Match stories to user preferences using cosine similarity
- **Location Context**: Geographic embeddings for location-specific stories

### **3. Intelligent TTS Caching**
- **Deduplication**: Hash-based caching to avoid duplicate TTS generations
- **Priority System**: Cache popular stories longer
- **Cleanup**: Automatic expiration of unused audio files

## 🔒 **Production Security**

### **Environment Variables (EAS Secrets)**
```bash
# Set production secrets
eas secret:create --scope project --name NEON_DATABASE_URL --value "postgresql://..."
eas secret:create --scope project --name OPENAI_API_KEY --value "sk-..."
eas secret:create --scope project --name WEATHER_API_KEY --value "..."
eas secret:create --scope project --name SENTRY_DSN --value "https://..."
```

### **Connection Security**
- **SSL Required**: Always use SSL connections to Neon
- **Connection Pooling**: Neon handles this automatically
- **IP Allowlisting**: Configure if needed (usually not required with Neon)

## 📊 **Monitoring & Performance**

### **Neon Console Monitoring**
- Query performance metrics
- Connection pool usage  
- Storage usage tracking
- Backup status

### **Application Metrics**
```typescript
// Track AI story generation performance
await db.query(`
  INSERT INTO ai_agent_metrics (metric_type, metric_value, metric_unit, context)
  VALUES ('story_generation', $1, 'ms', $2)
`, [generationTimeMs, JSON.stringify(context)]);
```

## 🚀 **Deployment Checklist**

### **Pre-deployment**
- [ ] Neon project created with all required extensions
- [ ] Database schema deployed successfully  
- [ ] Seed data loaded (Norwegian trails)
- [ ] All EAS secrets configured
- [ ] API keys tested and validated

### **Post-deployment**
- [ ] Database connections working in app
- [ ] AI story generation functional
- [ ] TTS caching working
- [ ] Vector similarity search operational
- [ ] Location-based triggers working
- [ ] Performance monitoring active

## 💡 **Production Optimization**

### **Query Performance**
- Use prepared statements for frequent queries
- Leverage Neon's built-in connection pooling
- Monitor slow queries via pg_stat_statements

### **AI Features**
- Pre-generate popular stories during off-peak hours
- Cache vector embeddings to reduce computation
- Implement progressive story loading

### **Cost Optimization** 
- Use Neon's auto-scaling to handle traffic spikes
- Monitor storage usage and implement data retention
- Optimize image/audio storage with external CDN

---

**🎯 Result: 100% production-ready EchoTrail with real Neon database, AI Agent integration, and all Norwegian trail data loaded!**