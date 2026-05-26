import React, { useState, useEffect } from 'react';

export type LayoutMode = 'demo-only' | 'demo-code' | 'demo-code-logs';

interface LayoutManagerProps {
  currentLayout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({
  currentLayout,
  onLayoutChange
}) => {
  useEffect(() => {
    // Keyboard shortcuts for layout switching
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            onLayoutChange('demo-only');
            break;
          case '2':
            e.preventDefault();
            onLayoutChange('demo-code');
            break;
          case '3':
            e.preventDefault();
            onLayoutChange('demo-code-logs');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLayoutChange]);

  const layouts: Array<{ mode: LayoutMode; label: string; icon: string; shortcut: string }> = [
    { mode: 'demo-only', label: 'Demo Only', icon: '📱', shortcut: 'Ctrl+1' },
    { mode: 'demo-code', label: 'Demo + Code', icon: '📱💻', shortcut: 'Ctrl+2' },
    { mode: 'demo-code-logs', label: 'Demo + Code + Logs', icon: '📱💻📝', shortcut: 'Ctrl+3' }
  ];

  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid #374151',
      backgroundColor: '#111827'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: '8px'
      }}>
        Layout Mode
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {layouts.map(layout => (
          <button
            key={layout.mode}
            onClick={() => onLayoutChange(layout.mode)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              backgroundColor: currentLayout === layout.mode ? '#374151' : '#1f2937',
              color: currentLayout === layout.mode ? '#f9fafb' : '#9ca3af',
              border: currentLayout === layout.mode ? '2px solid #2563eb' : '1px solid #4b5563',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: currentLayout === layout.mode ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{layout.icon}</span>
              <span>{layout.label}</span>
            </div>
            <span style={{
              fontSize: '10px',
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              {layout.shortcut}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  onResize
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
      onResize?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: `${width}px`,
        backgroundColor: '#1f2937',
        boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
        display: 'flex',
        zIndex: 1000
      }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        style={{
          width: '4px',
          cursor: 'col-resize',
          backgroundColor: isResizing ? '#2563eb' : '#374151',
          transition: 'background-color 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = '#4b5563';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = '#374151';
          }
        }}
      />
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};
