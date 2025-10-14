const {
    mongoose
} = require('../../config/db')

const employersSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: function () {
            return this.employerUID
        }
    },
    employerUID: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    industries: {
        type: [String],
        default: null
    },
    profileSummary: {
        type: String
    },
    profilePic: {
        type: String,
        default: "https://ik.imagekit.io/mnv8wgsbk/Public%20Images/placeholder.png?updatedAt=1756757645263"
    },
    status: {
        type: Boolean,
        default: true
    }, // active/inactive
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
    accountIncomplete: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        default: "employer"
    }
}, {
    timestamps: true
});


exports.employersModel = mongoose.model('employers', employersSchema)