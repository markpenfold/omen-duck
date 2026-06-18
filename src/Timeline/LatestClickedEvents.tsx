import classes from '../../app/styles/overrides.module.css'
import { useEventStore } from '../../app/store/useEventStore';
import type {TimelineEvent} from '../../app/store/types'
import { Plus } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { EventRow } from './EventRow';

type SortOption = 'timeline' | 'alphabetic' | 'random' | 'collection' | 'reverse-timeline' | 'event-type';

interface LatestClickedEventsProps {
  expandAll?: boolean;
  isMobile?: boolean;
}

export default function LatestClickedEvents({ expandAll, isMobile = false }: LatestClickedEventsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('random');
  const [isOpen, setIsOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const latestClickedEvents = useEventStore((state) => state.latestClickedEvents);
  const timelineBuilderEvents = useEventStore((state) => state.timelineBuilderEvents);
  const addToTimeline = useEventStore((state) => state.addToTimeline);
  const removeFromTimeline = useEventStore((state) => state.removeFromTimeline);
  const getCollectionColor = useEventStore(state => state.getCollectionColor);
  const selectedCollections = useEventStore(state => state.selectedCollections);

  const toggleEventSelection = (event: TimelineEvent) => {
    // Check if event is already in timeline
    const isAdded = timelineBuilderEvents.some(e => e._id === event._id);

    if (isAdded) {
      removeFromTimeline(event._id);
    } else {
      addToTimeline(event);
    }
  };

  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Sync expandAll prop with expandedItems
  useEffect(() => {
    if (expandAll !== undefined && latestClickedEvents) {
      if (expandAll) {
        // Expand all items
        setExpandedItems(new Set(latestClickedEvents.map(e => e._id)));
      } else {
        // Collapse all items
        setExpandedItems(new Set());
      }
    }
  }, [expandAll, latestClickedEvents]);


  // Sort events based on selected option
  const sortedEvents = useMemo(() => {
    if (!latestClickedEvents || latestClickedEvents.length === 0) return [];
    
    const events = [...latestClickedEvents];
    
    switch (sortBy) {
      case 'timeline':
        return events.sort((a, b) => a.date_obj.year - b.date_obj.year);
      
      case 'reverse-timeline':
        return events.sort((a, b) => b.date_obj.year - a.date_obj.year);
      
      case 'alphabetic':
        return events.sort((a, b) => {
          const nameA = (a.event || 'Unnamed event').toLowerCase();
          const nameB = (b.event || 'Unnamed event').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      
      case 'collection':
        return events.sort((a, b) => {
          if (a.collection === b.collection) {
            return a.date_obj.year - b.date_obj.year;
          }
          const collA = selectedCollections.find(c => c.key === a.collection);
          const collB = selectedCollections.find(c => c.key === b.collection);
          const nameA = collA?.displayName || a.collection;
          const nameB = collB?.displayName || b.collection;
          return nameA.localeCompare(nameB);
        });
      
      case 'event-type':
        return events.sort((a, b) => {
          if (a.event_type === b.event_type) {
            return a.date_obj.year - b.date_obj.year;
          }
          return (a.event_type || '').localeCompare(b.event_type || '');
        });
      
      case 'random':
        return events.sort(() => Math.random() - 0.5);
      
      default:
        return events;
    }
  }, [latestClickedEvents, sortBy, selectedCollections]);

  // Render empty state
  if (!latestClickedEvents || latestClickedEvents.length === 0) {
    return (
      <div className="flex flex-col h-full w-full text-white">

        {isOpen && <div className={classes.nodata}>
          <div className="text-center">
          <p className="text-sm opacity-70">No Data</p>
          <p className="text-sm opacity-70">Double-click on a Terrain to begin</p>
          </div>
          </div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full text-white">

      {isOpen && (
        <div className="flex-1 text-white" style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>
            <div style={{
              display: isMobile ? 'grid' : 'flex',
              gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(200px, 1fr))' : undefined,
              flexDirection: !isMobile ? 'column' : undefined,
              gap: '1px',
              width: '100%'
            }}>
              {sortedEvents.map((item: TimelineEvent) => {
                const isAdded = timelineBuilderEvents.some(e => e._id === item._id);
                const collectionColor = getCollectionColor(item.collection) || '#ffffff';
                const isExpanded = expandedItems.has(item._id);

                return (

                    <EventRow
                      key={item._id}
                      item={item}
                      collectionColor={collectionColor}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleItemExpand(item._id)}
                      rightButton={
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEventSelection(item);
                          }}
                          className="flex items-center transition-opacity hover:opacity-80"
                          aria-label={isAdded ? "Remove from timeline" : "Add to timeline"}
                          style={{ flexShrink: 0 }}
                        >
                          <Plus
                            color={isAdded ? "#22c55e" : "#ef4444"}
                            size={14}
                            strokeWidth={1.5}
                            style={{
                              transition: 'color 0.3s ease'
                            }}
                          />
                        </button>
                      }
                    />
     
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}