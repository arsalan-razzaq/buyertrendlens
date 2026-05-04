require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDatabase = require('./config/db');
const { initSocketServer } = require('./services/socketService');
const { warmRemoteFilterOptionCaches } = require('./services/remoteDatasetService');

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();
  const server = http.createServer(app);
  initSocketServer(server);
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    setTimeout(() => {
      warmRemoteFilterOptionCaches().catch((error) => {
        console.error('Remote filter cache warm-up failed:', error.message);
      });
    }, 1000);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
