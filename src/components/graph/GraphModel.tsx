'use client';
import  GraphView  from './GraphView2';
import GraphEditor from './GraphEditor';
import LayoutPanel from '@/components/layout/LayoutPanel';
import { Waypoints, } from 'lucide-react';
import classes from '@/components/layout/panel.module.css';

////////////////////////////////////////////////////////////////////
/// A COMPONENT TO HOLD THE TWO OTHER GRAPH GIZMOS /////////////////
////////////////////////////////////////////////////////////////////
const GraphModel = () => {

  //////////////////////////////////////////////////////////////////////////////////////////
  // Get/set data from store ///////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////
  

  return (
    <>
        <div className={classes.timelineGraphGrid}>
            <LayoutPanel
                title="TIMELINE GRAPH"
                leftItems={[<Waypoints color="ivory" size={18} strokeWidth={1} />]}
                borderColor= {'mbar_border_fallback'}
                >
                <GraphView />
            </LayoutPanel>
        </div>
        <div className={classes.graphEditorGrid}>
            <LayoutPanel
            title="GRAPH EDITOR"
            leftItems={[<Waypoints color="ivory" size={18} strokeWidth={1} />]}
            borderColor= {'mbar_border_fallback'}
             >
             <GraphEditor />
          </LayoutPanel>
        </div>
    </>
        );
    };

export default GraphModel;



/*
<div className={classes.timelineGraphGrid}>
            <LayoutPanel
                title="TIMELINE GRAPH"
                leftItems={[<Waypoints color="ivory" size={18} strokeWidth={1} />]}
                borderColor= {'mbar_border_fallback'}
                >
                <GraphView />
            </LayoutPanel>
        </div>
        <div className={classes.graphEditorGrid}>
        <LayoutPanel
            title="GRAPH EDITOR"
            leftItems={[<Waypoints color="ivory" size={18} strokeWidth={1} />]}
            borderColor= {'mbar_border_fallback'}
             >
             <GraphEditor />
          </LayoutPanel>
          </div>
*/