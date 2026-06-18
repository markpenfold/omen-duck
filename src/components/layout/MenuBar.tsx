'use client'
import classes from './panel.module.css'

interface MenuBarProps {
  children?: React.ReactNode;
  leftItems?: React.ReactNode[];
  rightItems?: React.ReactNode[];
  borderColor?:string;
}

export default function MenuBar({ children, leftItems = [], rightItems = [], borderColor, }: MenuBarProps) {
  // Debug: log what we're getting
  //console.log('borderColor:', borderColor, 'classes:', classes);
  const borderClass = borderColor && classes[borderColor] ? classes[borderColor] : classes.mbar_border_events;
  //console.log('borderClass:', borderClass);

  return (
    <div className={`h-8 flex text-white p-0 ${borderClass}`}>
      {/* Left side items */}
      {leftItems.length > 0 && (
        <div className="flex">
          {leftItems.map((item, index) => (
            <div
              key={`left-${index}`}
              className={`transition-colors cursor-pointer ${index === 0 ? `p-2 ${classes.mbar_icon_bg}` : index === 1 ? 'pt-2 pr-2' : ''}`}
            >
              {item}
            </div>
          ))}
        </div>
      )}
      
      {/* Center text content - only render if children exists */}
      
        <div className={`flex-auto ${classes.mbar_header}`}>
          {children && (
          <div className={classes.mbar_text}>{children}</div>
          )}
        </div>
      
      
      {/* Right side items */}
      {rightItems.length > 0 && (
        <div className="flex items-stretch bg-gray-600">
          {rightItems.map((item, index) => (
            <div key={`right-${index}`} className="flex items-center px-2 border-r border-gray-500 last:border-r-0 hover:bg-gray-700 transition-colors cursor-pointer">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}