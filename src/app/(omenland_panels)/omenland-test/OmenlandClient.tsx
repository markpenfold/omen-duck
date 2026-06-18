// app/(omenland_panels)/omenland-test/OmenlandClient.tsx
'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useEventStore } from '../../../../store/useEventStore';
import { SimpleHUD } from '@/components/terrain2/CollHud';
import LayoutPanel from '@/components/layout/LayoutPanel';
import { Maximize2, Minimize2, Mountain, Pyramid, SquareChartGantt, Library, Search, Save, Import, Trash2 } from 'lucide-react';
import { SavedState } from '../../../../store/types';
import classes from '../../../components/layout/panel.module.css';
import DensityGraph from '@/components/terrain2/DensityGraph';
import { TerrainPanel } from '@/components/terrain2/TerrainPanel';
import TabbedEventsPanel from '@/Timeline/TabbedEventsPanel';
import TimelineBuilder from '@/Timeline/TimelineBuilder';
import GraphModel from '@/components/graph/GraphModel';
import Footer from '@/components/layout/footer';

export default function OmenlandClient({ user }: { user?: User }) {
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'histories' | 'events'>('histories');
  const [terrainFullscreen, setTerrainFullscreen] = useState(false);
  const [showLibrarySearch, setShowLibrarySearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestClickedEvents = useEventStore((state) => state.latestClickedEvents);
  const addToTimeline = useEventStore((state) => state.addToTimeline);
  const getCollectionColor = useEventStore(state => state.getCollectionColor);
  const eventData = useEventStore((state) => state.aggregatedEvents);
  const selectedCollections = useEventStore((state) => state.selectedCollections);
  const loadFromSaved = useEventStore((state) => state.loadFromSaved);
  const reset = useEventStore((state) => state.reset);

  const hasTimeline = eventData && eventData.length > 0;

  /////////////////////////////////////////////////////////////////////////
  //// Escape full screen mode for the terrain panel                   ////
  /////////////////////////////////////////////////////////////////////////
  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setTerrainFullscreen(false);
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, []);


  /////////////////////////////////////////////////////////////////////////
  //// Switch to Events tab when terrain is double-clicked with events ////
  /////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    if (latestClickedEvents && latestClickedEvents.length > 0) {
      setActiveTab('events');
    }
  }, [latestClickedEvents]);

  /////////////////////////////////////////////////////////////////////////
  // Detect screen size
  /////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      setActiveId(null);
    };
  }, []);

  

const handleTabChange = (tab: 'histories' | 'events') => {
   setActiveTab(tab);
  };

  // Helper to format year with AD/BC
  const formatYear = (year: number): string => {
    if (year < 0) {
      return `${Math.abs(year)} BC`;
    }
    return `${year} AD`;
  };

  // Handle loading state from JSON file
  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const savedState: SavedState = json.state || json;
        await loadFromSaved(savedState);
      } catch (error) {
        console.error('Failed to load state from file:', error);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be loaded again
    event.target.value = '';
  };

  // Handle saving current state to JSON file
  const handleSave = () => {
    const state = useEventStore.getState();
    const savedState: SavedState = {
      sliderYear: state.sliderYear,
      timeUnitSize: state.timeUnitSize,
      availableDateRange: state.availableDateRange,
      timelineBuilderEvents: state.timelineBuilderEvents,
      selectedCollections: state.selectedCollections,
      nextTimelinePosition: state.nextTimelinePosition,
    };
    const json = JSON.stringify({ state: savedState, version: 1 }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omenland-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle clearing localStorage and resetting interface
  const handleClear = () => {
    if (confirm('Clear all data and reset the interface?')) {
      localStorage.removeItem('event-store');
      reset();
      window.location.reload();
    }
  };

  // Compute events tab label with year from clicked events
  const eventsTabLabel = (() => {
    if (!latestClickedEvents || latestClickedEvents.length === 0) return 'EVENTS';

    const years = latestClickedEvents
      .map(e => e.date_obj?.year ?? e.base_date)
      .filter((year): year is number => typeof year === 'number');

    if (years.length === 0) return 'EVENTS';

    // Use the first event's year (they're typically from the same click/period)
    const year = years[0];
    return <>EVENTS - <span style={{ color: '#f87171' }}>{formatYear(year)}</span></>;
  })();

  const activeEvent = activeId
    ? latestClickedEvents?.find(event => event._id === activeId)
    : null;

  return (
    <div className={classes.pageContainer}>

      {/* Row 1: LIBRARY (left) / TERRAIN (right) on Desktop, Stacked on Mobile */}
      
        <div className={classes.leftPositionHistoriesGrid}>
              <LayoutPanel
                
                leftIcon={<Library key="library" color="ivory" size={18} strokeWidth={1} />}
                tabs={[
                  {
                    key: 'histories',
                    label: 'LIBRARY',
                    isActive: activeTab === 'histories',
                    onClick: () => handleTabChange('histories')
                  },
                  {
                    key: 'events',
                    label: eventsTabLabel,
                    isActive: activeTab === 'events',
                    onClick: () => handleTabChange('events')
                  }
                ]}
                rightItems={[
                  <button
                    key="search-toggle"
                    onClick={() => setShowLibrarySearch(!showLibrarySearch)}
                    className={`flex items-center justify-center p-1 rounded hover:bg-gray-700/50 transition-colors ${showLibrarySearch ? 'text-blue-400' : 'text-gray-400'}`}
                    title="Search collections"
                 
                  >
                    <Search size={14} color='#ffaaff' style={{ transform: 'translateY(-2px)' }}/>
                  </button>
                ]}
                borderColor={'mbar_border_fallback'}>

                  <TabbedEventsPanel
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      showSearch={showLibrarySearch}
                    />
            </LayoutPanel>
        </div>
        <div className={`${classes.RightPositionSubGrid} ${terrainFullscreen ? classes.terrainFullscreenOverlay : ''}`}>
          
            <div className={classes.terrainGrid}>
              <LayoutPanel
                title="TERRAIN"
                leftItems={[<Mountain key="mountain" color="ivory" size={18} strokeWidth={1} />]}
                rightItems={[
                  <button
                    key="fullscreen"
                    onClick={() => setTerrainFullscreen(prev => !prev)}
                    className="flex items-center justify-center hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-yellow-400"
                    title={terrainFullscreen ? 'Exit fullscreen' : 'Fullscreen terrain'}
                  >
                    {terrainFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>,
                  <button
                    key="save"
                    onClick={handleSave}
                    className="flex items-center justify-center hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-green-400"
                    title="Save state to file"
                  >
                    <Save size={16} />
                  </button>,
                  <button
                    key="load"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-blue-400"
                    title="Load state from file"
                  >
                    <Import size={16} />
                  </button>,
                  <button
                    key="clear"
                    onClick={handleClear}
                    className="flex items-center justify-center hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-red-400"
                    title="Clear all data"
                  >
                    <Trash2 size={16} />
                  </button>
                ]}
                borderColor= {'mbar_border_fallback'}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleLoadFile}
                    className="hidden"
                  />
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <SimpleHUD />
                    <TerrainPanel onHover={setHoverInfo} />
                  </div>
                  </LayoutPanel>
            </div>
            
            <div className={classes.timeNavGrid}>
              <LayoutPanel
                  title="NAVIGATE THROUGH TIME"
                  leftItems={[<Pyramid color="ivory" size={18} strokeWidth={1} />]}
                   borderColor= {'mbar_border_fallback'}
                   >
                    <div> <DensityGraph /></div>
                </LayoutPanel>
            </div>


        </div>
        <div className={classes.timelineBuilderGrid}>
          <LayoutPanel
            title="TIMELINE BUILDER"
            leftItems={[<SquareChartGantt color="ivory" size={18} strokeWidth={1} />]}
            borderColor= {'mbar_border_fallback'}
             >
              <TimelineBuilder />
          </LayoutPanel>
        </div>


<div className={classes.timelineGraphModelSubGrid}>
     <GraphModel />
          </div>

        

        <div className={classes.footerGrid}>
          <Footer />
        </div>



</div>







  );
}
