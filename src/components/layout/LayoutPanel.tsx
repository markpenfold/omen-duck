import React, { useState, ReactNode } from 'react';
import MenuBar from './MenuBar';
import { SquareChevronDown } from 'lucide-react';
import classes from './panel.module.css'

interface TabItem {
  key: string;
  label: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

interface LayoutPanelProps {
  title?: string;
  leftItems?: ReactNode[];
  children: ReactNode;
  rightItems?: ReactNode[];
  tabs?: TabItem[];
  leftIcon?: ReactNode;
  borderColor?: string;
}

/**
 * Simple reusable panel component with MenuBar and collapse/expand functionality
 *
 * @param title - Text displayed in the MenuBar
 * @param leftIcon - Optional icon displayed on the left of the MenuBar (used with tabs)
 * @param children - Content displayed when panel is expanded
 * @param rightItems - Additional items to display in MenuBar before the chevron
 * @param tabs - Optional tab items for tabbed interface
 * @param leftItems - Alternative to tabs for custom left content
 */
export default function LayoutPanel({
  title,
  leftItems = [],
  children,
  rightItems = [],
  tabs,
  leftIcon,
  borderColor,
}: LayoutPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Build left items for MenuBar
  const menuBarLeftItems = tabs && leftIcon ? [
    leftIcon,
    <div key="tabs-container" className={classes.tabButtonHolder}>
      {tabs.map(tab => (
        <div
          key={tab.key}
          className={classes.tabButton}
          onClick={tab.onClick}
          style={{
            backgroundColor: tab.isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          }}
        >
          {tab.label}
        </div>
      ))}
    </div>
  ] : leftItems;

  return (
    <div
      className={classes.panel}
      style={{ height: isCollapsed ? 'auto' : '100%' }}
    >
      <MenuBar
        borderColor={borderColor}
        leftItems={menuBarLeftItems}
        rightItems={[
          ...rightItems,
          <button
            key="collapse-chevron"
            onClick={handleToggle}
            className="flex items-center"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            <SquareChevronDown
              color="ivory"
              size={18}
              strokeWidth={1}
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          </button>
        ]}
      >
        {title && title}
      </MenuBar>

      {!isCollapsed && (
        <div className={classes.panelContent}>
          {children}
        </div>
      )}
    </div>
  );
}
