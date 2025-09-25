#!/usr/bin/env node

/**
 * Metro Performance Dashboard Server
 * 
 * Provides a web interface and API for Metro build performance monitoring:
 * - Serves the dashboard HTML interface
 * - Collects and stores performance metrics
 * - Provides REST API for data access
 * - Supports real-time data updates via WebSocket
 * - Integrates with benchmark and analysis scripts
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

class MetroDashboardServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.config = {
      port: process.env.PORT || 3000,
      dataDir: path.join(__dirname, 'data'),
      benchmarkScript: path.join(__dirname, '../scripts/run-metro-benchmarks.js'),
      analyzeScript: path.join(__dirname, '../scripts/analyze-metro-bundle.js'),
      maxDataPoints: 10000, // Maximum stored data points
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    };
    
    this.performanceData = [];
    this.clients = new Set();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.loadStoredData();
    
    // Start cleanup interval
    setInterval(() => this.cleanupOldData(), this.config.cleanupInterval);
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.static(__dirname));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Serve dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Get performance data
    this.app.get('/api/performance', (req, res) => {
      try {
        const { 
          platform, 
          environment, 
          timeRange = '30d',
          limit = 1000,
          offset = 0
        } = req.query;
        
        let filtered = this.performanceData;
        
        // Apply filters
        if (platform && platform !== 'all') {
          filtered = filtered.filter(d => d.platform === platform);
        }
        
        if (environment && environment !== 'all') {
          filtered = filtered.filter(d => d.environment === environment);
        }
        
        // Apply time range filter
        const timeRangeMs = this.parseTimeRange(timeRange);
        if (timeRangeMs) {
          const cutoff = Date.now() - timeRangeMs;
          filtered = filtered.filter(d => new Date(d.timestamp).getTime() > cutoff);
        }
        
        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply pagination
        const paginated = filtered.slice(offset, offset + parseInt(limit));
        
        res.json({
          data: paginated,
          total: filtered.length,
          offset: parseInt(offset),
          limit: parseInt(limit)
        });
        
      } catch (error) {
        console.error('Error fetching performance data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Add new performance data
    this.app.post('/api/performance', async (req, res) => {
      try {
        const data = req.body;
        
        // Validate data structure
        if (!this.validatePerformanceData(data)) {
          return res.status(400).json({ error: 'Invalid data format' });
        }
        
        // Add timestamp if not provided
        if (!data.timestamp) {
          data.timestamp = new Date().toISOString();
        }
        
        // Add unique ID
        data.id = this.generateId();
        
        // Store data
        this.performanceData.unshift(data);
        
        // Limit stored data
        if (this.performanceData.length > this.config.maxDataPoints) {
          this.performanceData = this.performanceData.slice(0, this.config.maxDataPoints);
        }
        
        // Persist to disk
        await this.saveData();
        
        // Broadcast to WebSocket clients
        this.broadcast({ type: 'new-data', data });
        
        res.status(201).json({ success: true, id: data.id });
        
      } catch (error) {
        console.error('Error storing performance data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Run benchmark
    this.app.post('/api/benchmark', async (req, res) => {
      try {
        const { platform = 'android', environment = 'production', options = {} } = req.body;
        
        this.broadcast({ type: 'benchmark-started', platform, environment });
        
        const result = await this.runBenchmark(platform, environment, options);
        
        // Store benchmark result
        const data = {
          timestamp: new Date().toISOString(),
          platform,
          environment,
          buildTime: result.buildTime || 0,
          bundleSize: result.bundleSize || 0,
          memoryUsage: result.memoryUsage || 0,
          optimizationScore: result.optimizationScore || 0,
          status: result.status || 'success',
          id: this.generateId()
        };
        
        this.performanceData.unshift(data);
        await this.saveData();
        
        this.broadcast({ type: 'benchmark-completed', data });
        
        res.json({ success: true, result: data });
        
      } catch (error) {
        console.error('Error running benchmark:', error);
        
        this.broadcast({ 
          type: 'benchmark-failed', 
          error: error.message,
          platform: req.body.platform,
          environment: req.body.environment
        });
        
        res.status(500).json({ error: error.message });
      }
    });
    
    // Analyze bundle
    this.app.post('/api/analyze', async (req, res) => {
      try {
        const { bundlePath, options = {} } = req.body;
        
        if (!bundlePath) {
          return res.status(400).json({ error: 'Bundle path is required' });
        }
        
        this.broadcast({ type: 'analysis-started', bundlePath });
        
        const result = await this.runBundleAnalysis(bundlePath, options);
        
        this.broadcast({ type: 'analysis-completed', result });
        
        res.json({ success: true, result });
        
      } catch (error) {
        console.error('Error running bundle analysis:', error);
        
        this.broadcast({ 
          type: 'analysis-failed', 
          error: error.message,
          bundlePath: req.body.bundlePath
        });
        
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const { timeRange = '30d' } = req.query;
        
        let filtered = this.performanceData;
        
        // Apply time range filter
        const timeRangeMs = this.parseTimeRange(timeRange);
        if (timeRangeMs) {
          const cutoff = Date.now() - timeRangeMs;
          filtered = filtered.filter(d => new Date(d.timestamp).getTime() > cutoff);
        }
        
        if (filtered.length === 0) {
          return res.json({
            totalBuilds: 0,
            averages: {},
            trends: {},
            platforms: {},
            environments: {}
          });
        }
        
        // Calculate statistics
        const stats = this.calculateStatistics(filtered);
        
        res.json(stats);
        
      } catch (error) {
        console.error('Error calculating statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Clear all data
    this.app.delete('/api/performance', async (req, res) => {
      try {
        this.performanceData = [];
        await this.saveData();
        
        this.broadcast({ type: 'data-cleared' });
        
        res.json({ success: true, message: 'All data cleared' });
        
      } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
      
      this.clients.add(ws);
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'initial-data',
        data: this.performanceData.slice(0, 100)
      }));
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  async loadStoredData() {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      
      const dataPath = path.join(this.config.dataDir, 'performance-data.json');
      
      try {
        const data = await fs.readFile(dataPath, 'utf8');
        this.performanceData = JSON.parse(data);
        
        console.log(`Loaded ${this.performanceData.length} performance data points`);
        
      } catch (error) {
        // File doesn't exist or is invalid, start with empty data
        console.log('No existing data found, starting fresh');
        this.performanceData = [];
      }
      
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  async saveData() {
    try {
      const dataPath = path.join(this.config.dataDir, 'performance-data.json');
      await fs.writeFile(dataPath, JSON.stringify(this.performanceData, null, 2));
      
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  validatePerformanceData(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Required fields
    const required = ['platform', 'environment'];
    for (const field of required) {
      if (!data[field]) return false;
    }
    
    // Optional numeric fields
    const numeric = ['buildTime', 'bundleSize', 'memoryUsage', 'optimizationScore'];
    for (const field of numeric) {
      if (data[field] !== undefined && typeof data[field] !== 'number') return false;
    }
    
    return true;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  parseTimeRange(timeRange) {
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    
    return ranges[timeRange] || null;
  }

  async runBenchmark(platform, environment, options) {
    return new Promise((resolve, reject) => {
      const args = [
        this.config.benchmarkScript,
        '--platform', platform,
        '--environment', environment,
        '--format', 'json'
      ];
      
      if (options.deep) args.push('--deep');
      
      const process = spawn('node', args, {
        stdio: 'pipe',
        cwd: path.dirname(this.config.benchmarkScript)
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse JSON output from benchmark script
            const lines = stdout.split('\n');
            const jsonLine = lines.find(line => line.trim().startsWith('{'));
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine);
              resolve(result);
            } else {
              // Fallback: create result from stdout parsing
              resolve({
                buildTime: this.extractMetric(stdout, 'Build time', 'ms') || 0,
                bundleSize: this.extractMetric(stdout, 'Bundle size', 'KB') * 1024 || 0,
                memoryUsage: this.extractMetric(stdout, 'Memory usage', 'MB') * 1024 * 1024 || 0,
                optimizationScore: this.extractMetric(stdout, 'Optimization score') || 0,
                status: 'success'
              });
            }
          } catch (error) {
            reject(new Error(`Failed to parse benchmark output: ${error.message}`));
          }
        } else {
          reject(new Error(`Benchmark failed with exit code ${code}: ${stderr}`));
        }
      });
      
      // Timeout after 10 minutes
      setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error('Benchmark timed out after 10 minutes'));
      }, 10 * 60 * 1000);
    });
  }

  async runBundleAnalysis(bundlePath, options) {
    return new Promise((resolve, reject) => {
      const args = [
        this.config.analyzeScript,
        bundlePath,
        '--format', 'json'
      ];
      
      if (options.deep) args.push('--deep');
      if (options.platform) args.push('--platform', options.platform);
      if (options.environment) args.push('--environment', options.environment);
      
      const process = spawn('node', args, {
        stdio: 'pipe',
        cwd: path.dirname(this.config.analyzeScript)
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse JSON output
            const lines = stdout.split('\n');
            const jsonLine = lines.find(line => line.trim().startsWith('{'));
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine);
              resolve(result);
            } else {
              reject(new Error('No JSON output found from analysis script'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse analysis output: ${error.message}`));
          }
        } else {
          reject(new Error(`Analysis failed with exit code ${code}: ${stderr}`));
        }
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error('Analysis timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  extractMetric(text, metricName, unit = '') {
    const pattern = new RegExp(`${metricName}[:\\s]+([\\d.]+)${unit}`, 'i');
    const match = text.match(pattern);
    return match ? parseFloat(match[1]) : null;
  }

  calculateStatistics(data) {
    if (data.length === 0) return {};
    
    // Basic averages
    const averages = {
      buildTime: data.reduce((sum, d) => sum + (d.buildTime || 0), 0) / data.length,
      bundleSize: data.reduce((sum, d) => sum + (d.bundleSize || 0), 0) / data.length,
      memoryUsage: data.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / data.length,
      optimizationScore: data.reduce((sum, d) => sum + (d.optimizationScore || 0), 0) / data.length,
    };
    
    // Platform breakdown
    const platforms = {};
    const environments = {};
    
    data.forEach(d => {
      if (!platforms[d.platform]) {
        platforms[d.platform] = { count: 0, totalBuilds: 0 };
      }
      platforms[d.platform].count += 1;
      
      if (!environments[d.environment]) {
        environments[d.environment] = { count: 0, totalBuilds: 0 };
      }
      environments[d.environment].count += 1;
    });
    
    // Calculate trends (last 7 days vs previous 7 days)
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    const recent = data.filter(d => new Date(d.timestamp).getTime() > sevenDaysAgo);
    const previous = data.filter(d => {
      const timestamp = new Date(d.timestamp).getTime();
      return timestamp > fourteenDaysAgo && timestamp <= sevenDaysAgo;
    });
    
    const trends = {};
    if (recent.length > 0 && previous.length > 0) {
      const recentAvg = {
        buildTime: recent.reduce((sum, d) => sum + (d.buildTime || 0), 0) / recent.length,
        bundleSize: recent.reduce((sum, d) => sum + (d.bundleSize || 0), 0) / recent.length,
        memoryUsage: recent.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / recent.length,
        optimizationScore: recent.reduce((sum, d) => sum + (d.optimizationScore || 0), 0) / recent.length,
      };
      
      const previousAvg = {
        buildTime: previous.reduce((sum, d) => sum + (d.buildTime || 0), 0) / previous.length,
        bundleSize: previous.reduce((sum, d) => sum + (d.bundleSize || 0), 0) / previous.length,
        memoryUsage: previous.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / previous.length,
        optimizationScore: previous.reduce((sum, d) => sum + (d.optimizationScore || 0), 0) / previous.length,
      };
      
      Object.keys(recentAvg).forEach(key => {
        if (previousAvg[key] !== 0) {
          trends[key] = ((recentAvg[key] - previousAvg[key]) / previousAvg[key]) * 100;
        }
      });
    }
    
    return {
      totalBuilds: data.length,
      averages,
      trends,
      platforms,
      environments,
      timeRange: {
        earliest: data[data.length - 1]?.timestamp,
        latest: data[0]?.timestamp
      }
    };
  }

  cleanupOldData() {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    const originalLength = this.performanceData.length;
    
    this.performanceData = this.performanceData.filter(d => 
      new Date(d.timestamp).getTime() > cutoff
    );
    
    const removedCount = originalLength - this.performanceData.length;
    
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old data points`);
      this.saveData();
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🚀 Metro Performance Dashboard Server started`);
          console.log(`📊 Dashboard: http://localhost:${this.config.port}`);
          console.log(`🔌 API: http://localhost:${this.config.port}/api`);
          console.log(`📡 WebSocket: ws://localhost:${this.config.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Metro Dashboard Server stopped');
        resolve();
      });
    });
  }
}

// CLI usage
if (require.main === module) {
  const dashboard = new MetroDashboardServer();
  
  dashboard.start().catch(error => {
    console.error('Failed to start dashboard server:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down dashboard server...');
    await dashboard.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nShutting down dashboard server...');
    await dashboard.stop();
    process.exit(0);
  });
}

module.exports = MetroDashboardServer;