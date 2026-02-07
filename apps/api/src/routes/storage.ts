import { Router } from 'express';
import { storageController } from '../controllers/storageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/presigned-upload', storageController.generateUploadUrl);
router.post('/presigned-download', storageController.generateDownloadUrl);
router.get('/files', storageController.listFiles);
router.get('/metadata/:fileKey', storageController.getFileMetadata);
router.delete('/:fileKey', storageController.deleteFile);

export default router;
