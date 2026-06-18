import React, { useState, useMemo } from 'react';
import LatestClickedEvents from '@/components/Timeline/LatestClickedEvents';
import TimelineListPanel from '@/components/Timeline/TimelineListPanel';
import { useEventStore } from '../../app/store/useEventStore';
import classes from '../../app/styles/overrides.module.css';

interface TabbedEventsPanelProps {
  activeTab?: 'histories' | 'events';
  onTabChange?: (tab: 'histories' | 'events') => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  isMobile?: boolean;
  showSearch?: boolean;
}

export default function TabbedEventsPanel({
  activeTab: controlledActiveTab,
  onTabChange,
  isCollapsed: controlledIsCollapsed,
  onCollapsedChange,
  isMobile = false,
  showSearch = false,
}: TabbedEventsPanelProps) {

  //variable to determine which tab we show (can be controlled from parent)
  const [internalActiveTab, setInternalActiveTab] = useState<'histories' | 'events'>('histories');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = controlledIsCollapsed !== undefined ? !controlledIsCollapsed : internalIsOpen;
  const [expandAll, setExpandAll] = useState(false);

  const latestClickedEvents = useEventStore((state) => state.latestClickedEvents);

  // Helper function to format year with AD/BC
  const formatYear = (year: number): string => {
    if (year < 0) {
      return `${Math.abs(year)} BC`;
    } else {
      return `${year} AD`;
    }
  };

  // Calculate year range for events tab label
  const yearRange = useMemo(() => {
    if (!latestClickedEvents || latestClickedEvents.length === 0) return null;

    const years = latestClickedEvents
      .map(e => e.date_obj?.year)
      .filter((year): year is number => typeof year === 'number');

    if (years.length === 0) return null;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    return minYear === maxYear ? formatYear(minYear) : `${formatYear(minYear)} - ${formatYear(maxYear)}`;
  }, [latestClickedEvents]);

  const eventsTabLabel = yearRange ? `Events: ${yearRange}` : 'Events';

  const handleTabChange = (tab: 'histories' | 'events') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const handleToggleExpandAll = () => {
    setExpandAll(!expandAll);
  };

  return (

  <div className="flex flex-col w-full text-white bg-gray-900" style={{
    height: '100%',
    minHeight: isMobile && isOpen ? '150px' : undefined,
    maxHeight: isMobile && isOpen ? '60vh' : undefined,
    borderRight: '4px solid rgb(50, 52, 67)'
    
  }}>

  
    {isOpen && activeTab === 'histories' && (
      <div className={classes.customScrollbar} style={{
        flex: '1 1 0',
        minHeight: 0
      }}>
        <div className={classes.scrollLeftContent}>
          <TimelineListPanel listView={true} showSearch={showSearch} />
        </div>
      </div>
    )}

    {isOpen && activeTab === 'events' && (
      <div className={classes.customScrollbar} style={{
        flex: '1 1 0',
        minHeight: 0
      }}>
        <div className={classes.scrollLeftContent}>
          <LatestClickedEvents expandAll={expandAll} isMobile={isMobile} />
        </div>
      </div>
    )}
</div>


  );
}