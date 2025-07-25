// MongoDB initialization script
db = db.getSiblingDB('voxora-chat');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('conversations');
db.createCollection('messages');

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, status: 1 });

// Create indexes for conversations collection
db.conversations.createIndex({ participants: 1 });
db.conversations.createIndex({ status: 1, priority: 1 });
db.conversations.createIndex({ assignedTo: 1, status: 1 });
db.conversations.createIndex({ createdBy: 1 });
db.conversations.createIndex({ lastMessageAt: -1 });

// Create indexes for messages collection
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ 'metadata.readBy.userId': 1 });

print('Database initialized successfully!');
