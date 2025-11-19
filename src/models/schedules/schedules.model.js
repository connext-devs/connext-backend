const mongoose = require('mongoose');
const {
  v4: uuidv4
} = require('uuid');

const meetingSchema = new mongoose.Schema({
  meetingUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  conversationUID: {
    type: String,
    required: true,
    index: true
  },
  employerUID: {
    type: String,
    required: true,
    index: true
  },
  seekerUID: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'on-call', 'cancelled', 'missed', 'completed','cancelled'],
    default: 'pending'
  },
  meetingLink: {
    type: String
  },
  eventLink: {
    type: String
  },
  eventUID: {
    type: String
  },
  type: {
    type: String,
    default: 'meeting'
  }
}, {
  timestamps: true
});

meetingSchema.pre('validate', function (next) {
  if (!this.meetingUID) {
    this.meetingUID = uuidv4();
  }
  next();
});

module.exports = mongoose.model('schedules', meetingSchema);