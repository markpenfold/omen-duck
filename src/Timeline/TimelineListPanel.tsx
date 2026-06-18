// components/TimelineListPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import classes from '../../app/styles/overrides.module.css';
import { getCollectionShortName } from '../../app/utils/collectionNames';
interface TimelineListPanelProps {
  storageKey?: string;
  defaultItems?: string[];
  listView?: boolean;
  showSearch?: boolean;
}

export default function TimelineListPanel({ storageKey, defaultItems, listView = false, showSearch = false }: TimelineListPanelProps) {
  const addCollection = useEventStore((state) => state.addCollection);
  const removeCollection = useEventStore((state) => state.removeCollection);
  const selectedCollections = useEventStore((state) => state.selectedCollections);
  const availableCollections = useEventStore((state) => state.availableCollections);
  const collectionsLoading = useEventStore((state) => state.collectionsLoading);
  const collectionsError = useEventStore((state) => state.collectionsError);
  const fetchAvailableCollections = useEventStore((state) => state.fetchAvailableCollections);
  const [isNavOpen, setIsNavOpen] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'name'>('size');

  // Clear search when search panel is hidden
  useEffect(() => {
    if (!showSearch) setSearchTerm('');
  }, [showSearch]);

  useEffect(() => {
    // Only fetch if we don't have collections yet
    if (availableCollections.length === 0 && !collectionsLoading) {
      console.log('📚 TimelineListPanel: Fetching collections');
      fetchAvailableCollections(100, sortBy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAvailableCollections, sortBy]);

  // ✅ Add this to see what we're getting
  useEffect(() => {
    console.log('📦 Available collections:', availableCollections);
    if (availableCollections.length > 0) {
      console.log('📦 First collection:', availableCollections[0]);
    }
  }, [availableCollections]);

  // ✅ Safe filtering with defensive checks
  const filteredCollections = availableCollections
    .filter(collection => {
      if (!collection) return false;

      const displayName = collection.displayName || '';
      const key = collection.key || '';
      const searchLower = searchTerm.toLowerCase();

      return displayName.toLowerCase().includes(searchLower) ||
             key.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => {
      // Pull selected collections to the top
      const aSelected = selectedCollections.some(c => c.key === a.key);
      const bSelected = selectedCollections.some(c => c.key === b.key);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Sort within same selection category
      if (sortBy === 'size') {
        return (b.eventCount || 0) - (a.eventCount || 0); // Largest first
      } else {
        // Sort by short name (what's displayed) not the raw displayName
        const aName = getCollectionShortName(a.key || '', a.displayName || '');
        const bName = getCollectionShortName(b.key || '', b.displayName || '');
        return aName.localeCompare(bName, undefined, { numeric: true });
      }
    });

  const handleToggle = async (collectionKey: string) => {
    // ✅ Check if collection is selected by looking for key in the array
    const isSelected = selectedCollections.some(c => c.key === collectionKey);
    
    if (isSelected) {
      console.log('🗑️ Removing collection:', collectionKey);
      removeCollection(collectionKey);
    } else {
      console.log('➕ Adding collection:', collectionKey);
      await addCollection(collectionKey);
    }
  };

  // Render list view (for tabbed panel)
  if (listView) {
    return (
      <div className="flex flex-col h-full bg-gray-800">
        {/* Search bar - shown when toggled from menubar */}
        {showSearch && (
          <div className="px-2 py-1.5 flex gap-2 items-center bg-gray-900/50 border-b border-gray-800">
            <input
              type="text"
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="flex-1 px-2 py-1 bg-gray-800/50 text-gray-300 border border-gray-700 rounded text-xs focus:border-gray-600 focus:outline-none placeholder-gray-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'size' | 'name')}
              className="px-2 py-1 bg-gray-800/50 text-gray-400 border border-gray-700 rounded text-xs"
            >
              <option value="size">Size</option>
              <option value="name">Name</option>
            </select>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {collectionsLoading && (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-pulse">Loading collections...</div>
            </div>
          )}
          
          {collectionsError && (
            <div className="text-center text-red-400 py-8">
              <div className="font-semibold">Error loading collections</div>
              <div className="text-sm mt-2">{collectionsError}</div>
            </div>
          )}
          
          {!collectionsLoading && !collectionsError && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '4px'
            }}>
              {filteredCollections.map((collection, index) => {
                const key = collection.key || 'unknown';
                const displayName = collection.displayName || 'Unnamed Collection';
                const shortName = getCollectionShortName(key, displayName);
                const eventCount = collection.eventCount || 0;
                const yearRange = collection.yearRange || null;

                const isSelected = selectedCollections.some(c => c.key === key);
                const selectedCollection = selectedCollections.find(c => c.key === key);
                const collectionColor = selectedCollection?.color;

                // Format year range for compact display
                const yearRangeStr = yearRange && yearRange.min !== null && yearRange.max !== null
                  ? `${formatYear(yearRange.min)} - ${formatYear(yearRange.max)}`
                  : '';

                // Zebra striping
                const isEven = index % 2 === 0;
                const baseColor = isEven ? '#111827' : '#1f2937';

                return (
                  <button
                    key={key}
                    onClick={() => handleToggle(key)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '2px',
                      border: '1px solid #4b5563',
                      borderLeft: isSelected ? `3px solid ${collectionColor || '#3b82f6'}` : '1px solid #4b5563',
                      backgroundColor: isSelected ? `${collectionColor || '#3b82f6'}10` : baseColor,
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#6b7280';
                        e.currentTarget.style.backgroundColor = '#4b5563';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#4b5563';
                        e.currentTarget.style.backgroundColor = baseColor;
                      }
                    }}
                  >
                    {/* All info on one line */}
                    <div style={{
                      fontWeight: '300',
                      color: '#e5e7eb',
                      fontSize: '10px',
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: '400' }}>{shortName}</span>
                      {yearRangeStr && (
                        <>
                          <span style={{ color: '#6b7280' }}>•</span>
                          <span style={{ color: '#9ca3af', fontSize: '9px' }}>{yearRangeStr}</span>
                        </>
                      )}
                      <span style={{ color: '#6b7280' }}>•</span>
                      <span style={{ color: '#9ca3af', fontSize: '9px' }}>{eventCount.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {!collectionsLoading && filteredCollections.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              {searchTerm ? (
                <>
                  <div>No collections found matching</div>
                  <div className="font-semibold mt-1">"{searchTerm}"</div>
                </>
              ) : (
                <div>No collections available</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original grid view (for full-screen panel)
  return (
    <>
    <div className="flex-shrink-0 text-white border-t-2 border-gray-600">
      

      {/* Panel content */}
      <div className="flex flex-col">
        {/* Controls */}
        <div className="p-2 flex gap-2 items-center bg-gray-800">
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'size' | 'name')}
            className="px-3 py-1 text-white rounded border border-gray-600 text-sm"
          >
            <option value="size">By Size</option>
            <option value="name">By Name</option>
          </select>
        </div>


{/* Collapsible content */}
        {isNavOpen && (
          <div className="pt-4 pb-4 px-4">
             {/* Scrollable Grid Content */}
        <div className={`${classes.tlpanel} p-4`} >
          {collectionsLoading && (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-pulse">Loading collections...</div>
            </div>
          )}
          
          {collectionsError && (
            <div className="text-center text-red-400 py-8">
              <div className="font-semibold">Error loading collections</div>
              <div className="text-sm mt-2">{collectionsError}</div>
            </div>
          )}
          
          {!collectionsLoading && !collectionsError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredCollections.map((collection, index) => {
                // ✅ Defensive checks for each property
                const key = collection.key || 'unknown';
                const displayName = collection.displayName || 'Unnamed Collection';
                const description = collection.description || null;
                const eventCount = collection.eventCount || 0;
                const yearRange = collection.yearRange || null;
                const author = collection.author || null;
                const source = collection.source || null;

                // ✅ Check if selected by looking for key in selectedCollections array
                const isSelected = selectedCollections.some(c => c.key === key);

                // ✅ Get color if selected
                const selectedCollection = selectedCollections.find(c => c.key === key);
                const collectionColor = selectedCollection?.color;

                // Format year range for compact display
                const yearRangeStr = yearRange && yearRange.min !== null && yearRange.max !== null
                  ? `${formatYear(yearRange.min)} - ${formatYear(yearRange.max)}`
                  : '';

                // Zebra striping
                const isEven = index % 2 === 0;
                const baseColorClass = isEven ? 'bg-gray-900' : 'bg-gray-800';
                const hoverColorClass = isEven ? 'hover:bg-gray-750' : 'hover:bg-gray-700';

                return (
                  <button
                    key={key}
                    onClick={() => handleToggle(key)}
                    className={`
                      relative p-3 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-900/50 shadow-lg'
                        : `border-gray-600 ${baseColorClass} hover:border-gray-500 ${hoverColorClass}`
                      }
                    `}
                    style={isSelected && collectionColor ? {
                      borderColor: collectionColor,
                    } : {}}
                  >
                    {/* Checkmark for selected items */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: collectionColor || '#22c55e'
                        }}
                      >
                        <span className="text-white font-bold text-sm">✓</span>
                      </div>
                    )}

                    <div className="pr-8">
                      {/* Display name */}
                      <div className="font-medium text-white text-sm mb-1 line-clamp-2">
                        {displayName}
                      </div>

                      {/* Compact stats on one line */}
                      <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap mb-1">
                        <span>{eventCount.toLocaleString()} events</span>
                        {yearRangeStr && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500">{yearRangeStr}</span>
                          </>
                        )}
                      </div>

                      {/* Description (if available) */}
                      {description && (
                        <div className="text-xs text-gray-400 mb-1 line-clamp-2">
                          {description}
                        </div>
                      )}

                      {/* Author/Source (if available) */}
                      {(author || source) && (
                        <div className="text-xs text-gray-500 mt-1 border-t border-gray-700 pt-1">
                          {author && (
                            <div className="truncate">✍️ {author}</div>
                          )}
                          {source && (
                            <div className="truncate">🔗 Source</div>
                          )}
                        </div>
                      )}

                      {/* Key (for debugging/reference) */}
                      <div className="text-xs text-gray-600 mt-1 font-mono truncate">
                        {key}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {!collectionsLoading && filteredCollections.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              {searchTerm ? (
                <>
                  <div>No collections found matching</div>
                  <div className="font-semibold mt-1">"{searchTerm}"</div>
                </>
              ) : (
                <div>No collections available</div>
              )}
            </div>
          )}
        </div>
          </div>
        )}

        </div>
      </div>
    </>
  );
}

/**
 * Format year for display
 */
function formatYear(year: number): string {
  if (year < -1000000000) {
    return `${(Math.abs(year) / 1000000000).toFixed(2)}B BC`;
  } else if (year < -1000000) {
    return `${(Math.abs(year) / 1000000).toFixed(1)}M BC`;
  } else if (year < 0) {
    return `${Math.abs(year).toLocaleString()} BC`;
  }
  return `${year.toLocaleString()} AD`;
}