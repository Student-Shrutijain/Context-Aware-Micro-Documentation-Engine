const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');

// IN-MEMORY DATABASE
let nodesDB = [];

// Helper to append 'status' dynamically (like the Mongoose Virtual did)
const appendStatus = (node) => {
  const diffTime = Math.abs(Date.now() - new Date(node.lastUpdated || Date.now()));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let status = 'green';
  if (diffDays > 30) status = 'red';
  else if (diffDays > 15) status = 'yellow';
  
  return { ...node, status };
};

// Get all nodes
router.get('/', (req, res) => {
  try {
    // Populate connections manually
    const populatedNodes = nodesDB.map(node => {
      const nodeWithStatus = appendStatus(node);
      
      const populatedConnections = node.connections.map(cId => {
        const cNode = nodesDB.find(n => n._id === cId);
        return cNode ? { _id: cNode._id, title: cNode.title, status: appendStatus(cNode).status } : cId;
      });
      
      return { ...nodeWithStatus, connections: populatedConnections };
    });
    
    res.json(populatedNodes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single node by id
router.get('/:id', (req, res) => {
  try {
    const node = nodesDB.find(n => n._id === req.params.id);
    if (!node) return res.status(404).json({ message: 'Node not found' });
    
    // Populate connections
    const populatedConnections = node.connections.map(cId => {
      const cNode = nodesDB.find(n => n._id === cId);
      return cNode ? { ...appendStatus(cNode) } : cId;
    });

    res.json({ ...appendStatus(node), connections: populatedConnections });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new node (Protected)
router.post('/', authMiddleware, (req, res) => {
  const node = {
    _id: crypto.randomUUID(),
    title: req.body.title,
    content: req.body.content,
    connections: req.body.connections || [],
    lastUpdated: Date.now() // Start off fresh
  };

  try {
    nodesDB.push(node);
    
    // Smart Connections: Also bidirectionally connect listed ones
    if (node.connections && node.connections.length > 0) {
       nodesDB = nodesDB.map(n => {
          if (node.connections.includes(n._id) && !n.connections.includes(node._id)) {
            return { ...n, connections: [...n.connections, node._id] };
          }
          return n;
       });
    }

    res.status(201).json(appendStatus(node));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update an existing node (Protected)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const nodeIndex = nodesDB.findIndex(n => n._id === req.params.id);
    if (nodeIndex === -1) return res.status(404).json({ message: 'Node not found' });

    let nodeToUpdate = { ...nodesDB[nodeIndex] };

    // Track if content actually changed to reset the freshness 'lastUpdated'
    if (req.body.content && req.body.content !== nodeToUpdate.content) {
      nodeToUpdate.lastUpdated = Date.now();
    }
    
    // Update core fields
    if (req.body.title) nodeToUpdate.title = req.body.title;
    if (req.body.content) nodeToUpdate.content = req.body.content;
    
    // Handle connections updates mapping back and forth
    if (req.body.connections !== undefined) {
      const oldConnections = nodeToUpdate.connections;
      const newConnections = req.body.connections;
      nodeToUpdate.connections = newConnections;

      // Unlink nodes that were removed
      const removedConnections = oldConnections.filter(c => !newConnections.includes(c));
      if (removedConnections.length > 0) {
         nodesDB = nodesDB.map(n => {
            if (removedConnections.includes(n._id)) {
              return { ...n, connections: n.connections.filter(c => c !== nodeToUpdate._id) };
            }
            return n;
         });
      }

      // Link newly added nodes
      const addedConnections = newConnections.filter(c => !oldConnections.includes(c));
      if (addedConnections.length > 0) {
         nodesDB = nodesDB.map(n => {
            if (addedConnections.includes(n._id) && !n.connections.includes(nodeToUpdate._id)) {
              return { ...n, connections: [...n.connections, nodeToUpdate._id] };
            }
            return n;
         });
      }
    }

    // Save update to memory
    nodesDB[nodeIndex] = nodeToUpdate;

    // The suggested connected nodes logic
    let suggestions = [];
    if (nodeToUpdate.connections && nodeToUpdate.connections.length > 0) {
       suggestions = nodesDB
          .filter(n => nodeToUpdate.connections.includes(n._id))
          .map(n => ({ title: n.title, status: appendStatus(n).status }));
    }

    res.json({
      updatedNode: appendStatus(nodeToUpdate),
      message: 'Node updated successfully!',
      suggestions: suggestions.length ? `Don't forget to also check: ${suggestions.map(s => s.title).join(', ')}` : null
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a node (Protected)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const nodeIndex = nodesDB.findIndex(n => n._id === req.params.id);
    if (nodeIndex === -1) return res.status(404).json({ message: 'Node not found' });
    
    // Remove references to this node in other connections
    nodesDB = nodesDB.map(n => ({
       ...n,
       connections: n.connections.filter(c => c !== req.params.id)
    }));
    
    // Delete the node
    nodesDB = nodesDB.filter(n => n._id !== req.params.id);
    
    res.json({ message: 'Node deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Optionally Preseed the memory database
nodesDB.push({
  _id: 'default_1',
  title: 'Welcome Node',
  content: 'This app is now running strictly In-Memory! Create and edit nodes as usual. *Database dependencies removed entirely.*',
  connections: [],
  lastUpdated: Date.now()
});

module.exports = router;
