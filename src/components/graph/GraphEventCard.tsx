'use client'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TimelineEvent, LINK_TYPES, LinkTypeSelectProps } from '@/app/store/types';
import { X, ChevronDown, Plus, Notebook, Link2Off, CircleDot } from 'lucide-react';
import { useEventStore } from '../../app/store/useEventStore';
import { useUIStore } from '../../app/store/useUIStore';
import classes from './graph.module.css';
import { useAccordion } from '@/hooks/useAccordion';
import { LinkTypeSelect } from './LinkTypeSelect';
import { calculateEventProbability, getIncomingLinks } from '@/lib/probability';

// Convert weight (-100 to +100) to visual fill percentage (0 to 100)
function weightToFillPercent(weight: number): number {
  return ((weight + 100) / 200) * 100;
}

// Convert visual fill percentage (0 to 100) to weight (-100 to +100)
function fillPercentToWeight(percent: number): number {
  return Math.round((percent / 100) * 200 - 100);
}





interface GraphEventCardProps {
    item: TimelineEvent;
    onRemove: (id: string) => void;
    bg:string;
}

export function GraphEventCard({item, onRemove, bg}: GraphEventCardProps) {
  
    const getCollectionColor = useEventStore(state => state.getCollectionColor);
    const collectionColor = getCollectionColor(item.collection) || '#6b7280';
    const timelineBuilderEvents = useEventStore(state => state.timelineBuilderEvents);
    const hoveredNode = useUIStore(state => state.hoveredNode);
    const selectedNode = useUIStore(state => state.selectedNode);
    const selectedLink = useUIStore(state => state.selectedLink);
    const setSelectedNode = useUIStore(state => state.setSelectedNode);
    const isHovered = hoveredNode === item._id;
    const { isExpanded, toggle: baseToggle, setIsExpanded } = useAccordion();

    // Wrap toggle to also select/deselect the node in the graph
    const toggle = useCallback(() => {
      const willExpand = !isExpanded;
      baseToggle();
      // Select node when expanding, deselect when collapsing
      setSelectedNode(willExpand ? item._id : null);
    }, [isExpanded, baseToggle, setSelectedNode, item._id]);
    const removeEventLink = useEventStore((state) => state.removeEventLink);
    const addEventLink = useEventStore((state) => state.addEventLink);
    const updateEventLinkWeight = useEventStore((state) => state.updateEventLinkWeight);
    const updateEventNote = useEventStore((state) => state.updateEventNote);
    const setIsUiDragging = useUIStore((state) => state.setIsUiDragging);
    const {
      isExpanded: isLinkEditorOpen,
      toggle: toggleLinkEditor,
    } = useAccordion();
    const [linkTypeByEvent, setLinkTypeByEvent] = useState<Record<string, string>>({});
    const [draggingLink, setDraggingLink] = useState<string | null>(null);
    const [tooltipInfo, setTooltipInfo] = useState<{ weight: number; x: number; y: number } | null>(null);
    const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const prevExpandedRef = useRef(false);
    const firstSliderRef = useRef<HTMLDivElement>(null);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);
    const prevSelectedNodeRef = useRef<string | null>(null);
    const prevSelectedLinkTargetRef = useRef<string | null>(null);

    // Calculate probability for this event based on incoming links
    const probability = useMemo(() => {
      return calculateEventProbability(item._id, timelineBuilderEvents);
    }, [item._id, timelineBuilderEvents]);

    // Get incoming links (links that point TO this event)
    const incomingLinks = useMemo(() => {
      return getIncomingLinks(item._id, timelineBuilderEvents);
    }, [item._id, timelineBuilderEvents]);

    // Handle opening note editor for a target event
    const openNoteEditor = (targetId: string) => {
      const targetEvent = timelineBuilderEvents.find(e => e._id === targetId);
      setNoteText(targetEvent?.userNote || '');
      setEditingNoteFor(targetId);
      // Focus the input after render
      setTimeout(() => noteInputRef.current?.focus(), 50);
    };

    // Handle saving note
    const saveNote = () => {
      if (editingNoteFor) {
        updateEventNote(editingNoteFor, noteText);
        setEditingNoteFor(null);
        setNoteText('');
      }
    };

    // Show weight tooltip briefly when expanding (if there are incoming links)
    useEffect(() => {
      if (isExpanded && !prevExpandedRef.current && incomingLinks.length > 0) {
        // Small delay to let the DOM render
        const showTimer = setTimeout(() => {
          if (firstSliderRef.current) {
            const rect = firstSliderRef.current.getBoundingClientRect();
            const firstLink = incomingLinks[0].link;
            const weight = firstLink.weight ?? 0;
            const weightPercent = weightToFillPercent(weight);
            const x = rect.left + (rect.width * weightPercent / 100);
            setTooltipInfo({ weight, x, y: rect.top - 24 });
          }
        }, 50);

        // Hide after 2 seconds
        const hideTimer = setTimeout(() => setTooltipInfo(null), 2000);

        return () => {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };
      }
      prevExpandedRef.current = isExpanded;
    }, [isExpanded, incomingLinks]);

    // Toggle expansion when this node is selected/deselected in the graph view
    useEffect(() => {
      const wasThisNode = prevSelectedNodeRef.current === item._id;
      const isThisNode = selectedNode === item._id;

      if (isThisNode && !wasThisNode) {
        // Just selected this node -> expand
        setIsExpanded(true);
      } else if (!isThisNode && wasThisNode) {
        // Just deselected this node (clicked again) -> collapse
        setIsExpanded(false);
      }

      prevSelectedNodeRef.current = selectedNode;
    }, [selectedNode, item._id, setIsExpanded]);

    // Toggle expansion when a link TO this node is clicked in the graph view
    useEffect(() => {
      const targetId = selectedLink?.targetId ?? null;
      const wasThisNode = prevSelectedLinkTargetRef.current === item._id;
      const isThisNode = targetId === item._id;

      if (isThisNode && !wasThisNode) {
        // Just selected a link to this node -> expand
        setIsExpanded(true);
      } else if (!isThisNode && wasThisNode) {
        // Link to this node was deselected -> collapse
        setIsExpanded(false);
      }

      prevSelectedLinkTargetRef.current = targetId;
    }, [selectedLink, item._id, setIsExpanded]);


    ////////////////////////////////////////////////////////////////////
    // Handle weight drag for incoming links ///////////////////////////
    // sourceId = the event that owns the link (pointing TO this item)//
    ////////////////////////////////////////////////////////////////////
    const handleWeightDrag = useCallback((
      e: React.MouseEvent<HTMLDivElement>,
      sourceId: string,
      linkType: string
    ) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const weight = fillPercentToWeight(percent);
      // Source owns the link, target is this item
      updateEventLinkWeight(sourceId, item._id, linkType, weight);
      // Update tooltip position and value
      setTooltipInfo({ weight, x: e.clientX, y: rect.top - 24 });
    }, [item._id, updateEventLinkWeight]);

    const handleMouseDown = (sourceId: string, linkType: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setDraggingLink(`${sourceId}-${linkType}`);
      setIsUiDragging(true);  // Disable graph controls
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const weight = fillPercentToWeight(percent);
      setTooltipInfo({ weight, x: e.clientX, y: rect.top - 24 });
    };

    const handleMouseUp = () => {
      setDraggingLink(null);
      setTooltipInfo(null);
      setIsUiDragging(false);  // Re-enable graph controls
    };


  function toggleBoth(){
    toggle();
    toggleLinkEditor();
  }


    return (
      <div
        className={isExpanded ? 'event-node-expanded' : ''}
        style={{
          position: 'relative',
          width: '100%',
          fontSize: '10px',
          backgroundColor: 'bg',

        }}
      >

    <div className={classes.graphEventHolder} style={isHovered ? { backgroundColor: 'rgba(100, 150, 255, 0.15)' } : undefined}>
      <div
        className={[classes.eventrow, isExpanded && classes.expanded]
                        .filter(Boolean)
                        .join(' ')}
        onClick={toggle}
        style={{ cursor: 'pointer' }}
      >
            {incomingLinks.length > 0 ? (
              <span
                style={{
                  padding: '1px 4px',
                  fontSize: '9px',
                  fontWeight: 500,
                  backgroundColor: probability >= 50 ? '#22c55e' : '#ef4444',
                  color: '#fff',
                }}
                title={`Probability based on ${incomingLinks.length} incoming link${incomingLinks.length > 1 ? 's' : ''}`}
              >
                {probability}%
              </span>
            ) : (
              <CircleDot size={10} fill={collectionColor} strokeWidth={0} />
            )}
          <span>{item.event}</span>

      <div className={classes.buttonz}>
          {/* Chevron indicator */}
          <ChevronDown size={14} color="#efefef" strokeWidth={1.5} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />

        {/* REMOVE THIS EVENT AND ITS LINKS */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item._id); }}
            className="flex items-center hover:scale-110 transition-transform"
            aria-label="Remove from timeline"
            >
            <X size={12} color="#ef4444" strokeWidth={1.5} />
          </button>

      </div>
    </div>
</div>


      
    {/* SHOW ME THE EXPANDED LIST OF LINKTO ITEMS */}
        {isExpanded && (
          <div className={classes.listHolder}>
            {/* Incoming links list - links that point TO this event */}

            {incomingLinks.length > 0 && (
              <ul className={classes.linkListActive}>
                {incomingLinks.map(({ sourceEvent, link }, index) => {
                  const sourceId = sourceEvent._id;
                  const linkType = link.linkType;
                  const weight = link.weight ?? 0;

                  const linkTypeInfo = LINK_TYPES[linkType];
                  const weightPercent = weightToFillPercent(weight);
                  const linkKey = `${sourceId}-${linkType}`;
                  const isDragging = draggingLink === linkKey;

                  const linkColor = linkTypeInfo?.color || '#6b7280';

                  return (
                    <React.Fragment key={`${sourceId}-${linkType}-${index}`}>
                    <li
                      className={classes.linkListItem}
                      style={{ backgroundColor: index % 2 === 0 ? '#e8e8e8' : '#d8d8d8', }}
                      >

                      <LinkTypeSelect
                        value={linkType}
                        onChange={(newType) => {
                          if (newType !== linkType) {
                            // Source owns the link, target is this item
                            removeEventLink(sourceId, item._id, linkType);
                            addEventLink(sourceId, item._id, newType, weight);
                          }
                        }}
                        color={linkTypeInfo?.color}
                      />

                      {/* Weight-adjustable event text with background fill */}
                      <div
                        ref={index === 0 ? firstSliderRef : undefined}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          position: 'relative',
                          cursor: 'ew-resize',
                          userSelect: 'none',
                          padding: '2px 4px',
                          background: `linear-gradient(to right, ${linkColor} 0%, ${linkColor} ${weightPercent}%, transparent ${weightPercent}%)`,
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                        onMouseDown={(e) => handleMouseDown(sourceId, linkType, e)}
                        onMouseMove={(e) => isDragging && handleWeightDrag(e, sourceId, linkType)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <span className={classes.linkText} style={{ position: 'relative', zIndex: 1, color: '#1b1b1b' }}>
                          {sourceEvent.event}
                        </span>
                      </div>

                      <div className={classes.buttonz}>

                          <button
                            onClick={() => openNoteEditor(sourceId)}
                            className="flex items-center hover:scale-140 transition-transform"
                            aria-label="Add note"
                            style={{ marginLeft: 'auto', marginRight: '4px' }}
                          >
                            <Notebook
                              size={11}
                              color={sourceEvent.userNote ? '#22c55e' : '#1b1b1b'}
                              fill={sourceEvent.userNote ? '#22c55e' : 'none'}
                              strokeWidth={2.0}
                            />
                          </button>
                          <button
                            onClick={() => removeEventLink(sourceId, item._id, linkType)}
                            className="flex items-center hover:scale-140 transition-transform"
                            aria-label="Remove link"
                            style={{ marginLeft: 'auto', marginRight: '4px' }}
                          >
                            <Link2Off size={11} color="#ef4444" strokeWidth={2.0} />
                          </button>
                      </div>

                    </li>
                    {/* Inline note editor */}
                    {editingNoteFor === sourceId && (
                      <li
                        style={{
                          backgroundColor: '#f5f5f5',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <textarea
                          ref={noteInputRef}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this connection..."
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.metaKey) {
                              saveNote();
                            }
                            if (e.key === 'Escape') {
                              setEditingNoteFor(null);
                              setNoteText('');
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditingNoteFor(null);
                              setNoteText('');
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '10px',
                              backgroundColor: '#e5e5e5',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveNote}
                            style={{
                              padding: '4px 10px',
                              fontSize: '10px',
                              backgroundColor: '#22c55e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </li>
                    )}
                    </React.Fragment>
                  );
                })}
              </ul>
            )}

            {/* Add a link header */}
            <div className={classes.headerRow}>
              <div className={classes.linkAddTab} onClick={toggleLinkEditor}>

                  <Plus size={14} color="#efefef" strokeWidth={1.5} style={{ transform: isLinkEditorOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', }}/>
              <span>Incoming Influences</span>
              </div>
              
            </div>

            {/* Add links list */}
            {isLinkEditorOpen && timelineBuilderEvents.length > 1 && (
              <ul className={classes.linkListAdd}>
                
                {timelineBuilderEvents
                  .filter((e) => e._id !== item._id)
                  .map((event: TimelineEvent, index: number) => {
                    const linkType = linkTypeByEvent[event._id] || 'contributing_factor';
                    return (
                      <li
                          key={event._id || `item-${index}`}
                          className={classes.linkListItem}
                          style={{ backgroundColor: index % 2 === 0 ? '#e8e8e8' : '#d8d8d8' }}
                          >
                        <LinkTypeSelect
                          value={linkType}
                          onChange={(newType) => setLinkTypeByEvent(prev => ({ ...prev, [event._id]: newType }))}
                          color={LINK_TYPES[linkType]?.color}
                        />
                        <CircleDot size={10} fill={getCollectionColor(event?.collection || '#22c55e') ?? undefined} strokeWidth={0} />

                        <span className={classes.linkText} style={{ color: '#1b1b1b' }}>{event.event}</span>
                                <button
                                  onClick={() => addEventLink(event._id, item._id, linkType)}
                                  aria-label='add incoming influence'
                                  className="flex items-center hover:scale-140 transition-transform"
                                  style={{ marginLeft: 'auto', marginRight: '4px' }}
                                >
                                  <Plus size={12} color={'#22c55e'} strokeWidth={1.5} />
                                </button>
                      </li>
                    );
                  })}
              </ul>
            )}
            
          </div>
        )}

        {/* Weight tooltip */}
        {tooltipInfo && (
          <div
            style={{
              position: 'fixed',
              left: tooltipInfo.x,
              top: tooltipInfo.y,
              transform: 'translateX(-50%)',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              zIndex: 9999,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Weight: {tooltipInfo.weight > 0 ? '+' : ''}{tooltipInfo.weight}%
          </div>
        )}

      </div>
    );
}
