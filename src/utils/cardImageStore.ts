/**
 * cardImageStore — Re-exports unified file-system and web storage utilities
 * from StorageService to maintain single-source-of-truth.
 */
import { StorageService } from '../services/storageService';

export const saveCardImage = StorageService.saveCardImage;
export const savePortraitImage = StorageService.savePortraitImage;
export const clearCardImages = StorageService.clearAllCardImages;
