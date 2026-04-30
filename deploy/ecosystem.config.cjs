module.exports = {
  apps: [
    {
      name: 'buyertrendlens-api',
      cwd: '/var/www/babar-1/server',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
