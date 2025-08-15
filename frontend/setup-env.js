#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  process.exit(0);
}

// Create .env file with default development values
const envContent = `# API Configuration
# Set this to your backend API URL
# For local development, typically http://localhost:3001
# For production, set to your deployed backend URL
VITE_API_URL=http://localhost:3001
`;

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with default development configuration');
  console.log('📝 Edit .env file to customize your API URL');
  console.log('🔧 Current setting: VITE_API_URL=http://localhost:3001');
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}
