# EchoTrail Backend Server - Enterprise Edition

**Production-ready REST API server powering the EchoTrail platform**

Enterprise-grade backend services featuring AI-powered location storytelling, advanced GPS trail tracking, Microsoft Azure AD authentication, and comprehensive user management. Built with Express.js, Prisma ORM, and Neon PostgreSQL.

**Contact**: Kent Rune Henriksen <Kent@zentric.no> | Zentric AS

## 🚀 Enterprise Features

### 🔒 Authentication & Security
- **Multi-Provider Auth**: JWT + Microsoft Azure AD + Google Sign-In
- **Enterprise SSO**: Azure Active Directory integration
- **Token Management**: Access tokens + refresh tokens with secure rotation
- **Security Hardening**: Rate limiting, CORS, input validation, Helmet.js

### 📍 Trail & Location Services
- **Advanced GPS Tracking**: Comprehensive track point storage and analysis
- **Trail Management**: Create, update, share, and manage hiking trails
- **Location Context**: Weather, seasonal, and cultural context integration
- **Real-time Sync**: Mobile app synchronization with conflict resolution

### 🤖 AI Integration
- **OpenAI GPT-4o**: Advanced story generation with context awareness
- **Cost Optimization**: Intelligent caching and request optimization
- **Performance Monitoring**: AI service performance tracking and alerting
- **Context-Aware Stories**: Season, weather, and time-based adaptations

### 🏗️ Production Infrastructure
- **Database**: Neon PostgreSQL with Prisma ORM and migrations
- **Monitoring**: Winston logging with structured error handling
- **Performance**: Advanced caching and query optimization
- **Deployment**: Vercel serverless with GitHub Actions CI/CD

## 🏗️ Architecture

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: Custom JWT implementation with Stack Auth integration
- **AI Integration**: OpenAI GPT-4 for story generation
- **Maps**: Google Maps and Mapbox integration
- **Logging**: Winston with structured logging
- **Error Handling**: Centralized error management with proper HTTP codes

## 📋 Prerequisites

Before setting up the backend, ensure you have:

- **Node.js 18+** installed
- **npm** or **pnpm** package manager
- **PostgreSQL database** (we use Neon)
- **API Keys** for external services (OpenAI, Google Maps, etc.)

## 🛠️ Installation

### 1. Navigate to Backend Directory

\`\`\`bash
cd ../backend
\`\`\`

### 2. Install Dependencies

\`\`\`bash
# Using npm
npm install

# Using pnpm (recommended)
pnpm install
\`\`\`

### 3. Environment Configuration

The `.env` file is already configured with your credentials. Verify these settings:

\`\`\`env
# Database Configuration
DATABASE_URL="[REDACTED]"
NEON_REST_API_URL="[REDACTED]"

# Stack Auth Configuration
STACK_AUTH_PROJECT_ID="[REDACTED]"
STACK_AUTH_JWKS_URL="[REDACTED]"

# External API Keys
OPENAI_API_KEY="[REDACTED]"
GOOGLE_MAPS_API_KEY="[REDACTED]"
MAPBOX_ACCESS_TOKEN="[REDACTED]"
\`\`\`

### 4. Database Setup

\`\`\`bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with demo data
npm run db:seed
\`\`\`

### 5. Create Logs Directory

\`\`\`bash
mkdir logs
\`\`\`

## 🚀 Running the Server

### Development Mode
\`\`\`bash
npm run dev
\`\`\`

The server will start at `http://localhost:3000` with hot reloading enabled.

### Production Mode
\`\`\`bash
# Build the project
npm run build

# Start production server
npm start
\`\`\`

## 📝 API Documentation

### Base URL
- **Development**: `http://localhost:3000/v1`
- **Production**: `https://your-domain.com/v1`

### Health Check
\`\`\`http
GET /health
\`\`\`

### Authentication Endpoints

#### Register User
\`\`\`http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
\`\`\`

#### Login User
\`\`\`http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

#### Refresh Token
\`\`\`http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
\`\`\`

#### Get Current User
\`\`\`http
GET /v1/auth/me
Authorization: Bearer your-access-token
\`\`\`

### Demo Credentials

The database is seeded with these demo accounts:

- **Admin User**: `admin@echotrail.no` / `admin123!@#`
- **Demo User**: `demo@echotrail.no` / `demo123!@#`
- **Guide User**: `guide@echotrail.no` / `guide123!@#`

## 🧪 Testing the API

### Using curl

\`\`\`bash
# Health check
curl http://localhost:3000/health

# Login with demo user
curl -X POST http://localhost:3000/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"demo@echotrail.no","password":"demo123!@#"}'

# Get stories (with location)
curl "http://localhost:3000/v1/stories?latitude=59.9139&longitude=10.7522&radius=1000"
\`\`\`

### Using a REST Client

You can also test the API using tools like:
- **Postman**
- **Insomnia**
- **Thunder Client** (VS Code extension)
- **REST Client** (VS Code extension)

## 🔧 Development

### Available Scripts

\`\`\`bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database

# Code quality
npm run lint           # Lint code
npm run lint:fix       # Fix linting issues

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode
\`\`\`

### Project Structure

\`\`\`
src/
├── config/           # Configuration management
├── middleware/       # Express middleware
├── routes/          # API route handlers
├── scripts/         # Database seeding and utilities
├── utils/           # Shared utilities
└── index.ts         # Main server entry point

prisma/
└── schema.prisma    # Database schema

logs/                # Application logs
├── combined.log     # All logs
├── error.log        # Error logs only
├── exceptions.log   # Uncaught exceptions
└── rejections.log   # Unhandled promise rejections
\`\`\`

## 🚨 Troubleshooting

### Common Issues

**Database Connection Error**
\`\`\`
Error: Can't reach database server
\`\`\`
- Verify your `DATABASE_URL` is correct
- Check if Neon database is accessible
- Ensure your IP is whitelisted (if applicable)

**JWT Secret Error**
\`\`\`
Error: JWT_SECRET must be at least 32 characters long
\`\`\`
- Generate a secure JWT secret: `openssl rand -base64 32`
- Update the `JWT_SECRET` in your `.env` file

**Port Already in Use**
\`\`\`
Error: listen EADDRINUSE: address already in use :::3000
\`\`\`
- Change the port in `.env`: `PORT=3001`
- Or kill the process using port 3000

### Debugging

Enable debug logging by setting:
\`\`\`env
LOG_LEVEL=debug
\`\`\`

View logs in real-time:
\`\`\`bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log
\`\`\`

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

### Railway
1. Connect GitHub repository
2. Add environment variables
3. Railway will auto-deploy

### Manual Server Deployment
\`\`\`bash
# Build the project
npm run build

# Start with PM2 (production process manager)
npm install -g pm2
pm2 start dist/index.js --name "echotrail-backend"

# Or use forever
npm install -g forever
forever start dist/index.js
\`\`\`

## 🔐 Security Considerations

- **JWT Secrets**: Use strong, unique secrets in production
- **CORS**: Configure allowed origins properly
- **Rate Limiting**: Adjust limits based on your needs
- **Environment Variables**: Never commit secrets to version control
- **Database Security**: Use connection pooling and prepared statements
- **Input Validation**: All inputs are validated with Joi schemas

## 📊 Monitoring

The server includes comprehensive logging and monitoring:

- **Structured Logging**: JSON-formatted logs with metadata
- **Performance Tracking**: Request duration and database query times
- **Error Tracking**: Automatic error capture and reporting
- **Health Checks**: Built-in endpoint for service monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check this README for common solutions
2. Look at the application logs
3. Create an issue in the repository
4. Contact the development team

---

**Happy coding! 🚀**