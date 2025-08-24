import * as multer from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

// File size limit (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
export const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|webp/;

export const multerConfig = {
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: any, callback: any) => {
    const ext = extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    
    if (!ALLOWED_FILE_TYPES.test(ext) || !ALLOWED_FILE_TYPES.test(mimetype)) {
      return callback(
        new BadRequestException('Only image files are allowed (jpeg, jpg, png, gif, webp)'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

export const multerOptions = {
  dest: './uploads/temp',
};