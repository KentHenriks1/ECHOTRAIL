import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash passwords
  const demoPasswordHash = await bcrypt.hash('demo123', 10);
  const testPasswordHash = await bcrypt.hash('test123', 10);

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@echotrail.com' },
    update: {},
    create: {
      email: 'demo@echotrail.com',
      name: 'Demo User',
      password_hash: demoPasswordHash,
      role: 'USER',
      preferences: {
        units: 'metric',
        theme: 'auto',
        enableNotifications: true,
        enableLocationTracking: true,
        privacyLevel: 'public'
      }
    }
  });

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@echotrail.com' },
    update: {},
    create: {
      email: 'test@echotrail.com',
      name: 'Test User',
      password_hash: testPasswordHash,
      role: 'USER',
      preferences: {
        units: 'imperial',
        theme: 'light',
        enableNotifications: false,
        enableLocationTracking: true,
        privacyLevel: 'private'
      }
    }
  });

  console.log('✅ Created users:', { demoUser: demoUser.email, testUser: testUser.email });

  // Create demo trail
  const demoTrail = await prisma.trail.create({
    data: {
      name: 'Morning Walk in Oslo',
      description: 'A beautiful morning walk through Oslo city center',
      user_id: demoUser.id,
      is_public: true,
      metadata: {
        distance: 2.5,
        duration: 1800, // 30 minutes in seconds
        startTime: new Date('2024-01-15T08:00:00Z'),
        endTime: new Date('2024-01-15T08:30:00Z'),
        averageSpeed: 5.0,
        maxSpeed: 8.2,
        totalAscent: 45,
        totalDescent: 32,
        weather: {
          temperature: 5,
          condition: 'partly_cloudy',
          humidity: 72
        }
      }
    }
  });

  // Create track points for the demo trail (simplified route)
  const trackPoints = [
    { lat: 59.9139, lng: 10.7522, timestamp: '2024-01-15T08:00:00Z', altitude: 10 },
    { lat: 59.9150, lng: 10.7530, timestamp: '2024-01-15T08:02:00Z', altitude: 12 },
    { lat: 59.9165, lng: 10.7545, timestamp: '2024-01-15T08:05:00Z', altitude: 15 },
    { lat: 59.9180, lng: 10.7560, timestamp: '2024-01-15T08:08:00Z', altitude: 18 },
    { lat: 59.9195, lng: 10.7575, timestamp: '2024-01-15T08:12:00Z', altitude: 25 },
    { lat: 59.9210, lng: 10.7590, timestamp: '2024-01-15T08:15:00Z', altitude: 30 },
    { lat: 59.9220, lng: 10.7600, timestamp: '2024-01-15T08:18:00Z', altitude: 35 },
    { lat: 59.9235, lng: 10.7615, timestamp: '2024-01-15T08:22:00Z', altitude: 40 },
    { lat: 59.9250, lng: 10.7630, timestamp: '2024-01-15T08:25:00Z', altitude: 42 },
    { lat: 59.9260, lng: 10.7640, timestamp: '2024-01-15T08:30:00Z', altitude: 45 }
  ];

  for (const point of trackPoints) {
    await prisma.trackPoint.create({
      data: {
        latitude: point.lat,
        longitude: point.lng,
        timestamp: new Date(point.timestamp),
        altitude: point.altitude,
        accuracy: 5.0,
        speed: 5.5 + Math.random() * 2, // Random speed between 5.5-7.5 km/h
        trail_id: demoTrail.id
      }
    });
  }

  console.log('✅ Created demo trail with track points');

  // Create a share link for the demo trail
  const shareLink = await prisma.shareLink.create({
    data: {
      trail_id: demoTrail.id,
      user_id: demoUser.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
    }
  });

  console.log('✅ Created share link for demo trail');

  // Create user sessions (for testing JWT functionality)
  await prisma.userSession.create({
    data: {
      user_id: demoUser.id,
      refresh_token: 'demo_refresh_token_12345',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      user_agent: 'EchoTrail-Demo/1.0',
      ip_address: '192.168.1.100'
    }
  });

  console.log('✅ Created user session for demo user');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Demo Credentials:');
  console.log('  📧 Email: demo@echotrail.com');
  console.log('  🔑 Password: demo123');
  console.log('');
  console.log('Test Credentials:');
  console.log('  📧 Email: test@echotrail.com');
  console.log('  🔑 Password: test123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });