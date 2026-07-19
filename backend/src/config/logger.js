const winston = require('winston');
const env = require('./env');

// Structured JSON logs in production so they can be ingested by
// CloudWatch / any log aggregator without custom parsing. Human-readable
// colorized logs in development for fast local debugging.
const isProd = env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) =>
            `${timestamp} ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`
        )
      ),
  transports: [new winston.transports.Console()],
  // Never let a logging failure crash the process.
  exitOnError: false,
});

module.exports = logger;
