import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const src = resolve('../video/mobile-version.mp4');
const dest = resolve('public/media/mobile-version.mp4');

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log('Mobile video copied successfully to public/media/mobile-version.mp4');
} else {
  console.error('Source video not found:', src);
}
