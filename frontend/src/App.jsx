import React, { useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import dagre from 'dagre';

// Set up the graph layout using Dagre
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges) => {
  dagreGraph.setGraph({
    rankdir: 'TB',  // Left-to-right layout for horizontal alignment
    nodesep: 50,    // Distance between nodes
    edgesep: 10,    // Distance between edges
    ranksep: 100,   // Distance between horizontal ranks (sibling nodes)
  });

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply the layout
  dagre.layout(dagreGraph);

  // Set node positions based on layout
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

  const getDirectoryTree = async () => {
    const response = await fetch('http://localhost:5001/get-directory-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    const result = await response.json();
    const { nodes, edges } = convertToFlowFormat(result);

    const layoutedElements = getLayoutedElements(nodes, edges);
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
        edges.push({
          id: `${parentId}-${id}`,
          source: parentId,
          target: id,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    };

    const rootNode = tree.label;
    addNode(rootNode, rootNode, 'root');

    const processTree = (node, parentId) => {
      if (node.children) {
        node.children.forEach((child, index) => {
          const nodeId = `${parentId}-${child.label}`;
          addNode(nodeId, child.label, 'file', parentId);

          if (index > 0) {
            const siblingId = `${parentId}-${node.children[index - 1].label}`;
            edges.push({
              id: `${siblingId}-${nodeId}`,
              source: siblingId,
              target: nodeId,
              markerEnd: { type: MarkerType.ArrowClosed },
            });
          }

          if (child.children) {
            processTree(child, nodeId);
          }
        });
      }
    };

    processTree(tree, rootNode);

    return { nodes, edges };
  };

  return (
    <div className="App">
      <h1>Node.js Project Manager</h1>
      <input
        type="text"
        placeholder="Enter project path"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
      />
      <button onClick={getDirectoryTree}>Get Directory Diagram</button>

      <div style={{ height: '600px', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
