import React, { useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, rankdir) => {
  dagreGraph.setGraph({
    rankdir: rankdir,
    nodesep: 50,
    edgesep: 10,
    ranksep: 100,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = { x: nodeWithPosition.x, y: nodeWithPosition.y };
  });

  return { nodes, edges };
};

function App() {
  const [projectPath, setProjectPath] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [layout, setLayout] = useState('TB');
  const [newNodeDetails, setNewNodeDetails] = useState({
    nodeName: '',
    extension: '',
    parentNode: '',
  });

  const getDirectoryTree = async () => {
    const response = await fetch('http://localhost:5001/api/get-directory-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    const result = await response.json();
    const { nodes, edges } = convertToFlowFormat(result);

    const layoutedElements = getLayoutedElements(nodes, edges, layout);
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
  };

  const convertToFlowFormat = (tree) => {
    const nodes = [];
    const edges = [];

    const addNode = (id, label, type, parentId = null) => {
      nodes.push({
        id,
        data: { label },
        position: { x: 0, y: 0 },
        type,
      });

      if (parentId) {
        const edgeColor = parentId === 'root' ? 'blue' : 'green';
        edges.push({
          id: `${parentId}-${id}`,
          source: parentId,
          target: id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: edgeColor, strokeWidth: 2 },
        });
      }
    };

    const rootNode = tree.label;
    addNode(rootNode, rootNode, 'root');

    const processTree = (node, parentId) => {
      if (node.children) {
        node.children.forEach((child) => {
          const nodeId = `${parentId}-${child.label}`;
          addNode(nodeId, child.label, 'file', parentId);

          if (child.children) {
            processTree(child, nodeId);
          }
        });
      }
    };

    processTree(tree, rootNode);

    return { nodes, edges };
  };

  const handleNodeCreation = async () => {
    const { nodeName, extension, parentNode } = newNodeDetails;

    // Send a request to the backend to create the file/folder
    const response = await fetch('http://localhost:5001/api/create-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeName, extension, parentNode }),
    });

    const result = await response.json();

    if (result.success) {
      // Add the new node and edge to the graph
      const newNode = {
        id: result.newNodeId,  // Assuming the backend returns a new node ID
        data: { label: nodeName },
        position: { x: 0, y: 0 },
        type: 'file',
      };

      const newEdge = {
        id: `${parentNode}-${result.newNodeId}`,
        source: parentNode,
        target: result.newNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'blue', strokeWidth: 2 },
      };

      setNodes((prevNodes) => [...prevNodes, newNode]);
      setEdges((prevEdges) => [...prevEdges, newEdge]);
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    const layoutedElements = getLayoutedElements(nodes, edges, newLayout);
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
  };

  return (
    <div className="App">
      <h1>Node Visualizer</h1>
      <input
        type="text"
        placeholder="Enter project path"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
      />
      <button onClick={getDirectoryTree}>Get Directory Diagram</button>

      <div>
        <button onClick={() => handleLayoutChange('TB')} className={layout === 'TB' ? 'active' : ''}>
          Top to Bottom
        </button>
        <button onClick={() => handleLayoutChange('BT')} className={layout === 'BT' ? 'active' : ''}>
          Bottom to Top
        </button>
        <button onClick={() => handleLayoutChange('LR')} className={layout === 'LR' ? 'active' : ''}>
          Left to Right
        </button>
        <button onClick={() => handleLayoutChange('RL')} className={layout === 'RL' ? 'active' : ''}>
          Right to Left
        </button>
      </div>

      {/* New Node Card */}

      <div style={{ height: '600px', width: '100%' }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;