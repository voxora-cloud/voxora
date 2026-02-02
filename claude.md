# Voxora - Project Context for AI Assistants

## Project Overview
Voxora is a real-time chat support platform built as a **Turborepo monorepo** with separate API and web frontend applications. It enables teams to provide customer support through real-time conversations with features like team management, agent assignment, and widget embedding.

## Technology Stack

### Backend (apps/api)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache/Sessions**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT (access + refresh tokens)
- **Email**: Nodemailer (other SMTP for production, MailHog for dev)
- **Logging**: Winston

### Frontend (apps/web)
- **Framework**: Next.js 15.4.2 (App Router)
- **React**: 19.1.0
- **Styling**: Tailwind CSS v4.1.11 with CSS variables
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React
- **Real-time**: Socket.IO Client
- **Type Safety**: TypeScript 5.8.2

## Architecture Patterns

### Backend Structure
```
apps/api/src/
├── config/         # Environment & database configuration
├── controllers/    # Route handlers (adminController, agentController, authController, etc.)
├── models/         # MongoDB/Mongoose schemas (User, Team, Conversation, Message, Widget)
├── routes/         # Express route definitions
├── services/       # Business logic layer (AdminService, AgentService, AuthService, EmailService)
├── middleware/     # Auth, validation, error handling
├── sockets/        # Socket.IO event handlers
└── utils/          # Helpers (logger, auth, validation, response)
```

**Key Patterns**:
- **Service Layer Pattern**: Controllers delegate business logic to services
- **Repository Pattern**: Mongoose models act as data access layer
- **Middleware Chain**: auth → validation → controller → service
- **Error Handling**: Centralized error handler middleware

### Frontend Structure
```
apps/web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes group (login, signup, invite)
│   ├── admin/             # Admin dashboard (layout + pages)
│   ├── support/           # Agent support dashboard
│   └── globals.css        # Global styles + CSS variables
├── components/
│   ├── ui/                # Reusable UI components (button, card, input, loader)
│   ├── admin/             # Admin-specific components
│   ├── agent/             # Agent dashboard components
│   ├── auth/              # Authentication forms
│   └── shared/            # Shared components
└── lib/
    ├── api.ts             # API client with typed interfaces
    ├── utils.ts           # Utility functions
    └── interfaces/        # TypeScript interfaces
```

**Key Patterns**:
- **Client Components**: Use "use client" for interactive components
- **Server Components**: Default for static/data-fetching components
- **Layout Nesting**: Shared layouts in layout.tsx files
- **API Integration**: Centralized in `lib/api.ts` with typed responses

## Design System

### Color Palette (Dark Theme)
```css
--background: #0a0a0a        /* Near black */
--foreground: #e5e7eb        /* Light gray text */
--card: #151515              /* Elevated surfaces */
--primary: #10b981           /* Emerald green (brand) */
--secondary: #1f1f1f         /* Dark gray */
--muted: #262626             /* Subtle backgrounds */
--border: #262626            /* Border color */
--destructive: #ef4444       /* Red for errors */
--success: #10b981           /* Green for success */
--warning: #f59e0b           /* Orange for warnings */
--info: #3b82f6              /* Blue for info */
```

### Component Conventions
- **All buttons**: Add `cursor-pointer` class
- **Input fields**: Add `cursor-text` class
- **Cards**: Use hover effects with `hover:shadow-lg transition-shadow`
- **Loading states**: Use `<Loader size="lg" />` component (SVG-based spinner)
- **Navigation**: Use Next.js `<Link>` component, never `<a>` tags
- **Images**: Use Next.js `<Image>` component for optimization

### UI Component Library (Shadcn)
Located in `apps/web/components/ui/`:
- **button.tsx**: Variants (default, outline, ghost, destructive)
- **card.tsx**: Container with border and padding
- **input.tsx**: Styled form inputs
- **loader.tsx**: Animated spinner with size variants (sm, md, lg)
- **dialog.tsx**: Modal/popup component (Radix UI)

## Authentication & Authorization

### User Roles
1. **Admin**: Full system access, team/agent management
2. **Agent**: Support dashboard, conversation handling
3. **End User**: Talk with Agents Using Chat Widget

### Auth Flow
```
Login → JWT Access Token (7d) + Refresh Token (30d)
       → Store in API response
       → Include in Authorization header
```

### Protected Routes
- **Backend**: `auth` middleware validates JWT
- **Frontend**: Check auth status before rendering protected pages

## Database Models

### User
- **Fields**: email, password (bcrypt), name, role, status, teams[], createdAt
- **Indexes**: email (unique), role
- **Relations**: Referenced in Team.members[]

### Team
- **Fields**: name, description, color, members[], createdAt
- **Virtual**: agentCount, onlineAgents
- **Relations**: Users (agents)

### Conversation
- **Fields**: visitor, agent, team, status, messages[], createdAt
- **Status**: open, active, closed
- **Relations**: User (agent), Team, Message[]

### Message
- **Fields**: conversation, sender, senderType, content, attachments[], createdAt
- **SenderType**: visitor, agent, system

### Widget
- **Fields**: displayName, backgroundColor, logoUrl, publicKey, createdAt
- **Usage**: Embedded chat widget configuration

## API Conventions

### Response Format
```typescript
{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
```

### Error Handling
- Use try-catch in controllers
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Log errors with Winston logger

### Validation
- Use middleware for request validation
- Validate email format, password strength, required fields

## Development Practices

### Code Style
- **TypeScript**: Strict mode enabled
- **Formatting**: Consistent indentation (2 spaces)
- **Naming**: 
  - PascalCase for components/classes
  - camelCase for variables/functions
  - SCREAMING_SNAKE_CASE for constants
- **Imports**: Group by external → internal → relative

### State Management
- **Frontend**: React useState/useEffect hooks
- **Loading states**: Always show `<Loader>` during async operations
- **Error states**: Display user-friendly error messages

### File Organization
- Group related files in folders (controllers, services, components)
- Keep components small and focused (single responsibility)
- Extract reusable logic into utility functions

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://admin:dev123@localhost:27017/voxora-chat-dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
EMAIL_HOST=localhost (mailhog) 
EMAIL_PORT=1025 (mailhog) 
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
```

## Real-time Features (Socket.IO)

### Events
- **Connection**: Authenticate with JWT token
- **Rooms**: Join team/conversation rooms
- **Message**: Send/receive messages
- **Status**: Agent online/offline/busy
- **Typing**: Typing indicators

### Best Practices
- Validate all socket events
- Use rooms for targeted messaging
- Handle disconnections gracefully
- Emit acknowledgments for critical events

## Email System

### Templates
All emails use HTML templates with inline styles:
- **Invite Email**: New agent invitation with accept link
- **Password Reset**: Reset password link (1 hour expiry)
- **Welcome Email**: Account creation confirmation

### Configuration
- **Development**: Use MailHog (localhost:1025) - view at localhost:8025
- **Production**: Use Zoho SMTP (smtp.zoho.in:465) with credentials

### Email Service Methods
```typescript
sendInviteEmail(to, inviterName, role, token, teamNames)
sendPasswordResetEmail(to, name, token)
sendWelcomeEmail(to, name, role)
```

## Docker Setup

### Development Services (docker-compose.dev.yml)
- **MongoDB**: Port 27017, admin/dev123
- **Redis**: Port 6379, password dev123
- **Mongo Express**: Port 8081 (DB UI)
- **MailHog**: Port 1025 (SMTP), 8025 (Web UI)

### Commands
```bash
# Start all services
docker-compose -f docker/docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker/docker-compose.dev.yml down

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f
```

## Common Issues & Solutions

### Email not sending
1. Check EMAIL_HOST matches environment (localhost for mailhog, smtp.zoho.in for production)
2. Verify .env has correct credentials
3. Ensure config/index.ts sets `secure: true` for port 465
4. Check transporter is typed with `as any` to avoid TypeScript errors

### CORS errors
- Add frontend URL to ALLOWED_ORIGINS in .env
- Verify API_URL in frontend matches backend port

### Database connection issues
- Ensure MongoDB is running (docker-compose up)
- Check MONGODB_URI has correct credentials
- Verify authSource=admin in connection string

### TypeScript errors
- Run `npm run check-types` to validate
- Check imports are correct (no missing dependencies)
- Ensure interfaces match API responses

## Testing Endpoints

### Authentication
```bash
# Admin signup
POST /api/v1/auth/admin/signup
Body: { email, password, name }

# Login
POST /api/v1/auth/login
Body: { email, password, role }
```

### Admin Operations
```bash
# Get teams (requires auth)
GET /api/v1/admin/teams
Headers: { Authorization: Bearer <token> }

# Invite agent
POST /api/v1/admin/invite-agent
Body: { email, name, teamIds, password }
```

## Project Commands

```bash
# Install dependencies
npm install

# Run backend
cd apps/api && npm run dev

# Run frontend
cd apps/web && npm run dev

# Run both (from root)
npm run dev

# Type checking
npm run check-types

# Linting
npm run lint
```

## Key Conventions to Follow

1. **Always use TypeScript** - No `any` types unless necessary (transporter config)
2. **Handle errors gracefully** - Try-catch in all async operations
3. **Log important events** - Use Winston logger for debugging
4. **Validate user input** - Never trust client data
5. **Use CSS variables** - Reference theme colors, not hardcoded values
6. **Show loading states** - Use `<Loader>` during async operations
7. **Use Next.js Link** - Never use `<a>` tags for internal navigation
8. **Add cursor styles** - `cursor-pointer` on buttons, `cursor-text` on inputs
9. **Keep components small** - Single responsibility principle
10. **Comment complex logic** - Explain "why", not "what"

## Important Notes

- **Monorepo**: This is a Turborepo project with shared packages
- **Port Numbers**: API (3002), Web (3000), MongoDB (27017), Redis (6379)
- **Theme**: Dark mode with emerald green (#10b981) as primary color
- **File Changes**: Some files may be auto-formatted - always check current content before editing
- **Email Testing**: Use MailHog UI at http://localhost:8025 to view sent emails in development

## Future Considerations

- Add comprehensive test coverage (Jest, React Testing Library)
- Implement rate limiting on auth endpoints
- Add file upload for message attachments
- Create comprehensive API documentation (Swagger/OpenAPI)
- Add analytics/monitoring (Sentry, Google Analytics)
- Implement conversation assignment algorithms
- Add chat transcript export functionality
- Create mobile-responsive widget embed code
- Add internationalization (i18n) support

---

**Last Updated**: February 2026
**Maintainers**: Vibe Coders Team
**AI Assistant**: Claude (Anthropic)
