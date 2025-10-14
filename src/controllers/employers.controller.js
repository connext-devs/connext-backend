const {
    employersModel
} = require('../models/employers/employers.model')


exports.registerEmployers = async (req, res) => {
    const {
        employerUID,
        email,
        companyName,
        industries,
    } = req.body
    try {
        const account = await employersModel.create({
            employerUID,
            email,
            companyName,
            industries,
        });

        console.log("✅ Employer created:", account);
        res.status(200).json({
            success: true,
            message: "Employer Created Successfully"
        })
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err
        })
        console.log(err);
    }
}

exports.getEmployer = async (req, res) => {
    const {
        email
    } = req.query

    try {
        const output = await employersModel.find({
            email
        })

        //if employer does not exist
        if (output.length === 0) {
            throw new Error('Account does not exist')
        }

        res.status(200).json({
            success: true,
            message: output
        })

    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        })
        console.log(err);
    }

}


//update EMPLOYERS Profile
async function handleUpdateProfile(userID, updates) {
    const updatedEmployer = await employersModel.findByIdAndUpdate(
        userID, {
            $set: updates
        }, {
            new: true,
            runValidators: true
        }
    );

    if (!updatedEmployer) {
        throw new Error("Cannot edit profile. User does not exist");
    }

    return {
        success: true,
        message: "Successfully updated profile",
        data: updatedEmployer,
    };
}

exports.updateProfile = async (req, res) => {
    try {
        const {
            editType,
            data,
            updates
        } = req.body;
        const userID = req.params.id;

        let fieldsToUpdate = {};

        if (updates && typeof updates === "object") {
            // Multi-field update
            fieldsToUpdate = updates;
        } else if (editType) {
            // Single-field update
            fieldsToUpdate[editType] = data;
        } else {
            throw new Error("No update data provided");
        }

        res.json(await handleUpdateProfile(userID, fieldsToUpdate));
    } catch (err) {
        console.error(err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
};
