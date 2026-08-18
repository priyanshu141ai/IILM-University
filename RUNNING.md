# Running the College MOU Portal

## Requirements

- Node.js 14 or newer
- MongoDB 4.4 or newer, running locally, or a MongoDB Atlas connection string

## First-time setup

From the project directory, install the dependencies:

```powershell
npm install
```

The project uses `.env` for configuration. The local development file contains:

```text
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/college-mou-portal
JWT_SECRET=...
```

For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string. Keep `.env` private and use a strong `JWT_SECRET` outside local development.

## Start the application

Make sure MongoDB is running, then start the server:

```powershell
npm start
```

Open [http://localhost:5000](http://localhost:5000) in a browser. The health endpoint is available at [http://localhost:5000/api/health](http://localhost:5000/api/health).

For automatic restart during development:

```powershell
npm run dev
```

## Optional seed data

To insert the sample data defined by the project:

```powershell
npm run seed
```

## Troubleshooting

- `MongoDB Connection Error`: start MongoDB or verify `MONGODB_URI`.
- `EADDRINUSE`: another process is using port 5000; change `PORT` in `.env`.
- `npm is not recognized`: install Node.js and restart the terminal so PATH is refreshed.
