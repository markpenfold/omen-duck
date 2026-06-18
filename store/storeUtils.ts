import { EventYear,TimelineEvent,} from '../store/types';


export function mergeAggregates(
  existing: EventYear[], 
  incoming: EventYear[],
  totalTimelineCount: number
): EventYear[] {
  const merged = new Map<number, EventYear>();
  
  existing.forEach(agg => {
    const paddedComposition = Array.isArray(agg.composition) 
      ? [...agg.composition] 
      : [];
    
    while (paddedComposition.length < totalTimelineCount) {
      paddedComposition.push(0);
    }
    
    merged.set(agg.year, { 
      year: agg.year,
      events: [...agg.events],
      count: agg.count,
      composition: paddedComposition
    });
  });
  
  incoming.forEach(agg => {
    const existingAgg = merged.get(agg.year);
    
    if (existingAgg) {
      const combined = [...existingAgg.events, ...agg.events];
      const uniqueEvents = Array.from(
        new Map(combined.map(e => [e._id, e])).values()
      );
      
      const newComposition: number[] = Array(totalTimelineCount).fill(0);
      
      uniqueEvents.forEach(event => {
        const timelinePos = event.timelinePosition ?? -1;
        if (timelinePos >= 0 && timelinePos < totalTimelineCount) {
          newComposition[timelinePos]++;
        }
      });
      
      merged.set(agg.year, {
        year: agg.year,
        events: uniqueEvents,
        count: uniqueEvents.length,
        composition: newComposition
      });
    } else {
      const newComposition: number[] = Array(totalTimelineCount).fill(0);
      
      agg.events.forEach(event => {
        const timelinePos = event.timelinePosition ?? -1;
        if (timelinePos >= 0 && timelinePos < totalTimelineCount) {
          newComposition[timelinePos]++;
        }
      });
      
      merged.set(agg.year, {
        year: agg.year,
        events: [...agg.events],
        count: agg.count,
        composition: newComposition
      });
    }
  });
  
  return Array.from(merged.values()).sort((a, b) => a.year - b.year);
}





// Helper function to update date range from aggregates
export function updateDateRangeFromAggregates(aggregates: EventYear[]): [number, number] {
  if (aggregates.length === 0) return [0, 0];
  const startYear = aggregates[0].year;
  const endYear = aggregates[aggregates.length - 1].year;
  return [startYear, endYear];
}

// Helper function to sort timeline events by year
export function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const yearA = a?.date_obj?.year ?? 0;
    const yearB = b?.date_obj?.year ?? 0;
    return yearA - yearB;
  });
}

// Helper function to fetch and tag a collection
export async function fetchAndTagCollection(
  collectionKey: string,
  timelinePosition: number
): Promise<EventYear[]> {
  const response = await fetch(
    `/api/aggregates?${new URLSearchParams({ collection: collectionKey })}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${collectionKey}: ${response.status}`);
  }

  const aggregates = await response.json() as EventYear[];

  return aggregates.map(agg => ({
    ...agg,
    events: agg.events.map(event => ({
      ...event,
      timelinePosition
    }))
  }));
}