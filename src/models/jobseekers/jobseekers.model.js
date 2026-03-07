const {
    mongoose
} = require('../../config/db')

const jobseekersSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: function () {
            return this.seekerUID
        }
    },
    seekerUID: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    authProvider: {
        type: String,
        enum: ['password', 'google'],
        default: 'password'
    },
    fullName: {
        firstName: String,
        middleInitial: String,
        lastName: String,
        suffix: String
    },
    industries: {
        type: [String],
        default: null
    },
    resume: {
        type: String,
        default: null
    },
    profileSummary: {
        type: String,
        default: "",
        maxlength: 750
    },
    skills: {
        type: [String],
        default: null
    },
    location: {
        type: {
            country: {
                type: String
            },
            country_code: {
                type: String
            }, 
            name: {
                type: String
            }, 
            display_name: {
                type: String
            }, 
            lat: {
                type: String
            }, 
            lon: {
                type: String
            }, 
            province: {
                type: String,
                default: null
            },
            city: {
                type: String,
                default: null
            },
            postalCode: {
                type: String,
                default: null
            }
        },
        default: null
    },
    education: {
        type: [{
            schoolName: {
                type: String,
                default: null,
            },
            degree: {
                type: String,
                default: null
            },
            fieldOfStudy: {
                type: String,
                default: null
            },
            startYear: {
                type: Number,
                default: null
            },
            endYear: {
                type: Number,
                default: null
            },
            isCurrent: {
                type: Number,
                default: null
            }
        }],
        default: null
    },

    highestLevelAttained: {
        type: String,
        default: null
    },
    status: {
        type: Boolean,
        default: true
    }, // active/inactive
    role: {
        type: String,
        default: "jobseeker"
    },
    experience: {
        type: [String],
        default: []
    },
    certifications: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});


exports.jobseekersModel = mongoose.model('job_seekers', jobseekersSchema)