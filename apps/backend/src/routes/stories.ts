/**
 * Story Routes
 * Handles AI story generation and management
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * GET /stories
 * Get stories near location
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius = 1000 } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: 'demo-story-1',
        title: 'The Old Oak Tree',
        content: 'Long ago, this ancient oak stood as a meeting point for travelers...',
        location: 'Old Oak Park',
        latitude: parseFloat(latitude as string) || 59.9139,
        longitude: parseFloat(longitude as string) || 10.7522,
        tags: ['historical', 'nature', 'folklore'],
        category: 'HISTORICAL',
        mood: 'mysterious',
        estimatedReadTime: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}));

/**
 * POST /stories/generate
 * Generate new story for location
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Story generation endpoint - implement with OpenAI integration',
      location: req.body.location,
    },
  });
}));

/**
 * GET /stories/:id
 * Get specific story
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      message: 'Get story endpoint - implement with database lookup',
    },
  });
}));

export default router;