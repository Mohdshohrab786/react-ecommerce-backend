const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (filePath, folderName = 'ecom_products/general') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folderName,
        });
        
        // Delete local temporary file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        // Also clean up local file if upload fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};

module.exports = { uploadImage, deleteImage };

