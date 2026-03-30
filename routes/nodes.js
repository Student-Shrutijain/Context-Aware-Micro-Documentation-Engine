const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const authMiddleware = require('../middleware/auth');

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const nodes = await Node.find().populate('connections', 'title status');
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single node by id
router.get('/:id', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id).populate('connections');
    if (!node) return res.status(404).json({ message: 'Node not found' });
    res.json(node);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new node (Protected)
router.post('/', authMiddleware, async (req, res) => {
  const node = new Node({
    title: req.body.title,
    content: req.body.content,
    connections: req.body.connections || []
  });

  // Smart Connections: Also bidirectionally connect listed ones
  try {
    const newNode = await node.save();
    
    // Auto-update connected nodes, linking them back
    if (newNode.connections && newNode.connections.length > 0) {
       await Node.updateMany(
         { _id: { $in: newNode.connections } }, 
         { $addToSet: { connections: newNode._id } }
       );
    }

    res.status(201).json(newNode);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update an existing node (Protected)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const nodeToUpdate = await Node.findById(req.params.id);
    if (!nodeToUpdate) return res.status(404).json({ message: 'Node not found' });

    // Track if content actually changed to reset the freshness 'lastUpdated'
    if (req.body.content && req.body.content !== nodeToUpdate.content) {
      nodeToUpdate.lastUpdated = Date.now();
    }
    
    // Update core fields
    if (req.body.title) nodeToUpdate.title = req.body.title;
    if (req.body.content) nodeToUpdate.content = req.body.content;
    
    // Handle connections updates mapping back and forth
    if (req.body.connections !== undefined) {
      const oldConnections = nodeToUpdate.connections.map(id => id.toString());
      const newConnections = req.body.connections;
      nodeToUpdate.connections = newConnections;

      // Unlink nodes that were removed
      const removedConnections = oldConnections.filter(c => !newConnections.includes(c));
      if (removedConnections.length > 0) {
         await Node.updateMany(
            { _id: { $in: removedConnections } },
            { $pull: { connections: nodeToUpdate._id } }
         );
      }

      // Link newly added nodes
      const addedConnections = newConnections.filter(c => !oldConnections.includes(c));
      if (addedConnections.length > 0) {
         await Node.updateMany(
            { _id: { $in: addedConnections } },
            { $addToSet: { connections: nodeToUpdate._id } }
         );
      }
    }

    const updatedNode = await nodeToUpdate.save();

    // The suggested connected nodes logic
    let suggestions = [];
    if (updatedNode.connections && updatedNode.connections.length > 0) {
       suggestions = await Node.find({ _id: { $in: updatedNode.connections } }).select('title status');
    }

    res.json({
      updatedNode,
      message: 'Node updated successfully!',
      suggestions: suggestions.length ? `Don't forget to also check: ${suggestions.map(s => s.title).join(', ')}` : null
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a node (Protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const node = await Node.findByIdAndDelete(req.params.id);
    if (!node) return res.status(404).json({ message: 'Node not found' });
    
    // Remove references to this node in other connections
    await Node.updateMany(
      { connections: req.params.id },
      { $pull: { connections: req.params.id } }
    );
    
    res.json({ message: 'Node deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
