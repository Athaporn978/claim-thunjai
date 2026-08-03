module.exports = {
  apps: [
    {
      name: 'claim-thunjai',
      script: 'npm',
      args: 'run start -- --hostname 0.0.0.0 --port 3000',
      cwd: '/var/www/claim-thunjai',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
    },
  ],
};
