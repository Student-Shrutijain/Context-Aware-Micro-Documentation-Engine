const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node'
  }]
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Since we have `updatedAt` managed by mongoose, we could use it, 
// but we specifically track `lastUpdated` to manually trigger "freshness" resets 
// when the user actually updates the documentation content, 
// not just when meta properties change.

// Virtual field for "freshnessStatus"
nodeSchema.virtual('status').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.lastUpdated);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays > 30) {
    return 'red';
  } else if (diffDays > 15) {
    return 'yellow';
  }
  return 'green';
});

// Ensure virtual fields are serialized
nodeSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Node', nodeSchema);
