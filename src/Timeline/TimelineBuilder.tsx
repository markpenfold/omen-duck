'use client'
import { useEffect, useState, useMemo, useRef } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import { TimelineEvent } from '@/app/store/types';
import { EventCard } from './TimelineEventCard';
import { formatYear} from '../../app/utils/timelineUtils';



export default function TimelineBuilder(){
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);


  const timelineBuilderEvents = useEventStore((state) => state.timelineBuilderEvents);
  const removeFromTimeline = useEventStore((state) => state.removeFromTimeline);

  // ResizeObserver to track container width
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);

    // Set initial width
    setContainerWidth(element.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  // Calculate min/max years from items for positioning
  const itemYearRange = useMemo(() => {
    if (timelineBuilderEvents.length === 0) return null;

    const years = timelineBuilderEvents
      .map((item: TimelineEvent) => item?.date_obj?.year)
      .filter((year: any) => typeof year === 'number');

    if (years.length === 0) return null;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    return {
      min: minYear,
      max: maxYear
    };
  }, [timelineBuilderEvents]);

  // Get the date range - use items range if available, otherwise default
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (itemYearRange) {
      // Add a small buffer (5% on each side) to make the timeline more readable
      const span = itemYearRange.max - itemYearRange.min;
      const buffer = Math.max(Math.floor(span * 0.05), 10); // At least 10 years buffer
      return [itemYearRange.min - buffer, itemYearRange.max + buffer];
    }
    // Default range when no items
    return [0, 2025];
  }, [itemYearRange]);

  // Events are already sorted by year in the store


  return(
    <div className="flex flex-col h-full text-white border-t-2" style={{ borderTopColor: 'rgb(55, 65, 81)' }}>
    
      {isNavOpen && (
        <div className="flex-1 overflow-auto">

          {/* Time scale */}
          <div className="pt-3 pb-2 bg-gray-800 border-b border-gray-600" style={{ paddingLeft: '20px', paddingRight: '40px', overflowX: 'hidden' }}>
            {/* Year labels */}
            <div className="flex justify-between text-xs text-gray-400 mb-1 relative">
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const year = Math.round(rangeStart + (rangeEnd - rangeStart) * fraction);
                return (
                  <div
                    key={fraction}
                    style={{
                      position: 'absolute',
                      left: `${fraction * 100}%`,
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatYear(year)}
                  </div>
                );
              })}
            </div>
            <div className="h-2 bg-gray-900 rounded-full relative mt-5">
              {/* Tick marks */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <div
                  key={fraction}
                  className="absolute top-0 bottom-0 w-px bg-gray-600"
                  style={{ left: `${fraction * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* Drop zone and items */}
          <div
            ref={containerRef}
            className="px-4 pb-4 transition-colors relative"
            style={{
              backgroundColor: '#374151'
            }}
          >
            {/* Zebra stripe background - matches event row height (22px) + marginBottom (1px) = 23px total per row */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 23px, transparent 23px, transparent 46px)',
                backgroundSize: '100% 46px'
              }}
            />

            {timelineBuilderEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm relative z-10">
                  <p>Add events from the EVENTS panel to build your timeline</p>
              </div>
            ) : (
              <div className="relative z-10">
                {timelineBuilderEvents.map((item: TimelineEvent, index: number) => (
                  <div key={item._id || `item-${Math.random()}`} style={{ marginBottom: '1px' }}>
                    <EventCard
                      item={item}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                      onRemove={removeFromTimeline}
                      containerWidth={containerWidth}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}