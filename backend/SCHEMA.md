# Database Schema Reference

This document provides a quick reference for the Chitty Chat database schema.

## Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User authentication and profiles | `id`, `username`, `password_hash` |
| `rooms` | Chat rooms | `id`, `code`, `name`, `created_by` |
| `memberships` | User-room relationships | `user_id`, `room_id` |
| `messages` | Chat messages | `id`, `room`, `sender_id`, `content` |

## Detailed Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Stores user account information and authentication data.

**Key Features**:
- Unique usernames
- Bcrypt-hashed passwords
- Automatic timestamp management

### Rooms Table
```sql
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Room',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Stores chat room information.

**Key Features**:
- 6-character unique room codes (generated with nanoid)
- Room names with defaults
- Creator tracking
- Automatic timestamp management

### Memberships Table
```sql
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, room_id)
);
```

**Purpose**: Manages many-to-many relationships between users and rooms.

**Key Features**:
- Prevents duplicate memberships
- Tracks when users joined rooms
- Cascading deletes when users or rooms are removed

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(10) NOT NULL,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Stores all chat messages.

**Key Features**:
- References room by code (not ID) for flexibility
- Links to sender via user ID
- Automatic timestamp management
- Content stored as TEXT for long messages

## Indexes

### Performance Indexes
- `idx_users_username`: Fast username lookups
- `idx_rooms_code`: Fast room code lookups
- `idx_messages_room_created_at`: Fast message retrieval by room and time
- `idx_memberships_user_room`: Fast membership checks

### Composite Indexes
- `idx_messages_room_created_at`: Optimizes room message queries with time ordering
- `idx_memberships_user_room`: Optimizes user-room relationship queries

## Constraints

### Data Validation
- Username length: minimum 1 character
- Room code length: exactly 6 characters
- Room name length: minimum 1 character
- Message content length: minimum 1 character

### Referential Integrity
- All foreign keys have CASCADE DELETE
- Unique constraints prevent duplicates
- NOT NULL constraints ensure data completeness

## Triggers

### Automatic Timestamps
- `update_users_updated_at`: Updates `updated_at` when user records change
- `update_rooms_updated_at`: Updates `updated_at` when room records change

## Views (Optional)

### Room Information
```sql
CREATE VIEW room_info AS
SELECT 
    r.id, r.code, r.name, r.created_by,
    u.username as creator_name, r.created_at,
    COUNT(m.user_id) as member_count
FROM rooms r
LEFT JOIN users u ON r.created_by = u.id
LEFT JOIN memberships m ON r.id = m.room_id
GROUP BY r.id, r.code, r.name, r.created_by, u.username, r.created_at;
```

### User Rooms with Activity
```sql
CREATE VIEW user_rooms AS
SELECT 
    r.id, r.code, r.name, r.created_at, m.joined_at,
    COALESCE(last_msg.created_at, r.created_at) as last_activity
FROM rooms r
JOIN memberships m ON r.id = m.room_id
LEFT JOIN (
    SELECT room, MAX(created_at) as created_at
    FROM messages GROUP BY room
) last_msg ON r.code = last_msg.room
ORDER BY last_activity DESC;
```

## Database Relationships

```
users (1) ←→ (many) memberships (many) ←→ (1) rooms
users (1) ←→ (many) messages
rooms (1) ←→ (many) messages
```

## Usage Examples

### Create a new user
```sql
INSERT INTO users (username, password_hash) 
VALUES ('john_doe', '$2b$10$...');
```

### Create a new room
```sql
INSERT INTO rooms (code, name, created_by) 
VALUES ('ABC123', 'General Chat', 1);
```

### Add user to room
```sql
INSERT INTO memberships (user_id, room_id) 
VALUES (1, 1);
```

### Get user's rooms
```sql
SELECT r.* FROM rooms r
JOIN memberships m ON r.id = m.room_id
WHERE m.user_id = 1;
```

### Get room messages
```sql
SELECT m.*, u.username as sender_name
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.room = 'ABC123'
ORDER BY m.created_at DESC
LIMIT 50;
```

## Maintenance

### Regular Tasks
- Monitor table sizes and growth
- Check index usage statistics
- Review and optimize slow queries
- Backup data regularly

### Performance Tips
- The schema is optimized for read-heavy chat applications
- Indexes support common query patterns
- Consider partitioning messages table for very high volume
- Monitor connection pool usage

## Migration Notes

When deploying to production:
1. Run the schema creation script
2. Verify all tables and indexes are created
3. Test with sample data
4. Monitor performance metrics
5. Adjust indexes based on actual query patterns

