import { useState, useRef, useEffect } from 'react';
import styles from '../../app/styles/densityGraph.module.css';

interface EditableDateTabProps {
  year: number;
  onYearChange: (year: number) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  side: 'left' | 'right';
  tabWidth: number;
  formatYear: (year: number) => string;
  parseYear: (input: string) => number | null;
  style?: React.CSSProperties;
}

const EditableDateTab = ({
  year,
  onYearChange,
  onMouseDown,
  onTouchStart,
  side,
  tabWidth,
  formatYear,
  parseYear,
  style
}: EditableDateTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(formatYear(year));
  };

  const handleBlur = () => {
    const parsedYear = parseYear(editValue);
    if (parsedYear !== null) {
      onYearChange(parsedYear);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={styles.tabColors}
      onMouseDown={isEditing ? undefined : onMouseDown}
      onTouchStart={isEditing ? undefined : onTouchStart}
      onDoubleClick={handleDoubleClick}
      style={{
        borderRadius: side === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
        minWidth: `${tabWidth}px`,
        pointerEvents: 'auto',
        cursor: isEditing ? 'text' : 'ew-resize',
        position: 'relative',
        padding: '8px 6px',
        color: 'white',
        fontSize: '11px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        zIndex: 10,
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        ...style
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            background: 'transparent',
            border: '1px solid white',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            width: '100%',
            padding: '2px',
            outline: 'none',
          }}
        />
      ) : (
        formatYear(year)
      )}
    </div>
  );
};

export default EditableDateTab;