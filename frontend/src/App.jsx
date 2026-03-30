import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ReactMarkdown from 'react-markdown';
import { Search, Plus, X, Globe, Info, Activity, User as UserIcon, LogOut, Edit3 } from 'lucide-react';
import { getNodes, createNode, updateNode, deleteNode, loginAdmin } from './api';
import './App.css';

const getColor = (status) => {
  if (status === 'red') return '#da3633';
  if (status === 'yellow') return '#d29922';
  return '#2ea043';
};

function App() {
  const [nodes, setNodes] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  // Real auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ title: '', content: '', connections: [] });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [toast, setToast] = useState(null);

  const fgRef = useRef();

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const { data } = await getNodes();
      setNodes(data);
      
      const gNodes = data.map(n => ({ ...n, id: n._id, val: 1.5 }));
      const gLinks = [];
      data.forEach(node => {
        if (node.connections) {
          node.connections.forEach(conn => {
            if (typeof conn === 'string' || conn._id) {
               gLinks.push({
                  source: node._id,
                  target: conn._id || conn,
                  value: 1
               });
            }
          });
        }
      });
      
      setGraphData({ nodes: gNodes, links: gLinks });
    } catch (err) {
      console.error('Failed to load nodes:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Check for existing login on mount
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setIsAdmin(true);
    }
  }, [loadData]);

  // Handle Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    const matches = nodes.filter(n => 
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
    setSearchResults(matches);
  }, [searchTerm, nodes]);

  // Toast helper
  const showToast = (msg, time = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), time);
  };

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await loginAdmin(loginCreds);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setIsAdmin(true);
      setShowLoginModal(false);
      showToast('Login successful!');
    } catch (err) {
      showToast('Invalid credentials!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setIsAdmin(false);
    showToast('Logged out securely.');
  };

  // Select Node and Open Panel
  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(node._id || node.id);
    const originNode = nodes.find(n => n._id === (node._id || node.id));
    if (originNode) {
      setFormData({
         title: originNode.title,
         content: originNode.content,
         connections: originNode.connections.map(c => c._id || c)
      });
      setIsCreating(false);
      setIsEditingContent(false); // Reset to reading mode automatically
      setSidebarOpen(true);
      
      // Zoom to node
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 2000);
    }
  }, [nodes]);

  const handleCreateNew = () => {
    setSelectedNodeId(null);
    setFormData({ title: '', content: '', connections: [] });
    setIsCreating(true);
    setIsEditingContent(true);
    setSidebarOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      showToast('Only admins can edit nodes!');
      return;
    }
    
    try {
      if (isCreating) {
        await createNode(formData);
        showToast('Node created successfully!');
      } else {
        const res = await updateNode(selectedNodeId, formData);
        showToast('Node updated! ' + (res.data.suggestions || ''));
      }
      loadData();
      setIsEditingContent(false);
      if (isCreating) setSidebarOpen(false);
    } catch (err) {
      if (err.response && err.response.status === 401) {
         showToast('Session expired. Please login again.');
         handleLogout();
      } else {
         showToast('Error saving node.');
      }
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (window.confirm('Delete this documentation node?')) {
      await deleteNode(selectedNodeId);
      showToast('Node removed from map.');
      setSidebarOpen(false);
      loadData();
    }
  };

  const selectedNode = nodes.find(n => n._id === selectedNodeId);

  return (
    <div className="app-container">
      {/* BACKGROUND GRAPH */}
      <div className="graph-container">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel="title"
          nodeColor={n => getColor(n.status)}
          nodeRelSize={8}
          linkColor={() => 'rgba(255,255,255,0.1)'}
          linkWidth={2}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          backgroundColor="#0d1117"
        />
      </div>

      {/* TOP OVERLAY NAVIGATION */}
      <div className="top-bar">
        {/* BRANDING */}
        <div className="glass-panel brand">
          <Globe className="brand-icon" size={24} />
          <h1>MicroDoc Map</h1>
        </div>

        {/* SEARCH WIDGET */}
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="glass-panel search-dropdown animate-fade-in">
              {searchResults.map(res => (
                <div 
                  key={res._id} 
                  className="search-item" 
                  onClick={() => {
                     setSearchTerm('');
                     handleNodeClick(res);
                  }}
                >
                   <div style={{width: 8, height: 8, borderRadius: '50%', background: getColor(res.status)}}></div>
                   {res.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AUTH BUTTON */}
        <div className="glass-panel brand" style={{cursor: 'pointer', padding: '8px 16px'}} onClick={() => isAdmin ? handleLogout() : setShowLoginModal(true)}>
          {isAdmin ? (
            <>
              <LogOut size={16} />
              <span style={{fontSize: 14, fontWeight: 500}}>Logout [Admin]</span>
            </>
          ) : (
            <>
              <UserIcon size={16} />
              <span style={{fontSize: 14, fontWeight: 500}}>Admin Login</span>
            </>
          )}
        </div>
      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
           <div className="glass-panel" style={{padding: 32, width: 320, pointerEvents: 'auto'}}>
              <h2 style={{marginBottom: 20}}>Admin Authorization</h2>
              <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                 <input autoFocus type="text" placeholder="Username" value={loginCreds.username} onChange={e => setLoginCreds({...loginCreds, username: e.target.value})} />
                 <input type="password" placeholder="Password" value={loginCreds.password} onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} />
                 <div style={{display: 'flex', gap: 10, marginTop: 10}}>
                   <button type="button" className="btn-secondary" style={{flex: 1}} onClick={() => setShowLoginModal(false)}>Cancel</button>
                   <button type="submit" className="btn-primary" style={{flex: 1}}>Login</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* SIDE PANEL */}
      <div className={`glass-panel side-panel ${!sidebarOpen ? 'hidden' : ''}`} style={!sidebarOpen ? {opacity: 0, pointerEvents: 'none'} : {}}>
        <div className="panel-header" style={{alignItems: 'flex-start'}}>
           <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
             <h2 style={{margin: 0}}>{isCreating ? 'Create Knowledge Node' : selectedNode?.title || 'Mapping Node'}</h2>
             
             {!isCreating && selectedNode && (
                <div className={`status-badge status-${selectedNode.status}`} style={{width: 'fit-content'}}>
                   <span className="status-dot"></span>
                   {selectedNode.status === 'green' ? 'Fresh' : selectedNode.status === 'yellow' ? 'Getting Old' : 'Needs Update'}
                </div>
             )}
             
             {isAdmin && !isCreating && (
               <button 
                 className={`btn-secondary ${isEditingContent ? 'active' : ''}`} 
                 style={{display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginTop: '4px', background: isEditingContent ? 'rgba(88, 166, 255, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: isEditingContent ? 'var(--accent-color)' : 'var(--panel-border)', color: isEditingContent ? 'var(--accent-color)' : 'var(--text-primary)'}} 
                 onClick={() => setIsEditingContent(!isEditingContent)}
               >
                  <Edit3 size={14} /> {isEditingContent ? 'Cancel Editing' : 'Edit Node Content'}
               </button>
             )}
           </div>

           <button className="close-btn" onClick={() => setSidebarOpen(false)}>
             <X size={24} />
           </button>
        </div>

        {/* FORM / READ VIEW */}
        <div className="form-group">
          <label>Title</label>
          <input 
            type="text" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            readOnly={!isAdmin}
            style={{ border: !isAdmin && 'none', background: !isAdmin && 'transparent', fontSize: !isAdmin && '1.2rem', padding: !isAdmin && 0 }}
          />
        </div>

        <div className="form-group" style={{marginTop: '8px'}}>
          <label>Documentation</label>
          
          {(!isAdmin || !isEditingContent) && !isCreating ? (
             <div style={{background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, minHeight: '30vh', fontSize: 15, lineHeight: 1.6, overflowY: 'auto', border: '1px solid var(--panel-border)'}}>
                <ReactMarkdown components={{
                  h1: ({node, ...props}) => <h1 style={{fontSize: '1.5rem', marginTop: '16px', marginBottom: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px'}} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{fontSize: '1.2rem', marginTop: '12px', marginBottom: '8px', color: 'var(--accent-color)'}} {...props} />,
                  p: ({node, ...props}) => <p style={{marginBottom: '12px'}} {...props} />,
                  ul: ({node, ...props}) => <ul style={{paddingLeft: '20px', marginBottom: '12px'}} {...props} />,
                  li: ({node, ...props}) => <li style={{marginBottom: '4px'}} {...props} />,
                  code: ({node, inline, ...props}) => <code style={{background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: 4, fontFamily: 'monospace', fontSize: '13px'}} {...props} />
                }}>
                  {formData.content || '*No content available.*'}
                </ReactMarkdown>
             </div>
          ) : (
             <textarea 
               value={formData.content}
               onChange={(e) => setFormData({...formData, content: e.target.value})}
               placeholder="Write markdown documentation here..."
               style={{fontFamily: 'monospace', minHeight: '30vh', background: 'rgba(0,0,0,0.3)'}}
             ></textarea>
          )}
          
          {isAdmin && isEditingContent && !isCreating && (
            <p style={{fontSize: 12, color: 'var(--text-secondary)'}}>
               <Info size={12} style={{display: 'inline', marginRight: 4, verticalAlign: 'middle'}}/>
               Updating content resets freshness to '<span style={{color: 'var(--status-green)'}}>Fresh</span>'. Supports Markdown mapping.
            </p>
          )}
        </div>

        <div className="form-group" style={{marginTop: 10}}>
           <label>Smart Connections</label>
           <div className="connections-list">
             {formData.connections.map(connId => {
                const c = nodes.find(n => n._id === connId);
                if (!c) return null;
                return (
                  <div key={connId} className="connection-tag" style={{background: !isAdmin && 'rgba(255,255,255,0.02)'}}>
                     <span>{c.title}</span>
                     {isAdmin && (
                        <X size={14} style={{cursor: 'pointer'}} onClick={() => {
                           setFormData({...formData, connections: formData.connections.filter(id => id !== connId)});
                        }} />
                     )}
                  </div>
                )
             })}
           </div>
           
           {isAdmin && (
              <select 
                className="add-connection-select"
                onChange={(e) => {
                   if (e.target.value && !formData.connections.includes(e.target.value)) {
                      setFormData({...formData, connections: [...formData.connections, e.target.value]});
                   }
                   e.target.value = ''; // reset
                }}
              >
                 <option value="">+ Connect to node...</option>
                 {nodes
                   .filter(n => n._id !== selectedNodeId && !formData.connections.includes(n._id))
                   .map(n => (
                      <option key={n._id} value={n._id}>{n.title}</option>
                   ))}
              </select>
           )}
        </div>

        {/* ACTIONS */}
        {isAdmin && (
          <div className="panel-actions">
            {!isCreating && (
               <button className="btn-secondary" onClick={handleDelete}>
                 Delete Node
               </button>
            )}
            <button className="btn-primary" onClick={handleSave}>
              {isCreating ? 'Create Node' : 'Save Node'}
            </button>
          </div>
        )}
      </div>

      {/* FAB: ADD NEW NODE (Admin Only) */}
      {isAdmin && (
        <button className="fab-add animate-fade-in" onClick={handleCreateNew}>
          <Plus size={28} />
        </button>
      )}

      {/* TOAST SYSTEM */}
      {toast && (
        <div className="glass-panel alert-toast animate-fade-in">
           <Activity size={18} color="var(--accent-color)" />
           {toast}
        </div>
      )}
    </div>
  );
}

export default App;
