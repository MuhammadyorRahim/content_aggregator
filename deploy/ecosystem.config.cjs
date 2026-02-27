module.exports = {
  apps: [
    {
      name: "web",
      script: "npm",
      args: "start",
      cwd: "/app",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "worker",
      script: "npm",
      args: "run worker",
      cwd: "/app",
      env: {
        NODE_ENV: "production",
        RUN_BACKGROUND_WORKER: "true",
      },
    },
  ],
};
