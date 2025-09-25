/**
 * Request Logger Middleware
 * Structured HTTP request/response logging
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('RequestLogger');

/**
 * Generate unique request ID if not present
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request Logger Middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  req.headers['x-request-id'] = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Get client info
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
    userAgent: req.get('User-Agent') || 'unknown',
    origin: req.get('Origin') || req.get('Referer') || 'unknown',
    appVersion: req.get('X-App-Version'),
    platform: req.get('X-Platform'),
  };
  
  // Log request start
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    requestId,
    ...clientInfo,
  };
  
  // Don't log sensitive data
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const safeHeaders: Record<string, string> = {};
  Object.entries(req.headers).forEach(([key, value]) => {
    if (!sensitiveHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
      safeHeaders[key] = value;
    }
  });
  
  logger.http(`${req.method} ${req.originalUrl} - Started`, {
    ...requestInfo,
    headers: safeHeaders,
  });
  
  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine log level based on status code
    const level = statusCode >= 500 ? 'error' : 
                  statusCode >= 400 ? 'warn' : 
                  statusCode >= 300 ? 'info' : 'info';
    
    // Prepare response log
    const responseInfo = {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      requestId,
      contentLength: res.get('Content-Length'),
      ...clientInfo,
    };
    
    // Log response
    const message = `${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`;
    
    if (level === 'error') {
      logger.error(message, responseInfo);
    } else if (level === 'warn') {
      logger.warn(message, responseInfo);
    } else {
      logger.info(message, responseInfo);
    }
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl}`, {
        ...responseInfo,
        slowRequest: true,
        threshold: '1000ms',
      });
    }
    
    // Add response headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    return originalJson.call(this, body);
  };
  
  // Override res.send to capture non-JSON responses
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Only log if json wasn't called (to avoid double logging)
    if (!res.headersSent || !res.getHeader('X-Response-Time')) {
      const level = statusCode >= 500 ? 'error' : 
                    statusCode >= 400 ? 'warn' : 
                    statusCode >= 300 ? 'info' : 'info';
      
      const responseInfo = {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        duration: `${duration}ms`,
        requestId,
        contentType: res.get('Content-Type'),
        contentLength: res.get('Content-Length'),
        ...clientInfo,
      };
      
      const message = `${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`;
      
      if (level === 'error') {
        logger.error(message, responseInfo);
      } else if (level === 'warn') {
        logger.warn(message, responseInfo);
      } else {
        logger.info(message, responseInfo);
      }
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn(`Slow request detected: ${req.method} ${req.originalUrl}`, {
          ...responseInfo,
          slowRequest: true,
          threshold: '1000ms',
        });
      }
      
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    
    return originalSend.call(this, body);
  };
  
  // Handle request errors
  req.on('error', (error) => {
    logger.error(`Request error: ${req.method} ${req.originalUrl}`, {
      requestId,
      error: error.message,
      ...clientInfo,
    });
  });
  
  // Handle response errors
  res.on('error', (error) => {
    logger.error(`Response error: ${req.method} ${req.originalUrl}`, {
      requestId,
      error: error.message,
      ...clientInfo,
    });
  });
  
  next();
};