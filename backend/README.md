# Chitty Backend

A real-time chat application with unique room codes.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory with:
   ```
   PGUSER=your_postgres_username
   PGHOST=localhost
   PGDATABASE=chitty
   PGPASSWORD=your_postgres_password
   PGPORT=5432
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3001
   ```

3. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb chitty
   
   # Run schema
   psql -d chitty -f schema.sql
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /signup` - User registration
- `POST /login` - User authentication
- `POST /rooms` - Create new room
- `POST /rooms/join` - Join existing room
- `GET /me/rooms` - List user's rooms
- `GET /rooms/:room/messages` - Get chat history

## WebSocket Events

- `join` - Join a room by code
- `chat` - Send chat message

## Database Schema

The application uses these main tables:
- `users` - User accounts
- `rooms` - Chat rooms with unique codes
- `memberships` - User-room relationships
- `messages` - Chat messages
