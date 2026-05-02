require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDatabase = require('./config/db');
const { initSocketServer } = require('./services/socketService');

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();
  const server = http.createServer(app);
  initSocketServer(server);
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
