import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder user routes - will be implemented later
router.get('/profile', (req: Request, res: Response) => {
  res.status(501).json({ message: 'User profile endpoint - coming soon' });
});

router.put('/profile', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Update profile endpoint - coming soon' });
});

export { router as userRoutes };