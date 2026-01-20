# OpenStock Local Development Setup Guide

This guide will help you get OpenStock running on your local machine for development.

## Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)
- A code editor (VS Code, WebStorm, etc.)

## Step-by-Step Setup

### 1. Install Dependencies

First, install all the required npm packages:

```bash
npm install
```

This will install all the dependencies listed in `package.json`, including:
- Nuxt 4
- Drizzle ORM
- NuxtHub
- TailwindCSS
- And other required packages

### 2. Initialize the Database

OpenStock uses a local SQLite database for development. You need to create the database and all the required tables:

```bash
npm run db:setup
```

This script will:
- Create the `.data/hub/cache` directory if it doesn't exist
- Create a SQLite database file at `.data/hub/cache/db.sqlite`
- Create all necessary tables (users, products, categories, suppliers, etc.)
- Insert default settings

You should see output like:
```
✓ Created database directory
✓ Created users
✓ Created taxes
✓ Created suppliers
✓ Created categories
✓ Created products
...
✅ Database setup completed successfully!
```

### 3. Start the Development Server

Now you can start the Nuxt development server:

```bash
npm run dev
```

The server will start on http://localhost:3000

You should see output like:
```
Nuxt 4.2.1 (with Nitro 2.12.9, Vite 7.2.6 and Vue 3.5.25)

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose
```

### 4. Create Your First Admin User

1. Open your browser and navigate to http://localhost:3000
2. You'll be automatically redirected to `/auth/setup`
3. Fill in the setup form:
   - **Name**: Your full name
   - **Email**: Your email address
   - **Password**: Choose a secure password (minimum 8 characters)
4. Click "Create Admin Account"
5. You'll be logged in and redirected to the dashboard

### 5. Start Using OpenStock

You now have a fully functional local instance of OpenStock! You can:

- Add products
- Create categories
- Manage suppliers
- Track stock movements
- View analytics on the dashboard

## Common Issues and Solutions

### Issue: "no such table: products"

**Solution**: This means the database wasn't initialized. Run:
```bash
npm run db:setup
```

### Issue: Port 3000 is already in use

**Solution**: Either:
1. Stop the process using port 3000
2. Or run on a different port:
   ```bash
   PORT=3001 npm run dev
   ```

### Issue: Database is locked

**Solution**: Make sure you don't have multiple instances of the dev server running. Close all instances and restart.

## Database Location

Your local development database is stored at:
```
.data/hub/cache/db.sqlite
```

This file persists between restarts, so your data won't be lost when you stop the dev server.

## Resetting the Database

If you want to start fresh:

1. Stop the dev server (Ctrl+C)
2. Delete the database:
   ```bash
   rm -rf .data
   ```
3. Re-initialize:
   ```bash
   npm run db:setup
   npm run dev
   ```

## Next Steps

- Read the [README.md](README.md) for more information about features
- Check the [API documentation](README.md#-api-endpoints) for available endpoints
- Explore the code structure in `/app` and `/server`

## Getting Help

If you encounter any issues:

1. Check this guide again
2. Look at existing GitHub issues
3. Create a new issue with:
   - Your Node.js version (`node --version`)
   - Your operating system
   - The exact error message
   - Steps to reproduce

Happy coding! 🚀
