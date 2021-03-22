import winston from "winston";

var customFormat = winston.format.printf(
  (info) => `${info.timestamp} ${info.level}: ${info.message}`
);

var customLevels = {
  levels: {
    error: 7,
    warning: 8,
    custom: 9,
    info: 10,
    debug: 11,
  },
  colors: {
    error: "red",
    warning: "yellow",
    custom: "magenta",
    info: "white",
    debug: "blue",
  },
};

export const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: [
    new winston.transports.Console({
      level: "none",
      handleExceptions: true,
      json: false,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.splat(),
        customFormat
      ),
    }),
  ],
  exitOnError: false,
});
