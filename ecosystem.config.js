module.exports = {
    apps: [{
        name: "uwb-device-360",
        script: "./node_modules/.bin/next",
        args: "start -p 8080",
        instances: "max", // Use all available cores
        exec_mode: "cluster", // Enable cluster mode
        watch: false,
        max_memory_restart: "800M", // Restart if memory exceeds 800MB (safe limit for 1GB instance)
        env: {
            NODE_ENV: "production",
        }
    }]
};
