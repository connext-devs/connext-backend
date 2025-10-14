const {
    mongoose
} = require('../../config/db')
const {
    nanoid
} = require('nanoid');


const joblistingsSchema = new mongoose.Schema({
    _id: String,
    jobUID: {
        type: String,
        required: true,
        unique: true
    },

    employerUID: {
        type: String,
        required: true
    }, // internal jobs only

    jobTitle: {
        type: String,
        required: true
    },
    jobTitleVector: {
        type: Array
    },
    jobNormalized: {
        type: String,
        default: ""
    },
    jobIndustry: {
        type: String
    },
    jobDescription: {
        type: String
    },
    jobSkills: {
        type: [String],
        default: []
    },

    location: {
        country: String,
        country_code: String,
        name: String,
        display_name: String,
        lat: String,
        lon: String,
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

    employment: {
        type: [String],
        default: []
    },
    workTypes: {
        type: [String],
        default: []
    },

    salaryRange: {
        min: {
            type: Number,
            default: null
        },
        max: {
            type: Number,
            default: null
        },
        currency: {
            type: String,
            default: "PHP"
        },
        frequency: {
            type: String,
            default: "month"
        }
    },

    isExternal: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});


exports.joblistingsModel = mongoose.model('job_listings', joblistingsSchema)