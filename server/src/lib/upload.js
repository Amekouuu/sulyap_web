// Accepts image uploads in memory and checks them before they go to storage.
// The browser checks too, but only these server checks are trusted.
import multer from 'multer';
import { badRequest } from '../errors.js';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Upload middleware for a single image field.
export function singleImage(field) {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  }).single(field);
  return (req, res, next) =>
    handler(req, res, (error) => {
      if (error?.code === 'LIMIT_FILE_SIZE') return next(badRequest('Photos can be up to 5 MB.'));
      if (error) return next(badRequest('The upload could not be read. Please try again.'));
      next();
    });
}

// Upload middleware for up to `max` images in one field (nomination and review photos).
export function manyImages(field, max) {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: max },
  }).array(field, max);
  return (req, res, next) =>
    handler(req, res, (error) => {
      if (error?.code === 'LIMIT_FILE_SIZE') return next(badRequest('Photos can be up to 5 MB.'));
      if (error?.code === 'LIMIT_FILE_COUNT' || error?.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(badRequest(`You can add up to ${max} photos.`));
      }
      if (error) return next(badRequest('The upload could not be read. Please try again.'));
      next();
    });
}

// Checks the declared type, the file name, and the first bytes of the file itself.
export function assertJpegOrPng(file) {
  if (!file) throw badRequest('Please choose a photo to upload.');
  const name = (file.originalname || '').toLowerCase();
  const bytes = file.buffer;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const typeOk =
    (file.mimetype === 'image/jpeg' && isJpeg && /\.(jpe?g)$/.test(name)) ||
    (file.mimetype === 'image/png' && isPng && /\.png$/.test(name));
  if (!typeOk) throw badRequest('Only JPG or PNG photos can be uploaded.');
}
