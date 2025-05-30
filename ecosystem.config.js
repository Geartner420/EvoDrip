module.exports = {
  apps: [{
    name: "evo-server",
    script: "./server.mjs",
    interpreter: "node",
    watch: [
      "./.env"
    ],
    env: {
      NODE_ENV: "production"
    }
  }]
};
