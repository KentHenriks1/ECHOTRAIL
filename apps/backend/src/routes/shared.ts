/**
 * Shared Routes
 * Handles public trail sharing
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * GET /shared/:token
 * Get shared trail by token
 */
router.get('/:token', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  
  res.json({
    success: true,
    data: {
      id: 'demo-trail-1',
      name: 'Demo Shared Trail',
      description: 'A shared trail for demonstration',
      isPublic: true,
      metadata: {
        distance: 5000,
        duration: 1800,
        avgSpeed: 2.8,
        maxSpeed: 5.2,
        elevationGain: 150,
        elevationLoss: 120,
      },
      trackPoints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareToken: token,
    },
  });
}));

export default router;