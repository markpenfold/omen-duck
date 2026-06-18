import React, { useState } from 'react';
import { TimelineEvent } from '@/app/store/types';
import { useEventStore } from '../../app/store/useEventStore';
import { ChevronDown } from 'lucide-react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

interface EventRowProps {
  item: TimelineEvent;
  collectionColor: string;
  rightButton?: React.ReactNode;
  showYear?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  reversed?: boolean;
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: DraggableAttributes;
}

/**
 * Reusable event row component with consistent styling across the app.
 * Features:
 * - Color-coded left border
 * - Event title with truncation
 * - Expandable additional information section
 * - Customizable right button (e.g., + for add, X for remove)
 */
export function EventRow({ item, collectionColor, rightButton, showYear = false, isExpanded: externalIsExpanded, onToggleExpand, reversed = false, dragListeners, dragAttributes }: EventRowProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const hasInfo = item.additional_information && item.additional_information.trim().length > 0;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  return (
    <div
      style={{
        overflow: 'hidden',
        width: '100%'
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: '22px',
          cursor: 'default',
          flexDirection: reversed ? 'row-reverse' : 'row'
        }}
      >
        {/* Color border (left when normal, right when reversed) */}
        <div
          style={{
            [reversed ? 'borderRight' : 'borderLeft']: `3px solid ${collectionColor}`,
            flexShrink: 0
          }}
        />

        {/* Middle section: event title */}
        <div
          {...dragListeners}
          {...dragAttributes}
          style={{
            backgroundColor: '#2c2c2c',
            flex: 1,
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s',
            minWidth: 0,
            cursor: dragListeners ? 'grab' : 'default'
          }}
          onMouseEnter={(e) => hasInfo && (e.currentTarget.style.backgroundColor = '#3a3a3a')}
          onMouseLeave={(e) => hasInfo && (e.currentTarget.style.backgroundColor = '#2c2c2c')}
        >
          <div style={{
            fontSize: '9px',
            color: '#9ca3af',
            fontWeight: '400',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {showYear && item.date_obj?.year && (
              <span style={{ color: '#60a5fa', marginRight: '4px' }}>
                {item.date_obj.year > 0 ? `${item.date_obj.year} AD` : `${Math.abs(item.date_obj.year)} BC`}
              </span>
            )}
            {item.event || 'Unnamed event'}
          </div>
        </div>

        {/* Action buttons section (right when normal, left when reversed) */}
        <div
          style={{
            backgroundColor: '#3a3a3a',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          {rightButton}

          {hasInfo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronDown
                size={12}
                color="#9ca3af"
                style={{
                  flexShrink: 0,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Accordion content - shows only additional info */}
      {hasInfo && isExpanded && (
        <div style={{
          backgroundColor: '#2d3748',
          padding: '6px 8px',
          fontSize: '9px',
          color: '#cbd5e0',
          lineHeight: '1.3',
          borderTop: '1px solid #1a202c'
        }}>
          {item.additional_information}
        </div>
      )}
    </div>
  );
}
