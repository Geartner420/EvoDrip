// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'evo-server',
    script: './server.mjs',
    watch: ['.env'],
      ignore_watch: [
        'node_modules',
        'sensor_data',
        'public',
        'views',
        'logs',
        'history_entrys.json',
        '*.log',
        '*.json',
        '*.ejs'
      ],
    env: {
      NODE_ENV: 'production'
    }
  }]
};
