module.exports = {
    apps: [{
        name: "uwb-device-360",
        script: "./node_modules/.bin/next",
        args: "start -p 8080",
        instances: "max",
        exec_mode: "cluster",
        watch: false,
        max_memory_restart: "800M",
        env: {
            NODE_ENV: "production",
        }
    },
    {
        name: "firehose-worker",
        script: "./scripts/firehose-worker.js",
        instances: 1,
        exec_mode: "fork",
        log_date_format: "YYYY-MM-DD HH:mm:ss",
        error_file: "./logs/worker-error.log",
        out_file: "./logs/worker-out.log",
        env: {
            NODE_ENV: "production",
        },
    }]
};
