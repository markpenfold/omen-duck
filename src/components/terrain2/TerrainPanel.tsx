// components/other/terrain/TerrainPanel.tsx

import { useState, useEffect } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import MyCanvas from './MyCanvas';


interface TerrainPanelProps {
  onHover?: (info?: any) => void;
  className?: string;
  isMobile?: boolean;
  onResizeStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function TerrainPanel({ onHover = () => {}, className = '', isMobile = false, onResizeStart, isCollapsed: controlledIsCollapsed, onCollapsedChange }: TerrainPanelProps) {
  const eventData = useEventStore((state) => state.aggregatedEvents);
  const selectedCollections = useEventStore((state) => state.selectedCollections);
  const hasTimeline = eventData && eventData.length > 0;
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  /*
  // Debug logging
  useEffect(() => {
    console.log('🏔️ TerrainPanel state:', {
      eventDataLength: eventData?.length || 0,
      selectedCollections: selectedCollections.length,
      hasTimeline
    });
  }, [eventData, selectedCollections, hasTimeline]);
 */


  return (
    <div className="flex flex-col h-full text-white">
        <>
          <div className="flex-1 min-h-0 relative overflow-hidden">
                {/* Selected Collections Overlay */}
                {selectedCollections.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    pointerEvents: 'none',
                    zIndex: 1000
                  }}>
                    {selectedCollections.map((collection) => (
                      <div
                        key={collection.key}
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          minHeight: '22px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Color bar */}
                        <div
                          style={{
                            borderLeft: `3px solid ${collection.color}`,
                            flexShrink: 0
                          }}
                        />

                        {/* Collection name */}
                        <div
                          style={{
                            backgroundColor: '#2c2c2c',
                            padding: '2px 6px',
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: 0
                          }}
                        >
                          <div style={{
                            fontSize: '9px',
                            color: '#9ca3af',
                            fontWeight: '400',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {collection.displayName}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasTimeline ? (
                  <>
                    <MyCanvas className={className} endpoint='' onHover={onHover} />
                    {/* Navigation hint overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      whiteSpace: 'nowrap'
                    }}>
                      Double-click on terrain to select events
                    </div>
                  </>
                ) : (
                  <div className="">
                    <div className="text-center">
                      <p className="text-xl mb-2">waiting for data</p>
                      <p className="text-sm opacity-70">Select a History to begin</p>
                      <p className="text-xs opacity-50">Then double-click on the Terrain</p>
                    </div>
                  </div>
                )}
              </div>

          
        </>
    
    </div>
  );
}