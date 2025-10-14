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
            }, // e.g. "Philippines"
            country_code: {
                type: String
            }, // e.g. "ph"
            name: {
                type: String
            }, // e.g. "Quezon"
            display_name: {
                type: String
            }, // e.g. "Quezon, Philippines"
            lat: {
                type: String
            }, // e.g. "13.9"
            lon: {
                type: String
            }, // e.g. "122"
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
        type: {
            degree: {
                type: String,
                default: null
            },
            school: {
                type: String,
                default: null
            },
            status: {
                type: String,
                default: null
            },
            yearLevel: {
                type: Number,
                default: null
            },
            graduationYear: {
                type: Number,
                default: null
            }
        },
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