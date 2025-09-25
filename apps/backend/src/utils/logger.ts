/**
 * EchoTrail Logger Utility
 * Structured logging with Winston
 */

import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, stack, ...meta } = info;
      
      // Include stack trace for errors
      if (stack) {
        return `${timestamp} [${level}]: ${message}\n${stack}${
          Object.keys(meta).length > 0 ? '\n' + JSON.stringify(meta, null, 2) : ''
        }`;
      }
      
      // Include metadata if present
      const metaString = Object.keys(meta).length > 0 
        ? ' ' + JSON.stringify(meta, null, 2)
        : '';
      
      return `${timestamp} [${level}]: ${message}${metaString}`;
    }
  )
);

// Define which transports the logger must have
const transports = [
  // Console transport for development
  new winston.transports.Console(),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

// If we're not in production then **ALSO** log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Logger wrapper with additional methods
 */
class Logger {
  private context: string;
  
  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return `[${this.context}] ${message}`;
  }

  debug(message: string, meta?: any): void {
    logger.debug(this.formatMessage(message), meta);
  }

  info(message: string, meta?: any): void {
    logger.info(this.formatMessage(message), meta);
  }

  warn(message: string, meta?: any): void {
    logger.warn(this.formatMessage(message), meta);
  }

  error(message: string, meta?: any, error?: Error): void {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      })
    };
    
    logger.error(this.formatMessage(message), errorMeta);
  }

  http(message: string, meta?: any): void {
    logger.http(this.formatMessage(message), meta);
  }

  /**
   * Log API request/response
   */
  apiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: any
  ): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    const message = `${method} ${url} ${statusCode} - ${duration.toFixed(2)}ms`;
    
    logger.log(level, this.formatMessage(message), {
      method,
      url,
      statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ...meta,
    });
  }

  /**
   * Log authentication events
   */
  auth(event: string, userId?: string, meta?: any): void {
    this.info(`Auth: ${event}`, {
      userId,
      ...meta,
    });
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, duration?: number, meta?: any): void {
    const message = `DB: ${operation} on ${table}${
      duration ? ` (${duration.toFixed(2)}ms)` : ''
    }`;
    
    this.debug(message, {
      operation,
      table,
      ...(duration && { duration: `${duration.toFixed(2)}ms` }),
      ...meta,
    });
  }

  /**
   * Log external API calls
   */
  externalApi(
    service: string,
    operation: string,
    statusCode?: number,
    duration?: number,
    meta?: any
  ): void {
    const level = statusCode && statusCode >= 400 ? 'error' : 'info';
    const message = `External API: ${service} ${operation}${
      statusCode ? ` (${statusCode})` : ''
    }${duration ? ` - ${duration.toFixed(2)}ms` : ''}`;
    
    logger.log(level, this.formatMessage(message), {
      service,
      operation,
      ...(statusCode && { statusCode }),
      ...(duration && { duration: `${duration.toFixed(2)}ms` }),
      ...meta,
    });
  }

  /**
   * Log validation errors
   */
  validation(field: string, error: string, value?: any): void {
    this.warn(`Validation error: ${field} - ${error}`, {
      field,
      error,
      ...(value !== undefined && { value }),
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: any): void {
    const level = duration > 1000 ? 'warn' : duration > 500 ? 'info' : 'debug';
    const message = `Performance: ${operation} took ${duration.toFixed(2)}ms`;
    
    logger.log(level, this.formatMessage(message), {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      ...meta,
    });
  }
}

// Export both the raw winston logger and the wrapper
export { Logger };
export default logger;