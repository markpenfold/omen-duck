import { useMemo, useEffect } from 'react';
import { useEventStore } from '../../app/store/useEventStore';
import { useUIStore } from '../../app/store/useUIStore';
import { formatYear } from './helpers';

function truncateName(name) {
  return name.length > 30 ? name.substring(0, 10) + '...' : name;
}

export function SimpleHUD() {
  const selectedCollections = useEventStore(state => state.selectedCollections);
  const terrainData         = useEventStore(state => state.terrainData);
  const hoverVertexData     = useUIStore(state => state.hoverVertexData);
  const setHoverYear = useUIStore(state => state.setHoverYear);

  // useMemo just computes — no side effects
const hudData = useMemo(() => {
  if (!hoverVertexData || !terrainData || selectedCollections.length === 0) return null;
  const { uv } = hoverVertexData;
  if (!uv) return null;

  const gridSize = Math.sqrt(terrainData.length);
  const col = Math.round(uv.x * (gridSize - 1));
  const row = Math.round((1 - uv.y) * (gridSize - 1));
  const idx = row * gridSize + col;

  const dataRow = terrainData[idx];
  if (!dataRow || dataRow.length < 2) return null;

  const hoverYear = dataRow[0];
  const composition = dataRow.slice(1, 1 + selectedCollections.length);
  const totalHeight = composition.reduce((sum, v) => sum + v, 0);

  return {
    hoverYear,
    composition,
    colorArray: selectedCollections.map(c => c.color),
    nameArray:  selectedCollections.map(c => c.displayName),
    totalHeight,
  };
}, [hoverVertexData, terrainData, selectedCollections]);

// useEffect syncs the computed year to the store after render
useEffect(() => {
  setHoverYear(hudData?.hoverYear ?? null);
}, [hudData?.hoverYear, setHoverYear]);


  if (!hudData || selectedCollections.length === 0) return null;

  const { hoverYear, totalHeight, composition, colorArray, nameArray } = hudData;

  return (
    <div style={{
      position: 'absolute',
      top: '40px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-end',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      <div style={{
        color: '#ffdd57',
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '8px'
      }}>
        {formatYear(hoverYear)}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '12px',
        minHeight: '150px',
        maxHeight: '300px'
      }}>
        {/* Names */}
        <div style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          justifyContent: 'space-around',
          gap: '2px'
        }}>
          {composition.map((count, index) => {
            if (count === 0) return null;
            const collHeight = Math.log(count + 1) * 15;
            const percentage = totalHeight > 0 ? (collHeight / totalHeight) * 100 : 0;
            return (
              <div
                key={index}
                style={{
                  flex: `${Math.max(percentage, 1)} 0 0`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: '2px'
                }}
              >
                <span style={{
                  color: colorArray[index],
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  {truncateName(nameArray[index])}
                </span>
              </div>
            );
          })}
        </div>

        {/* Counts */}
        <div style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          justifyContent: 'space-around',
          gap: '2px'
        }}>
          {composition.map((count, index) => {
            if (count === 0) return null;
            const collHeight = Math.log(count + 1) * 15;
            const percentage = totalHeight > 0 ? (collHeight / totalHeight) * 100 : 0;
            return (
              <div
                key={index}
                style={{
                  flex: `${Math.max(percentage, 1)} 0 0`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: '2px'
                }}
              >
                <span style={{
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vertical bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          width: '4px',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          {composition.map((count, index) => {
            if (count === 0) return null;
            const collHeight = Math.log(count + 1) * 15;
            const percentage = totalHeight > 0 ? (collHeight / totalHeight) * 100 : 0;
            return (
              <div
                key={index}
                style={{
                  background: colorArray[index],
                  flex: `${Math.max(percentage, 1)} 0 0`,
                  minHeight: '2px'
                }}
                title={`${nameArray[index]}: ${count} events`}
              />
            );
          })}
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        marginTop: '4px'
      }}>
        <span style={{ color: '#ffffff' }}>Total</span>
        <span style={{ color: '#ffdd57' }}>{totalHeight}</span>
      </div>
    </div>
  );
}

