const path = require('path');
const express = require('express');
const multer = require('multer');
const { uploadImage } = require('../utils/cloudinary');
const router = express.Router();

const os = require('os');
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp|gif|svg|avif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const targetFolder = req.query.folder ? `ecom_products/${req.query.folder}` : 'ecom_products/general';
        const result = await uploadImage(req.file.path, targetFolder);

        res.send({
            message: 'Image Uploaded to Cloudinary',
            image: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

