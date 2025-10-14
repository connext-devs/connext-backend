const Admin = require("../../models/admins/admin.model");

exports.getAdmin = async (req, res) => {
    try {
        const {
            adminUID
        } = req.params;

        const admin = await Admin.findById(adminUID);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            payload: admin
        });
    } catch (err) {
        console.error("❌ Error fetching admin:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};