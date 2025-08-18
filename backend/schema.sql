-- Chitty Chat Application Database Schema
-- This file creates all necessary tables and indexes for the application
-- Run this when setting up your database on Render or any PostgreSQL instance

-- Enable UUID extension (optional, but useful for future enhancements)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user authentication information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table - stores chat rooms
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Room',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table - many-to-many relationship between users and rooms
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, room_id)
);

-- Messages table - stores chat messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(10) NOT NULL, -- room code (not room_id for flexibility)
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_room_id ON memberships(room_id);
CREATE INDEX idx_messages_room ON messages(room);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create a composite index for faster room membership lookups
CREATE INDEX idx_memberships_user_room ON memberships(user_id, room_id);

-- Create a composite index for faster message retrieval by room and time
CREATE INDEX idx_messages_room_created_at ON messages(room, created_at DESC);

-- Add some constraints for data integrity
ALTER TABLE users ADD CONSTRAINT users_username_length CHECK (LENGTH(username) >= 1);
ALTER TABLE rooms ADD CONSTRAINT rooms_code_length CHECK (LENGTH(code) = 6);
ALTER TABLE rooms ADD CONSTRAINT rooms_name_length CHECK (LENGTH(name) >= 1);
ALTER TABLE messages ADD CONSTRAINT messages_content_length CHECK (LENGTH(content) >= 1);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
