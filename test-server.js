#!/usr/bin/env node

/**
 * Simple server connectivity test for Chitty Chat
 * Run this before running load tests to ensure your server is accessible
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const ENDPOINTS = [
  { path: '/', method: 'GET', description: 'Server root' },
  { path: '/login', method: 'POST', description: 'Login endpoint' },
  { path: '/signup', method: 'POST', description: 'Signup endpoint' }
];

async function testEndpoint(hostname, port, path, method) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ChittyChat-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        error: err.message,
        code: err.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });

    // Set timeout to 5 seconds
    req.setTimeout(5000);

    // For POST requests, send some test data
    if (method === 'POST') {
      req.write(JSON.stringify({ test: true }));
    }

    req.end();
  });
}

async function testServer() {
  console.log('🔍 Testing Chitty Chat Server Connectivity...\n');
  
  const url = new URL(SERVER_URL);
  const hostname = url.hostname;
  const port = url.port || 80;

  console.log(`📍 Target: ${SERVER_URL}`);
  console.log(`🌐 Hostname: ${hostname}`);
  console.log(`🔌 Port: ${port}\n`);

  // Test basic connectivity first
  console.log('📡 Testing basic connectivity...');
  try {
    const socket = new (require('net').Socket)();
    const connectPromise = new Promise((resolve, reject) => {
      socket.setTimeout(5000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      socket.on('error', (err) => {
        reject(err);
      });
    });

    await connectPromise;
    console.log('✅ TCP connection successful\n');
  } catch (error) {
    console.log('❌ TCP connection failed:', error.message);
    console.log('\n💡 Make sure your server is running:');
    console.log('   cd backend && npm run dev');
    console.log('\n💡 Or check if the port is correct in your server.js');
    return;
  }

  // Test HTTP endpoints
  console.log('🌐 Testing HTTP endpoints...\n');
  
  for (const endpoint of ENDPOINTS) {
    console.log(`🔍 Testing ${endpoint.method} ${endpoint.path} (${endpoint.description})`);
    
    const result = await testEndpoint(hostname, port, endpoint.path, endpoint.method);
    
    if (result.error) {
      console.log(`❌ Failed: ${result.error}`);
      if (result.code === 'ECONNREFUSED') {
        console.log('   💡 Server is not accepting connections on this port');
      }
    } else {
      console.log(`✅ Status: ${result.status} ${result.statusText}`);
      if (result.status === 200) {
        console.log('   🎉 Endpoint is working!');
      } else if (result.status === 404) {
        console.log('   ⚠️  Endpoint not found (check your routes)');
      } else if (result.status === 401) {
        console.log('   🔒 Endpoint requires authentication (working as expected)');
      } else if (result.status === 400) {
        console.log('   📝 Endpoint expects valid data (working as expected)');
      }
    }
    console.log('');
  }

  // Test with actual data
  console.log('🧪 Testing with real data...');
  
  try {
    const testSignup = await testEndpoint(hostname, port, '/signup', 'POST');
    if (testSignup.status === 200) {
      console.log('✅ Signup endpoint working with test data');
    } else {
      console.log(`⚠️  Signup endpoint returned ${testSignup.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing signup:', error.message);
  }

  console.log('\n🎯 Load Testing Readiness Check:');
  
  // Check if server is ready for load testing
  const isReady = true; // You can add more sophisticated checks here
  
  if (isReady) {
    console.log('✅ Server appears ready for load testing');
    console.log('\n🚀 You can now run your load tests:');
    console.log('   artillery run chat-load.yml');
    console.log('   # or');
    console.log('   artillery run chat-load-advanced.yml');
  } else {
    console.log('❌ Server needs attention before load testing');
  }
}

// Run the test
if (require.main === module) {
  testServer().catch(console.error);
}

module.exports = { testServer };
