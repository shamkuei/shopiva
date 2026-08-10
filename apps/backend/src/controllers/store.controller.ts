import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { storeService } from '../services/store.service';

/** The store resolved for the current request (by the tenant middleware). */
export const getCurrentStore = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: req.store });
});

/** Lists all tenants (platform-level; useful for admin tooling later). */
export const listStores = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await storeService.list() });
});
