const {
    mongoose
} = require('../../config/db');

const notificationSchema = new mongoose.Schema({
    notificationUID: {
        type: String,
        unique: true,
        default: function () {
            return `${this.receiverUID}_${Date.now()}`; // e.g. jobseeker123_1730310293001
        },
    },
    // user who will receive the notification
    receiverUID: {
        type: String,
        required: true,
    },
    // employer or jobseeker who triggered the notification
    senderUID: {
        type: String,
        default: null,
    },
    // short label for notification
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    // notification category
    type: {
        type: String,
        enum: [
            'message',
            'match',
            'application',
            'application_viewed',
            'application_shortlisted',
            'application_contacted',
            'application_rejected',
            'application_hired',
            'job_update',
            'meeting',
            'system',
        ],
        default: 'system',
    },
    data: {
        type: Object,
        default: {},
    },
    // whether user has read it
    read: {
        type: Boolean,
        default: false,
    },
    // receiver’s user type
    receiverRole: {
        type: String,
        enum: ['employer', 'jobseeker'],
        required: true,
    },

}, {
    timestamps: true,
});

exports.notificationModel = mongoose.model('notifications', notificationSchema);