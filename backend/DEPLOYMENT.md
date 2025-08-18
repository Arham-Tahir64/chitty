# Deploying Chitty Chat to Render

This guide will help you deploy your Chitty Chat application to Render, including setting up the PostgreSQL database.

## Prerequisites

- A Render account
- Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Step 1: Create PostgreSQL Database on Render

1. **Log into Render Dashboard**
   - Go to [render.com](https://render.com) and sign in

2. **Create New PostgreSQL Service**
   - Click "New +" → "PostgreSQL"
   - Choose a name (e.g., "chitty-chat-db")
   - Select your preferred region
   - Choose a PostgreSQL version (14 or higher recommended)
   - Select your plan (Free tier works for development)

3. **Configure Database**
   - Set a strong password
   - Note down the connection details (you'll need these later)

4. **Wait for Creation**
   - Render will provision your database (takes a few minutes)

## Step 2: Set Up Database Schema

1. **Access Database**
   - In your PostgreSQL service dashboard, click "Connect"
   - Copy the "External Database URL"

2. **Run Schema Script**
   - Click on "Shell" in your PostgreSQL service
   - Or use the "SQL Editor" tab
   - Copy and paste the contents of `schema-render.sql`
   - Execute the script

**Alternative: Use psql from your local machine**
```bash
# Install psql if you haven't already
# On macOS: brew install postgresql
# On Ubuntu: sudo apt-get install postgresql-client

# Connect to your Render database
psql "postgres://username:password@host:port/database"

# Then run the schema file
\i schema-render.sql
```

## Step 3: Deploy Backend Service

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Select the repository with your Chitty Chat code

2. **Configure Service**
   - **Name**: `chitty-chat-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: `backend` (since your backend code is in the backend folder)

3. **Set Environment Variables**
   Add these environment variables in the Render dashboard:

   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # Database connection (from your PostgreSQL service)
   PGHOST=your-db-host.render.com
   PGDATABASE=your-database-name
   PGUSER=your-database-user
   PGPASSWORD=your-database-password
   PGPORT=5432
   
   # Redis (optional - you can use Render Redis or external service)
   REDIS_URL=your-redis-url
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your application

## Step 4: Deploy Frontend (Optional)

1. **Create Static Site**
   - Click "New +" → "Static Site"
   - Connect your Git repository
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

2. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend-service.onrender.com
   ```

## Step 5: Update Frontend Configuration

1. **Update API URL**
   - In your frontend code, ensure the API URL points to your deployed backend
   - Create a `.env` file in the frontend directory:
   ```bash
   VITE_API_URL=https://your-backend-service.onrender.com
   ```

2. **Rebuild and Deploy**
   - Push your changes to Git
   - Render will automatically redeploy

## Step 6: Test Your Deployment

1. **Test Backend**
   - Visit your backend URL: `https://your-service.onrender.com`
   - You should see your server running

2. **Test Frontend**
   - Visit your frontend URL
   - Try creating an account and joining a room

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your environment variables
   - Ensure your database is running
   - Verify firewall rules allow connections

2. **Build Failures**
   - Check the build logs in Render
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

3. **Environment Variables Not Working**
   - Double-check variable names
   - Ensure no extra spaces or quotes
   - Redeploy after changing variables

### Useful Commands

```bash
# Check your database connection
psql "postgres://username:password@host:port/database" -c "\dt"

# View your tables
psql "postgres://username:password@host:port/database" -c "\d users"

# Check logs in Render
# Go to your service dashboard → Logs tab
```

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Port for the server | Yes | `10000` |
| `JWT_SECRET` | Secret for JWT tokens | Yes | `your-secret-key` |
| `PGHOST` | PostgreSQL host | Yes | `db.onrender.com` |
| `PGDATABASE` | Database name | Yes | `chitty_chat` |
| `PGUSER` | Database username | Yes | `chitty_user` |
| `PGPASSWORD` | Database password | Yes | `your-password` |
| `PGPORT` | Database port | Yes | `5432` |
| `REDIS_URL` | Redis connection URL | No | `redis://localhost:6379` |

## Security Notes

1. **JWT Secret**: Use a strong, random string
2. **Database Password**: Use a strong password
3. **Environment Variables**: Never commit secrets to Git
4. **HTTPS**: Render provides HTTPS by default
5. **CORS**: Your backend already has CORS configured

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain (optional)
3. Set up CI/CD pipeline
4. Monitor performance and logs
5. Scale up as needed

## Support

- [Render Documentation](https://render.com/docs)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Node.js on Render](https://render.com/docs/deploy-node-express)

