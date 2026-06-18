'use client';
import { useRef } from 'react';
import { useEventStore } from '@/app/store/useEventStore';
import { TimelineEvent } from '../../app/store/types';
import { GraphEventCard } from './GraphEventCard';


const GraphEditor = () => {

  //////////////////////////////////////////////////////////////////////////////////////////
  // Get/set data from store ///////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////
  const timelineBuilderEvents = useEventStore((state) => state.timelineBuilderEvents);
  const removeFromTimeline = useEventStore((state) => state.removeFromTimeline);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflowY: 'auto', backgroundColor:'#1b1b1b'}}>
      {timelineBuilderEvents.map((item: TimelineEvent, index: number) => (
        <GraphEventCard
          key={item._id || `item-${index}`}
          item={item}
          onRemove={removeFromTimeline}
          bg={index % 2 === 0 ? '#2a2a2a' : '#323232'}
        />
      ))}
    </div>
  );
};

export default GraphEditor;