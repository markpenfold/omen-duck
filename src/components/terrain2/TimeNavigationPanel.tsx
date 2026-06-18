import React, { useState } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import DensityGraph from './DensityGraph';
import { Pyramid, SquareChevronDown } from 'lucide-react';

/**
 * TimeNavigationPanel Component
 *
 * Self-contained time navigation panel with:
 * - MenuBar with collapsible pyramid toggle
 * - DensityGraph for timeline visualization
 * - Accordion-style show/hide functionality
 * - Draggable resize handle (mobile only)
 */
interface TimeNavigationPanelProps {
  isMobile?: boolean;
  onResizeStart?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export default function TimeNavigationPanel({ isMobile = false, onResizeStart }: TimeNavigationPanelProps) {
  const [isTimeNavOpen, setIsTimeNavOpen] = useState(true);
  const eventData = useEventStore((state) => state.aggregatedEvents);
  const hasTimeline = eventData && eventData.length > 0;
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  return (
    <div className="flex-shrink-0 text-white border-t-2" style={{ borderTopColor: 'rgb(55, 65, 81)' }}>
      {/* Draggable resize handle - mobile only */}
      {isMobile && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          onTouchStart={onResizeStart}
          onMouseEnter={() => setIsHoveringHandle(true)}
          onMouseLeave={() => setIsHoveringHandle(false)}
          style={{
            height: '8px',
            background: isHoveringHandle ? '#3b82f6' : '#4b5563',
            cursor: 'row-resize',
            transition: 'background 0.2s',
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none'
          }}
        >
          {/* Visual indicator */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px'
          }} />
        </div>
      )}
      <div>
        
        
        {/* Collapsible content */}
        {isTimeNavOpen && (
          <div className=" px-2">
            {hasTimeline ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <DensityGraph />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 opacity-50 text-white">
                No timeline loaded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}