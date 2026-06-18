'use client'
import { useState, useEffect } from 'react';
import { TimelineEvent } from '@/app/store/types';
import { X, BookUp, NotebookPen, Globe } from 'lucide-react';
import { useEventStore } from '../../app/store/useEventStore';
import { EventRow } from './EventRow';

interface EventCardProps {
    item: TimelineEvent;
    rangeStart: number;
    rangeEnd: number;
    onRemove: (id: string) => void;
    containerWidth?: number;
}

export function EventCard({item, rangeStart, rangeEnd, onRemove, containerWidth = 0}: EventCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const year = item?.date_obj?.year;
    const id = item?._id || `item-${Math.random()}`;
    const rangeSpan = rangeEnd - rangeStart;
    const getCollectionColor = useEventStore(state => state.getCollectionColor);
    const collectionColor = getCollectionColor(item.collection) || '#6b7280';

    // Load notes from localStorage on mount
    useEffect(() => {
      const storageKey = `timeline-notes-${id}`;
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    }, [id]);

    // Save notes to localStorage whenever they change
    useEffect(() => {
      if (notes) {
        const storageKey = `timeline-notes-${id}`;
        localStorage.setItem(storageKey, notes);
      }
    }, [notes, id]);


    ///////////////////////////////////////////////////////////////////
    // Calculate position percentage determine flip  //////////////////
    ///////////////////////////////////////////////////////////////////
    let positionPercent  = 0;
    if (typeof year === 'number' && rangeSpan > 0) {
      positionPercent = ((year - rangeStart) / rangeSpan) * 100;
      positionPercent = Math.max(0, Math.min(100, positionPercent));
    }

    // If position is > 50%, flip to show text on the left side
    const flipToLeft = positionPercent > 50;

    // Calculate max width based on container width and position
    // Card can expand from its position toward the edge it's anchored to
    const calculatedMaxWidth = (containerWidth-20)/2 || 0;

    ///////////////////////////////////////////////////////////////////
    return (
      <div
        key={id}
        className={isExpanded ? 'timeline-card-expanded' : ''}
        style={{
          position: 'relative',
          width: '100%'
        }}
      >
        {/* Positioned event row - starts where the colored border should be */}
        <div
          style={{
            position: 'absolute',
            [flipToLeft ? 'right' : 'left']: flipToLeft ? `${100 - positionPercent}%` : `${positionPercent}%`,
            top: 0,
            maxWidth: `${calculatedMaxWidth}px`,
            minWidth: '0',
            width: 'auto',
            direction: flipToLeft ? 'rtl' : 'ltr'
          }}
        >
          <div style={{ direction: 'ltr' }}>
            <EventRow
              item={item}
              collectionColor={collectionColor}
              showYear={true}
              reversed={flipToLeft}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
              rightButton={
                <>
                  <button
                    onClick={() => {/* TODO: BookUp action */}}
                    className="flex items-center hover:scale-110 transition-transform"
                    aria-label="Book up"
                    style={{ flexShrink: 0 }}
                  >
                    <BookUp size={14} color="#9ca3af" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center hover:scale-110 transition-transform"
                    aria-label="Toggle notes"
                    style={{ flexShrink: 0, cursor: 'pointer' }}
                  >
                    <NotebookPen size={14} color={showNotes ? "#60a5fa" : "#9ca3af"} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => {
                      const yearStr = item.date_obj?.year
                        ? (item.date_obj.year > 0 ? `${item.date_obj.year} AD` : `${Math.abs(item.date_obj.year)} BC`)
                        : '';
                      const searchQuery = `${item.event || 'event'} ${yearStr}`.trim();
                      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                      window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center hover:scale-110 transition-transform"
                    aria-label="Search on Google"
                    style={{ flexShrink: 0, cursor: 'pointer' }}
                  >
                    <Globe size={14} color="#9ca3af" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => onRemove(id)}
                    className="flex items-center hover:scale-110 transition-transform"
                    aria-label="Remove from timeline"
                    style={{ flexShrink: 0 }}
                  >
                    <X size={14} color="#ef4444" strokeWidth={1.5} />
                  </button>
                </>
              }
            />

            {/* Notes section - appears below EventRow when toggled */}
            {showNotes && (
              <div style={{
                backgroundColor: '#2d3748',
                padding: '6px 8px',
                borderTop: '1px solid #1a202c'
              }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    backgroundColor: '#1a202c',
                    color: '#cbd5e0',
                    border: '1px solid #374151',
                    borderRadius: '3px',
                    padding: '6px',
                    fontSize: '9px',
                    fontFamily: 'inherit',
                    lineHeight: '1.3',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Spacer to maintain height - contains full EventRow copy to flow naturally */}
        <div style={{
          visibility: 'hidden',
          pointerEvents: 'none',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <EventRow
            item={item}
            collectionColor="transparent"
            showYear={true}
            reversed={flipToLeft}
            isExpanded={isExpanded}
            onToggleExpand={() => {}} // No-op since this is just for spacing
            rightButton={
              <>
                <button style={{ flexShrink: 0 }} aria-label="Spacer">
                  <BookUp size={14} strokeWidth={1.5} />
                </button>
                <button style={{ flexShrink: 0 }} aria-label="Spacer">
                  <NotebookPen size={14} strokeWidth={1.5} />
                </button>
                <button style={{ flexShrink: 0 }} aria-label="Spacer">
                  <Globe size={14} strokeWidth={1.5} />
                </button>
                <button style={{ flexShrink: 0 }} aria-label="Spacer">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </>
            }
          />

          {/* Notes spacer - matches visible notes section */}
          {showNotes && (
            <div style={{
              backgroundColor: 'transparent',
              padding: '6px 8px',
              borderTop: '1px solid transparent'
            }}>
              <textarea
                disabled
                value={notes}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  backgroundColor: 'transparent',
                  color: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '3px',
                  padding: '6px',
                  fontSize: '9px',
                  fontFamily: 'inherit',
                  lineHeight: '1.3',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
}
