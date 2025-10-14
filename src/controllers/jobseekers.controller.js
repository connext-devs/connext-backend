const {
    jobseekersModel
} = require('../models/jobseekers/jobseekers.model')


//registering JobSeekers
exports.registerJobSeeker = async (req, res) => {
    const {
        seekerUID,
        email,
        fullName,
    } = req.body
    console.log(req.body);
    try {
        const createAccount = await jobseekersModel.create({
            seekerUID,
            email,
            fullName,
        })

        res.status(200).json({
            success: true,
            message: createAccount
        })

    } catch (err) {
        console.log(err);
        res.status(400).json({
            success: false,
            error: err
        })
    }
}

exports.getJobseeker = async (req, res) => {
    try {
        const {
            email
        } = req.query
        const output = await jobseekersModel.findOne({
            email
        })

        if (!output) {
            throw new Error('Account does not exist')
        }

        res.status(200).json({
            success: true,
            message: output
        })

    } catch (err) {
        console.log(err);
        res.status(400).json({
            success: false,
            error: err.message
        })
    }
}

exports.getJobseekerCount = async (req, res) => {
    try {
        const count = await jobseekersModel.countDocuments();

        res.status(200).json({
            success: true,
            totalJobseekers: count,
        });

    } catch (err) {
        console.log(err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
};


//update profile
async function handleUpdateProfile(userID, updates) {
    const updatedJobseeker = await jobseekersModel.findByIdAndUpdate(
        userID, {
            $set: updates
        }, {
            new: true,
            runValidators: true
        }
    );


    if (!updatedJobseeker) {
        throw new Error("Cannot edit profile. User does not exist");
    }
    console.log("---");

    console.log(await updatedJobseeker, '------------------------------');

    return {
        success: true,
        message: "Successfully updated profile",
        data: updatedJobseeker,
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

        console.log(data, updates);

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