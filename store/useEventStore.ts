import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EventStore, TimelineEvent, EventYear, DateObj, CollectionMetadata, CollectionInfo, HoverInfo, EventLink, SavedState } from './types';
import { COLLECTION_COLORS_T6 } from '../../app/utils/constants';
import { getCollectionShortName } from '../utils/collectionNames';
import { mergeAggregates, updateDateRangeFromAggregates, sortTimelineEvents, fetchAndTagCollection } from './storeUtils';
import { loadFromSaved as loadFromSavedUtil, restoreCollections } from './persistence';



export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({

      //////////////////////////////////////////////////////////////////////////
      // INITIAL STATE VALUES
      //////////////////////////////////////////////////////////////////////////
      selectedCollections: [],
      aggregatedEvents: [],
      availableDateRange: [0, 0],
      sliderYear: 0,
      timeUnitSize: 1,
      availableCollections: [],
      collectionsLoading: false,
      collectionsError: null,
      latestClickedEvents: [],
      timelineBuilderEvents: [],
      nextTimelinePosition: 0,
      terrainData: [],
      restorationComplete: false,

      //////////////////////////////////////////////////////////////////////////
      // TERRAIN DATA - generates data for the 3D terrain visualization
      //////////////////////////////////////////////////////////////////////////
      updateTerrainData: () => {
        const { aggregatedEvents, selectedCollections, sliderYear, timeUnitSize } = get();
        const vertexCount = 1024;
        
        const timelineData: number[][] = [];
        
        for (let i = 0; i < vertexCount; i++) {
          const targetYear = sliderYear + (i * timeUnitSize);
          const aggregate = aggregatedEvents.find(a => a.year === targetYear);
          
          if (aggregate) {
            timelineData.push([targetYear, ...aggregate.composition]);
          } else {
            timelineData.push([targetYear, ...new Array(selectedCollections.length).fill(0)]);
          }
        }
        
       // console.log("🔄 Setting terrain data:", timelineData.length, "entries");
        set({ terrainData: timelineData });
      },

      //////////////////////////////////////////////////////////////////////////
      // COLLECTION MANAGEMENT - fetch, add, remove collections
      //////////////////////////////////////////////////////////////////////////
      fetchAvailableCollections: async (limit = 100, sortBy = 'size') => {
        set({ collectionsLoading: true, collectionsError: null });

        const maxRetries = 3;
        const baseDelay = 500; // ms

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch('/api/aggregates?list=true');

            if (!response.ok) {
              throw new Error(`Failed to fetch collections: ${response.status}`);
            }

            const data = await response.json();

            console.log(`✅ Loaded ${data.collections.length} collections`);

            let collections = data.collections;
            if (sortBy === 'name') {
              collections = [...collections].sort((a, b) =>
                a.displayName.localeCompare(b.displayName)
              );
            }

            collections = collections.slice(0, limit);

            set({
              availableCollections: collections,
              collectionsLoading: false
            });
            return; // Success, exit the retry loop

          } catch (error) {
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);

            if (attempt < maxRetries) {
              // Wait before retrying with exponential backoff
              const delay = baseDelay * Math.pow(2, attempt - 1);
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Final attempt failed
              console.error('Error fetching collections after retries:', error);
              set({
                collectionsLoading: false,
                collectionsError: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
      },

      addCollection: async (collectionKey: string) => {
        const { selectedCollections, aggregatedEvents, availableCollections, nextTimelinePosition } = get();

        if (selectedCollections.some(c => c.key === collectionKey)) {
          console.warn(`Collection "${collectionKey}" is already selected`);
          return;
        }

        console.log('🔍 Adding collection:', collectionKey, 'at position:', nextTimelinePosition);

        try {
          const taggedAggregates = await fetchAndTagCollection(collectionKey, nextTimelinePosition);
          console.log('📊 Received', taggedAggregates.length, 'years');

          const totalTimelineCount = nextTimelinePosition + 1;
          const mergedAggregates = mergeAggregates(aggregatedEvents, taggedAggregates, totalTimelineCount);

          const assignedColor = COLLECTION_COLORS_T6[nextTimelinePosition % COLLECTION_COLORS_T6.length];

          const collectionMeta = availableCollections.find(c => c.key === collectionKey);
          const fullDisplayName = collectionMeta?.displayName || collectionKey;
          const displayName = getCollectionShortName(collectionKey, fullDisplayName);

          const collectionInfo: CollectionInfo = {
            key: collectionKey,
            displayName: displayName,
            color: assignedColor,
            position: nextTimelinePosition
          };

          console.log('🎨 Assigned color:', assignedColor, 'at position:', nextTimelinePosition, 'to', displayName);

          const isFirstCollection = selectedCollections.length === 0;

          set({
            selectedCollections: [...selectedCollections, collectionInfo],
            aggregatedEvents: mergedAggregates,
            nextTimelinePosition: nextTimelinePosition + 1,
            availableDateRange: updateDateRangeFromAggregates(mergedAggregates)
          });

          if (isFirstCollection && mergedAggregates.length > 0) {
            set({ sliderYear: mergedAggregates[0].year });
            console.log('📅 Initial date range:', get().availableDateRange);
          }

          get().updateTerrainData();
          console.log('✅ addCollection completed');

        } catch (error) {
          console.error(`Error adding collection "${collectionKey}":`, error);
        }
      },

      removeCollection: (collectionKey: string) => {
        const { selectedCollections, aggregatedEvents } = get();
        
        const collectionToRemove = selectedCollections.find(c => c.key === collectionKey);
        if (!collectionToRemove) {
          console.warn(`Collection "${collectionKey}" is not selected`);
          return;
        }

        console.log('🗑️ Removing collection:', collectionKey, 'at position:', collectionToRemove.position);

        const remainingCollections = selectedCollections.filter(c => c.key !== collectionKey);
        
        if (remainingCollections.length === 0) {
          get().reset();
          return;
        }

        const positionMap = new Map();
        remainingCollections.forEach((col, newIndex) => {
          positionMap.set(col.position, newIndex);
        });

        const renormalizedCollections = remainingCollections.map((col, index) => ({
          ...col,
          position: index,
          color: COLLECTION_COLORS_T6[index % COLLECTION_COLORS_T6.length] 
        }));

        const remappedAggregates = aggregatedEvents.map(agg => {
          const remappedEvents = agg.events
            .filter(event => event.timelinePosition !== collectionToRemove.position)
            .map(event => ({
              ...event,
              timelinePosition: positionMap.get(event.timelinePosition) ?? event.timelinePosition
            }));

          if (remappedEvents.length === 0) {
            return null;
          }

          const newComposition = new Array(renormalizedCollections.length).fill(0);
          remappedEvents.forEach(event => {
            const pos = event.timelinePosition;
            if (pos >= 0 && pos < newComposition.length) {
              newComposition[pos]++;
            }
          });

          return {
            year: agg.year,
            events: remappedEvents,
            count: remappedEvents.length,
            composition: newComposition
          };
        }).filter(agg => agg !== null);

        console.log('✅ Renormalized to', renormalizedCollections.length, 'collections');

        set({
          selectedCollections: renormalizedCollections,
          aggregatedEvents: remappedAggregates,
          nextTimelinePosition: renormalizedCollections.length,
          availableDateRange: updateDateRangeFromAggregates(remappedAggregates)
        });
        get().updateTerrainData();
      },

      //////////////////////////////////////////////////////////////////////////
      // VIEW CONTROLS - slider year, time unit, clicked events
      //////////////////////////////////////////////////////////////////////////
      setSliderYear: (year: number) => {
        set({ sliderYear: year });
        get().updateTerrainData();
      },

      setTimeUnitSize: (size: number) => {
        set({ timeUnitSize: size });
        get().updateTerrainData();
      },

      setLatestClickedEvents: (year: number) => {
        const { aggregatedEvents } = get();

        const aggregate = aggregatedEvents.find(a => a.year === year);

        if (!aggregate || aggregate.events.length === 0) {
          console.log(`No events in year ${year}`);
          return;
        }

        console.log(`Latest clicked: ${aggregate.events.length} events from year ${year}`);

        set({ latestClickedEvents: [...aggregate.events] });
      },

      //////////////////////////////////////////////////////////////////////////
      // TIMELINE BUILDER - add/remove events from the timeline
      //////////////////////////////////////////////////////////////////////////
      addToTimeline: (event: TimelineEvent) => {
        const { timelineBuilderEvents } = get();

        // Check if event is already in timeline
        if (timelineBuilderEvents.some(e => e._id === event._id)) {
          console.log(`Event ${event._id} is already in timeline`);
          return;
        }

        console.log(`➕ Adding event to timeline: ${event.event} (${event.date_obj.year})`);
        const updated = sortTimelineEvents([...timelineBuilderEvents, event]);
        set({ timelineBuilderEvents: updated });
      },

      removeFromTimeline: (eventId: string) => {
        const { timelineBuilderEvents } = get();

        const filtered = timelineBuilderEvents.filter(e => e._id !== eventId);

        if (filtered.length === timelineBuilderEvents.length) {
          console.log(`Event ${eventId} not found in timeline`);
          return;
        }

        // Also clean up any links pointing TO the deleted event
        // Handle both old string format and new EventLink format
        const cleaned = filtered.map(event => {
          if (event.linkedTo && event.linkedTo.some(link => {
            const targetId = typeof link === 'string' ? link : link.targetId;
            return targetId === eventId;
          })) {
            return {
              ...event,
              linkedTo: event.linkedTo.filter(link => {
                const targetId = typeof link === 'string' ? link : link.targetId;
                return targetId !== eventId;
              })
            };
          }
          return event;
        });

        console.log(`➖ Removing event from timeline: ${eventId}`);
        set({ timelineBuilderEvents: cleaned });
      },

      //////////////////////////////////////////////////////////////////////////
      // EVENT METADATA - notes, graph positions, links
      //////////////////////////////////////////////////////////////////////////
      updateEventNote: (eventId: string, note: string) => {
        const { timelineBuilderEvents } = get();

        const updated = sortTimelineEvents(timelineBuilderEvents.map(event =>
          event._id === eventId
            ? { ...event, userNote: note }
            : event
        ));

        set({ timelineBuilderEvents: updated });
        console.log(`📝 Updated note for event ${eventId}`);
      },

      updateEventGraphPosition: (eventId: string, x: number, y: number, z: number) => {
        const { timelineBuilderEvents } = get();

        const updatedEvents = sortTimelineEvents(timelineBuilderEvents.map(event => {
          if (event._id === eventId) {
            return {
              ...event,
              graphNodePosition: { x, y, z }
            };
          }
          return event;
        }));

        set({ timelineBuilderEvents: updatedEvents });
        console.log(`📍 Saved graph position for event ${eventId}: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
      },

      updateEventLinks: (eventId: string, linkedTo: EventLink[]) => {
        const { timelineBuilderEvents } = get();

        const updated = sortTimelineEvents(timelineBuilderEvents.map(event =>
          event._id === eventId
            ? { ...event, linkedTo }
            : event
        ));

        set({ timelineBuilderEvents: updated });
        console.log(`🔗 Updated links for event ${eventId}:`, linkedTo);
      },

      addEventLink: (sourceId: string, targetId: string, linkType: string = 'contributing_factor', weight: number = 0) => {
        const { timelineBuilderEvents } = get();
        const maxDuplicateLinks = 4;

        const updated = sortTimelineEvents(timelineBuilderEvents.map(event => {
          if (event._id === sourceId) {
            const currentLinks = event.linkedTo || [];
            // Count links to the same target (regardless of type)
            // Handle both old string format and new EventLink format
            const count = currentLinks.filter(link => {
              const tid = typeof link === 'string' ? link : link.targetId;
              return tid === targetId;
            }).length;
            if (count < maxDuplicateLinks) {
              const newLink = { targetId, linkType, weight };
              return { ...event, linkedTo: [...currentLinks, newLink] };
            }
          }
          return event;
        }));

        set({ timelineBuilderEvents: updated });
        console.log(`🔗 Added link: ${sourceId} -> ${targetId} (${linkType}, weight: ${weight})`);
      },

      removeEventLink: (sourceId: string, targetId: string, linkType?: string) => {
        const { timelineBuilderEvents } = get();

        const updated = sortTimelineEvents(timelineBuilderEvents.map(event => {
          if (event._id === sourceId) {
            const currentLinks = event.linkedTo || [];
            // Handle both old string format and new EventLink format
            if (linkType) {
              const indexToRemove = currentLinks.findIndex(link => {
                const tid = typeof link === 'string' ? link : link.targetId;
                const lt = typeof link === 'string' ? 'contributing_factor' : link.linkType;
                return tid === targetId && lt === linkType;
              });
              if (indexToRemove >= 0) {
                const newLinks = [...currentLinks];
                newLinks.splice(indexToRemove, 1);
                return { ...event, linkedTo: newLinks };
              }
            } else {
              // Remove first link to this target
              const indexToRemove = currentLinks.findIndex(link => {
                const tid = typeof link === 'string' ? link : link.targetId;
                return tid === targetId;
              });
              if (indexToRemove >= 0) {
                const newLinks = [...currentLinks];
                newLinks.splice(indexToRemove, 1);
                return { ...event, linkedTo: newLinks };
              }
            }
          }
          return event;
        }));

        set({ timelineBuilderEvents: updated });
        console.log(`🔗 Removed link: ${sourceId} -> ${targetId}${linkType ? ` (${linkType})` : ''}`);
      },

      updateEventLinkWeight: (sourceId: string, targetId: string, linkType: string, weight: number) => {
        const { timelineBuilderEvents } = get();

        const updated = sortTimelineEvents(timelineBuilderEvents.map(event => {
          if (event._id === sourceId) {
            const currentLinks = event.linkedTo || [];
            // Find the matching link and update its weight
            const updatedLinks = currentLinks.map(link => {
              if (typeof link === 'string') return link;
              if (link.targetId === targetId && link.linkType === linkType) {
                return { ...link, weight };
              }
              return link;
            });
            return { ...event, linkedTo: updatedLinks };
          }
          return event;
        }));

        set({ timelineBuilderEvents: updated });
        //console.log(`⚖️ Updated weight: ${sourceId} -> ${targetId} (${linkType}) = ${weight}`);
      },

      //////////////////////////////////////////////////////////////////////////
      // PERSISTENCE - restore collections from localStorage
      //////////////////////////////////////////////////////////////////////////
      restorePersistedCollections: async () => {
        const { selectedCollections } = get();
        await restoreCollections(selectedCollections, get, set);
        get().updateTerrainData();
      },

      //////////////////////////////////////////////////////////////////////////
      // LOAD FROM SAVED - load state from URL or SavedState object
      //////////////////////////////////////////////////////////////////////////
      loadFromSaved: async (source: string | SavedState) => {
        await loadFromSavedUtil(source, get, set);
      },

      //////////////////////////////////////////////////////////////////////////
      // UTILITIES - color lookup, reset
      //////////////////////////////////////////////////////////////////////////
      getCollectionColor: (collectionKey: string) => {
        const { selectedCollections } = get();
        const collection = selectedCollections.find(c => c.key === collectionKey);
        return collection ? collection.color : null;
      },

      reset: () => {
        set({
          selectedCollections: [],
          aggregatedEvents: [],
          availableDateRange: [0, 0],
          sliderYear: 0,
          timeUnitSize: 1,
          latestClickedEvents: [],
          timelineBuilderEvents: [],
          nextTimelinePosition: 0,
          terrainData: [] // Also reset terrain data
        });
      }
    }),
    {
      name: 'terrain-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Persist only UI state and metadata - not the heavy data
      partialize: (state) => ({
        sliderYear: state.sliderYear,
        timeUnitSize: state.timeUnitSize,
        availableDateRange: state.availableDateRange,
        timelineBuilderEvents: state.timelineBuilderEvents, // Includes user notes, linkedTo arrays, and graph positions
        selectedCollections: state.selectedCollections, // Includes keys, colors, positions
        nextTimelinePosition: state.nextTimelinePosition,
      }),

      // Re-fetch collection data after rehydration
      // Note: Cannot use createRehydrateHandler here due to circular reference during initialization
      onRehydrateStorage: () => {
        return async (state) => {
          if (state && state.selectedCollections.length > 0) {
            console.log('🔄 Restoring state from localStorage...');
            console.log(`   - Slider year: ${state.sliderYear}`);
            console.log(`   - Collections: ${state.selectedCollections.map(c => c.displayName).join(', ')}`);
            console.log(`   - Timeline builder events: ${state.timelineBuilderEvents.length}`);

            // Re-fetch all collection data using the state's method
            await state.restorePersistedCollections();

            // Re-apply sliderYear after restoration and mark complete
            useEventStore.setState({
              sliderYear: state.sliderYear,
              restorationComplete: true
            });
            useEventStore.getState().updateTerrainData();
          } else if (state) {
            // No localStorage data - load demo data if available
            const DEMO_DATA_URL = '/datasets/demodata.json';
            console.log('📦 No localStorage data, attempting to load demo state...');
            try {
              await useEventStore.getState().loadFromSaved(DEMO_DATA_URL);
            } catch (error) {
              console.log('No demo data available, starting fresh');
              // Defer to avoid accessing store before initialization completes
              setTimeout(() => {
                useEventStore.setState({ restorationComplete: true });
              }, 0);
            }
          }
        };
      }
    }
  )
);