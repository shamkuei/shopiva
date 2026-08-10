import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Local disk storage for now (migrate to MinIO/S3 later). Files land in
// `<cwd>/uploads` and are served statically from `/uploads`.
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new ApiError(400, 'Only image files are allowed'));
  },
});

/**
 * `multer.single('image')` wrapper that converts multer errors (oversize,
 * wrong type) into 400 responses instead of 500s.
 */
export const uploadProductImage = (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err?: unknown) => {
    if (err instanceof ApiError) return next(err);
    if (err) return next(ApiError.badRequest((err as Error)?.message || 'Upload failed'));
    next();
  });
};
