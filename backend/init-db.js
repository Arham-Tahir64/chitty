#!/usr/bin/env node

/**
 * Database Initialization Script for Chitty Chat
 * 
 * This script creates all necessary database tables and indexes.
 * Run this after setting up your PostgreSQL database on Render.
 * 
 * Usage:
 * 1. Set your database environment variables
 * 2. Run: node init-db.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQL schema to create tables and indexes
const schemaSQL = `
-- Users table - stores user authentication information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table - stores chat rooms
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Room',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table - many-to-many relationship between users and rooms
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, room_id)
);

-- Messages table - stores chat messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(10) NOT NULL,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_room_id ON memberships(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_user_room ON memberships(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room, created_at DESC);

-- Add constraints for data integrity (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_length') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_length CHECK (LENGTH(username) >= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_code_length') THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_code_length CHECK (LENGTH(code) = 6);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_name_length') THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_name_length CHECK (LENGTH(name) >= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length') THEN
        ALTER TABLE messages ADD CONSTRAINT messages_content_length CHECK (LENGTH(content) >= 1);
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rooms_updated_at') THEN
        CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function initializeDatabase() {
  console.log('🚀 Initializing Chitty Chat Database...\n');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!\n');
    
    // Execute schema creation
    console.log('🔨 Creating database schema...');
    await client.query(schemaSQL);
    console.log('✅ Database schema created successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY indexname
    `);
    
    console.log('📊 Created indexes:');
    indexesResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    client.release();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('✨ Your Chitty Chat application is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure your database is running and accessible.');
      console.error('   Check your environment variables:');
      console.error(`   - PGHOST: ${process.env.PGHOST || 'NOT SET'}`);
      console.error(`   - PGDATABASE: ${process.env.PGDATABASE || 'NOT SET'}`);
      console.error(`   - PGUSER: ${process.env.PGUSER || 'NOT SET'}`);
      console.error(`   - PGPORT: ${process.env.PGPORT || 'NOT SET'}`);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if required environment variables are set
function checkEnvironment() {
  const required = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please set these variables in your .env file or environment.');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  checkEnvironment();
  initializeDatabase();
}

module.exports = { initializeDatabase };

