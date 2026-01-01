'use client';

import React, { useState } from 'react';
import * as THREE from 'three';

interface MinimapProps {
  playerPosition: THREE.Vector3;
  enemyPosition: THREE.Vector3;
  boundaryLimit: number;
}

const Minimap: React.FC<MinimapProps> = ({ playerPosition, enemyPosition, boundaryLimit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const mapSize = isExpanded ? 200 : 120;
  const scale = mapSize / (boundaryLimit * 2);

  const playerX = (playerPosition.x + boundaryLimit) * scale;
  const playerZ = (playerPosition.z + boundaryLimit) * scale;
  const enemyX = (enemyPosition.x + boundaryLimit) * scale;
  const enemyZ = (enemyPosition.z + boundaryLimit) * scale;

  return (
    <div
      className="minimap-container"
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: `${mapSize}px`,
        height: `${mapSize}px`,
        backgroundColor: '#1a1a1a',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Grid Background */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Battlefield Area */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: `${mapSize - 20}px`,
          height: `${mapSize - 20}px`,
          backgroundColor: 'rgba(74, 93, 58, 0.3)',
          border: '1px solid rgba(74, 93, 58, 0.6)',
          borderRadius: '4px'
        }}
      />
      
      {/* Player Tank */}
      <div
        style={{
          position: 'absolute',
          left: `${playerX}px`,
          top: `${playerZ}px`,
          width: '10px',
          height: '10px',
          backgroundColor: '#00ff00',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px rgba(0, 255, 0, 0.6)',
          animation: 'minimap-pulse 2s infinite'
        }}
      />
      
      {/* Enemy Tank */}
      <div
        style={{
          position: 'absolute',
          left: `${enemyX}px`,
          top: `${enemyZ}px`,
          width: '10px',
          height: '10px',
          backgroundColor: '#ff0000',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px rgba(255, 0, 0, 0.6)',
          animation: 'minimap-pulse 2s infinite 1s'
        }}
      />
      
      {/* Expand/Collapse Button */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '16px',
          height: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#ffffff',
          fontWeight: 'bold'
        }}
      >
        {isExpanded ? '−' : '+'}
      </div>
      
      {/* Legend */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            fontSize: '8px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '4px',
            borderRadius: '2px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#00ff00', borderRadius: '50%', marginRight: '4px' }} />
            Player
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#ff0000', borderRadius: '50%', marginRight: '4px' }} />
            Enemy
          </div>
        </div>
      )}
      

    </div>
  );
};

export default Minimap;