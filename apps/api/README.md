# Voxora Chat Support API

A real-time chat support application backend built with Node.js, Express, Socket.IO, Redis, and MongoDB. Similar to Crisp, this application provides a robust foundation for customer support chat systems.

## Features

### Core Features

- ✅ Real-time messaging with Socket.IO
- ✅ Redis adapter for horizontal scaling
- ✅ MongoDB for data persistence
- ✅ JWT authentication with refresh tokens
- ✅ User roles (user, agent, admin)
- ✅ Conversation management
- ✅ Message management (send, edit, delete)
- ✅ Typing indicators
- ✅ Read receipts
- ✅ User presence status
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Logging with Winston

### API Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile

#### Conversations

- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations` - Get user conversations
- `GET /api/v1/conversations/:id` - Get conversation by ID
- `PUT /api/v1/conversations/:id` - Update conversation
- `POST /api/v1/conversations/:id/assign` - Assign to agent
- `POST /api/v1/conversations/:id/close` - Close conversation

#### Messages

- `POST /api/v1/messages` - Send message
- `GET /api/v1/messages/conversation/:id` - Get conversation messages
- `PUT /api/v1/messages/:id` - Edit message
- `DELETE /api/v1/messages/:id` - Delete message
- `POST /api/v1/messages/:id/read` - Mark message as read
- `GET /api/v1/messages/conversation/:id/unread-count` - Get unread count

### Socket.IO Events

#### Connection Events

- `connect` - User connected
- `disconnect` - User disconnected
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `update_status` - Update user status

#### Message Events

- `send_message` - Send new message
- `new_message` - Receive new message
- `edit_message` - Edit existing message
- `message_edited` - Message was edited
- `delete_message` - Delete message
- `message_deleted` - Message was deleted
- `mark_as_read` - Mark message as read
- `message_read` - Message read receipt

#### Conversation Events

- `create_conversation` - Create new conversation
- `conversation_created` - Conversation was created
- `update_conversation` - Update conversation
- `conversation_updated` - Conversation was updated
- `assign_conversation` - Assign conversation to agent
- `conversation_assigned` - Conversation was assigned
- `close_conversation` - Close conversation
- `conversation_closed` - Conversation was closed

#### Typing Events

- `typing_start` - User started typing
- `user_typing_start` - Someone started typing
- `typing_stop` - User stopped typing
- `user_typing_stop` - Someone stopped typing
- `get_typing_users` - Get current typing users
- `typing_users_list` - List of typing users

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (v6 or higher)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment setup:**
   Copy `.env.example` to `.env` and configure:

   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/voxora-chat
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your-super-secret-jwt-key
   ```

3. **Start services:**

   ```bash
   # Start MongoDB (if not running as service)
   mongod

   # Start Redis (if not running as service)
   redis-server

   # Start the application
   npm run dev
   ```

### Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.ts   # MongoDB connection
│   ├── redis.ts      # Redis connection
│   └── index.ts      # App configuration
├── controllers/      # Route controllers
│   ├── authController.ts
│   ├── conversationController.ts
│   └── messageController.ts
├── middleware/       # Express middleware
│   ├── auth.ts       # Authentication middleware
│   ├── validation.ts # Request validation
│   └── errorHandler.ts
├── models/          # MongoDB schemas
│   ├── User.ts
│   ├── Conversation.ts
│   └── Message.ts
├── routes/          # API routes
│   ├── auth.ts
│   ├── conversations.ts
│   └── messages.ts
├── services/        # Business logic
│   ├── AuthService.ts
│   ├── ConversationService.ts
│   └── MessageService.ts
├── sockets/         # Socket.IO implementation
│   ├── index.ts     # Socket manager
│   └── handlers/    # Event handlers
│       ├── connectionHandler.ts
│       ├── messageHandler.ts
│       ├── conversationHandler.ts
│       └── typingHandler.ts
├── utils/           # Utility functions
│   ├── auth.ts      # JWT utilities
│   ├── logger.ts    # Winston logger
│   ├── response.ts  # API response helpers
│   └── validation.ts # Joi schemas
└── index.ts         # Application entry point
```

## Architecture

### Database Design

#### Users Collection

- User authentication and profile information
- Roles: user, agent, admin
- Status tracking (online, away, busy, offline)

#### Conversations Collection

- Chat conversations between users and agents
- Status tracking (open, pending, resolved, closed)
- Assignment to agents
- Priority levels and tags

#### Messages Collection

- Individual messages within conversations
- Support for text, files, images, and system messages
- Read receipts and edit history
- Soft delete functionality

### Redis Usage

- Socket.IO adapter for horizontal scaling
- Session storage for refresh tokens
- Caching for frequently accessed data
- Pub/sub for real-time notifications

### Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet for security headers

## Scalability Considerations

- **Horizontal Scaling**: Redis adapter allows multiple server instances
- **Database Indexing**: Optimized MongoDB indexes for performance
- **Connection Pooling**: MongoDB connection pooling for efficiency
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Logging**: Comprehensive logging for monitoring and debugging

## Production Deployment

1. **Environment Variables**: Set production environment variables
2. **Database**: Use MongoDB Atlas or similar managed service
3. **Redis**: Use Redis Cloud or similar managed service
4. **Process Management**: Use PM2 or similar for process management
5. **Reverse Proxy**: Use Nginx for load balancing and SSL termination
6. **Monitoring**: Implement health checks and monitoring

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
