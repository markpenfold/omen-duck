import { useMemo, useRef, useState, useEffect } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import { useUIStore } from '../../app/store/useUIStore';
import styles from '../../app/styles/densityGraph.module.css'
import { buildDensityData, createDensityGraphSVG, parseYearInput } from '../../app/utils/densityHelpers';
import EditableDateTab from '../Timeline/EditableDateTab';
import { formatYear } from './helpers';
import { pixelsToYears, yearToPixels } from './terrainUtils';


interface DensityGraphProps {
  height?: number;
  color?: string;
  maxPoints?: number;
}


const DensityGraph = ({ 
  height = 40,
  color = "#3b82f6",
  maxPoints = 1024
}: DensityGraphProps) => {

  const aggregatedEvents  = useEventStore((state) => state.aggregatedEvents);
  const availableDateRange = useEventStore((state) => state.availableDateRange);
  const setSliderYear      = useEventStore((state) => state.setSliderYear);
  const sliderYear         = useEventStore((state) => state.sliderYear);
  const restorationComplete = useEventStore((state) => state.restorationComplete);

  const viewingWindowStartPixels    = useUIStore((state) => state.viewingWindowStart);
  const viewingWindowWidthPixels    = useUIStore((state) => state.viewingWindowWidth);
  const setViewingWindowWidthPixels = useUIStore((state) => state.setViewingWindowWidth);
  const setViewingWindowStartPixels = useUIStore((state) => state.setViewingWindowStart);

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth]   = useState(0);
  const [windowStartYear, setWindowStartYear] = useState(sliderYear);
  const [windowEndYear, setWindowEndYear]     = useState(sliderYear + 1024);
  const tabWidth = 60;

  const isReady = restorationComplete && !!aggregatedEvents?.length && containerWidth > 0;
  const initializedRef = useRef(false);
  const prevAggregatedEvents = useRef(aggregatedEvents);

  ///////////////////////////////////////////////////////////
  // CORE REBUILD FUNCTIONS
  ///////////////////////////////////////////////////////////

  // Rebuild from a known year — used on: init, data change, resize
  function rebuildFromYear(year: number) {
    if (!isReady) return;
    const startPx  = yearToPixels(year, containerWidth, tabWidth, aggregatedEvents);
    const endYear  = year + 1024;
    const endPx    = yearToPixels(endYear, containerWidth, tabWidth, aggregatedEvents);
    setViewingWindowStartPixels(startPx);
    setViewingWindowWidthPixels(endPx - startPx);
    setWindowStartYear(year);
    setWindowEndYear(endYear);
  }

  // Rebuild from a pixel position — used on: drag end
  function rebuildFromPixel(px: number) {
    if (!isReady) return;
    const startYear = pixelsToYears(px, availableDateRange, containerWidth, tabWidth, aggregatedEvents);
    const endYear   = startYear + 1024;
    const endPx     = yearToPixels(endYear, containerWidth, tabWidth, aggregatedEvents);
    setViewingWindowWidthPixels(endPx - px);
    setWindowStartYear(startYear);
    setWindowEndYear(endYear);
    setSliderYear(startYear);
  }

  ///////////////////////////////////////////////////////////
  // WATCHERS
  ///////////////////////////////////////////////////////////

  // 1. Initial load — run once when everything is ready
  useEffect(() => {
    if (!isReady || initializedRef.current) return;
    initializedRef.current = true;
    rebuildFromYear(sliderYear);
  }, [isReady]);

  // 2. Data changed (new layer added/removed) — reanchor from saved year
  useEffect(() => {
    if (!isReady || !initializedRef.current) return;
    if (aggregatedEvents === prevAggregatedEvents.current) return;
    prevAggregatedEvents.current = aggregatedEvents;
    rebuildFromYear(windowStartYear);
  }, [aggregatedEvents]);

  // 3. Container resized — reanchor from saved year
  useEffect(() => {
    if (!isReady || !initializedRef.current) return;
    rebuildFromYear(windowStartYear);
  }, [containerWidth]);

  // 4. Pixel position changed — this was a drag
  useEffect(() => {
    if (!isReady || !initializedRef.current) return;
    rebuildFromPixel(viewingWindowStartPixels);
  }, [viewingWindowStartPixels]);

  ///////////////////////////////////////////////////////////
  // RESIZE OBSERVER
  ///////////////////////////////////////////////////////////
  useEffect(() => {
    if (!graphContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(width);
      }
    });
    resizeObserver.observe(graphContainerRef.current);
    setContainerWidth(graphContainerRef.current.offsetWidth);
    return () => resizeObserver.disconnect();
  }, []);

  ///////////////////////////////////////////////////////////
  // DRAG HANDLING
  ///////////////////////////////////////////////////////////
  const [isDragging, setIsDragging]             = useState(false);
  const [dragStartX, setDragStartX]             = useState(0);
  const [dragStartWindowStart, setDragStartWindowStart] = useState(0);
  const clickStartX = useRef(0);

  const handleCentralMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartWindowStart(viewingWindowStartPixels);
  };

  const handleCentralTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartWindowStart(viewingWindowStartPixels);
  };

  function clampAndSetPixel(newWindowStart: number) {
    if (!graphContainerRef.current) return;
    const graphContWidth = graphContainerRef.current.offsetWidth;
    const futureBuffer   = 100;
    const maxStartYear   = availableDateRange[1] - 1024 + futureBuffer;
    const maxRightPx     = yearToPixels(maxStartYear, graphContWidth, tabWidth, aggregatedEvents);
    const clamped        = Math.max(-tabWidth, Math.min(newWindowStart, maxRightPx));
    setViewingWindowStartPixels(clamped);
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    clampAndSetPixel(dragStartWindowStart + deltaX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    clampAndSetPixel(dragStartWindowStart + deltaX);
  };

  const handleMouseUp    = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  const handleTouchEnd   = () => setIsDragging(false);

  const handleGraphMouseDown = (e: React.MouseEvent) => {
    clickStartX.current = e.clientX;
  };

  function handleLeftYearChange(newYear: number) {
    console.log("new left year requested:", newYear);
  }

  function handleRightYearChange(newYear: number) {
    console.log("new right year requested:", newYear);
  }

  ///////////////////////////////////////////////////////////
  // SVG DENSITY GRAPH
  ///////////////////////////////////////////////////////////
  const densityData = useMemo(() => {
    if (!restorationComplete) return [];
    return buildDensityData(aggregatedEvents, maxPoints);
  }, [restorationComplete, aggregatedEvents, maxPoints]);

  const backgroundSVG = useMemo(() =>
    createDensityGraphSVG(densityData, height, color),
    [densityData, height, color]
  );

  ///////////////////////////////////////////////////////////
  // RENDER
  ///////////////////////////////////////////////////////////
  return (
    <div className="flex flex-col gap-1">
      <div
        ref={graphContainerRef}
        className={styles.graphContainer}
        onMouseMove={handleMouseMove}
        onMouseDown={handleGraphMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          backgroundImage: `url("${backgroundSVG}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: `${height + 10}px`
        }}>

        <div style={{ display: 'flex', marginLeft: `${viewingWindowStartPixels}px` }}>
          <EditableDateTab
            year={windowStartYear}
            onYearChange={handleLeftYearChange}
            onMouseDown={handleCentralMouseDown}
            onTouchStart={handleCentralTouchStart}
            side="left"
            tabWidth={tabWidth}
            formatYear={formatYear}
            parseYear={parseYearInput}
          />

          <div
            onMouseDown={handleCentralMouseDown}
            onTouchStart={handleCentralTouchStart}
            style={{
              color: 'white',
              borderTop: '1px solid #ef4444',
              borderBottom: '1px solid #ef4444',
              borderLeft: '0px',
              borderRight: '0px',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              zIndex: 10,
              height: '50px',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              pointerEvents: 'auto',
              width: `${viewingWindowWidthPixels}px`,
            }}
          />

          <EditableDateTab
            year={windowEndYear}
            onYearChange={handleRightYearChange}
            onMouseDown={handleCentralMouseDown}
            onTouchStart={handleCentralTouchStart}
            side="right"
            tabWidth={tabWidth}
            formatYear={formatYear}
            parseYear={parseYearInput}
          />
        </div>
      </div>
    </div>
  );
};

export default DensityGraph;