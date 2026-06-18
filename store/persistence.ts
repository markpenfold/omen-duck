// app/store/persistence.ts
// Persistence utilities for loading and restoring saved states

import { EventStore, SavedState, CollectionInfo } from './types';
import { fetchAndTagCollection, mergeAggregates, updateDateRangeFromAggregates } from './storeUtils';

type StoreGet = () => EventStore;
type StoreSet = (partial: Partial<EventStore>) => void;

/**
 * Fetch saved state from a URL
 * Returns null if fetch fails
 */
export async function fetchSavedState(url: string): Promise<SavedState | null> {
  console.log(`📦 Fetching saved state from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch saved state:', response.status);
      return null;
    }
    const data = await response.json();
    // Handle both {state: {...}} wrapper and direct SavedState
    return data.state || data;
  } catch (error) {
    console.error('Error fetching saved state:', error);
    return null;
  }
}

/**
 * Restore persisted collections by fetching aggregate data from API
 * Called after rehydration to rebuild aggregatedEvents from selectedCollections
 */
export async function restoreCollections(
  selectedCollections: CollectionInfo[],
  get: StoreGet,
  set: StoreSet
): Promise<void> {
  if (!selectedCollections || selectedCollections.length === 0) {
    console.log('No collections to restore');
    return;
  }

  console.log(`🔄 Restoring ${selectedCollections.length} persisted collections...`);

  // Reset aggregated events before restoration
  set({ aggregatedEvents: [], nextTimelinePosition: 0 });

  // Re-add each collection in order to rebuild aggregatedEvents
  for (const collection of selectedCollections) {
    try {
      const taggedAggregates = await fetchAndTagCollection(collection.key, collection.position);

      // Merge into existing aggregates
      const { aggregatedEvents, nextTimelinePosition } = get();
      const totalTimelineCount = Math.max(nextTimelinePosition, collection.position + 1);
      const mergedAggregates = mergeAggregates(aggregatedEvents, taggedAggregates, totalTimelineCount);

      set({
        aggregatedEvents: mergedAggregates,
        nextTimelinePosition: totalTimelineCount
      });

      console.log(`✅ Restored collection: ${collection.displayName}`);

    } catch (error) {
      console.error(`Failed to restore collection ${collection.key}:`, error);
    }
  }

  // Update date range after all collections are restored
  const { aggregatedEvents } = get();
  set({ availableDateRange: updateDateRangeFromAggregates(aggregatedEvents) });

  console.log('✅ Collection restoration complete');
}

/**
 * Load state from a URL or SavedState object
 * Applies the saved state and restores collections
 */
export async function loadFromSaved(
  source: string | SavedState,
  get: StoreGet,
  set: StoreSet
): Promise<void> {
  console.log('📦 Loading from saved state...');

  // Mark as not complete while loading
  set({ restorationComplete: false });

  let savedState: SavedState | null;

  // If source is a string, fetch it as a URL
  if (typeof source === 'string') {
    savedState = await fetchSavedState(source);
    if (!savedState) return;
  } else {
    savedState = source;
  }

  console.log('📦 Applying saved state...');
  console.log(`   - Slider year: ${savedState.sliderYear}`);
  console.log(`   - Collections: ${savedState.selectedCollections.map(c => c.displayName).join(', ')}`);
  console.log(`   - Timeline builder events: ${savedState.timelineBuilderEvents.length}`);

  // Apply saved state to store
  set({
    sliderYear: savedState.sliderYear,
    timeUnitSize: savedState.timeUnitSize,
    availableDateRange: savedState.availableDateRange,
    timelineBuilderEvents: savedState.timelineBuilderEvents,
    selectedCollections: savedState.selectedCollections,
    nextTimelinePosition: savedState.nextTimelinePosition,
  });

  // Restore collections (fetch aggregate data from API)
  await restoreCollections(savedState.selectedCollections, get, set);

  // Re-apply sliderYear after restoration (it can get overwritten)
  set({
    sliderYear: savedState.sliderYear,
    restorationComplete: true
  });

  get().updateTerrainData();
  console.log('📦 Load from saved complete, sliderYear:', get().sliderYear);
}
