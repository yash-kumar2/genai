const mongoose = require('mongoose')

const roadmapSchema = new mongoose.Schema({
  goal: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  tasks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    dueDate: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
   prerequisiteGraph: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
})

const Roadmap = mongoose.model('Roadmap', roadmapSchema)

module.exports = Roadmap
