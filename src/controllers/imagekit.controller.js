const imagekit = require('../services/imagekit.service')
const {
    v4: uuidv4
} = require("uuid");

exports.uploadImage = async (req, res) => {
    try {
        const file = req.file; // assuming multer is used for file uploads

        const result = await imagekit.upload({
            file: file.buffer, // actual file buffer or base64
            fileName: file.originalname,
            folder: "uploads"
        });

        res.status(200).json({
            success: true,
            url: result.url, // 🔹 public URL
            thumbnail: result.thumbnailUrl,
            fileId: result.fileId,
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};


exports.getUploadKeys = async (req, res) => {
    try {
        const token = uuidv4();
        const authenticationParameters = imagekit.getAuthenticationParameters(token);
        res.status(200).json({
            success: true,
            message: authenticationParameters,
            public_key: process.env.IMAGEKIT_PUBLIC_KEY
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err
        })
    }
}

exports.getFileURL = async (req, res) => {
    const {
        filePaths
    } = req.body;

    try {


        if (!Array.isArray(filePaths)) {
            return res.status(400).json({
                success: false,
                error: "filePaths must be an array"
            });
        }

        //Validation for files
        const cleanedNames = filePaths.map(path => path.replace(/^\//, ''));
        const searchQuery = cleanedNames.map(name => `name="${name}"`).join(' OR ');
        const files = await imagekit.listFiles({
            filePaths
        });

        // if (filePaths.length != files.length) {
        //     throw new Error('Failed to fetch, files are missing')
        // }

        console.log(cleanedNames);
        console.log(files);


        const signedUrls = filePaths.map((path) => ({
            filePath: path,
            signedUrl: imagekit.url({
                path,
                signed: true,
                expireSeconds: 3600 // 1 hour validity
            })
        }));

        res.json({
            files: signedUrls
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        })
    }


}