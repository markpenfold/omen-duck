// useUIStore.ts
import {create} from 'zustand';
import { UIStore,GraphNode, GraphLink, GraphData } from './types';
import type { BufferGeometry } from 'three';

export const useUIStore = create<UIStore>((set) => ({
  
      //////////////////////////////////////////////////////////////////////////
      // GRAPH STATE - nodes, links, selection, hover
      //////////////////////////////////////////////////////////////////////////
      graphData: { nodes: [], links: [] },
      setGraphData: (data) => set({ graphData: data }),
      selectedNode: null,
      setSelectedNode: (node) => set({ selectedNode: node }),
      hoveredNode: null,
      setHoveredNode: (node) => set({ hoveredNode: node }),

      //////////////////////////////////////////////////////////////////////////
      // UI STATE - dragging, hover info, viewing window
      //////////////////////////////////////////////////////////////////////////
      isUiDragging: false,
      setIsUiDragging: (dragging) => set({ isUiDragging: dragging }),

      hoverInfo: null,
      clickedUV: null,
      hoverUV: null,

      hoverVertexData: null,
      setHoverVertexData: (data) =>
        set({ hoverVertexData: data }),


      
      viewingWindowStart: -60,
      viewingWindowWidth: 10,
      setViewingWindowStart: (s) => {
        set({ viewingWindowStart: s });
        return s;
      },
      setViewingWindowWidth: (w) => {
        set({ viewingWindowWidth: w });
        return w;
      },

      setClickedUV: (uv) => set({ clickedUV: uv }),
      setHoverUV: (uv) => set({ hoverUV: uv }),

      setHoverInfo: (info) => {
        if (!info) {
          set({ hoverInfo: null, hoverUV: null });
          return;
        }
        set({ hoverInfo: info });
      },

      selectedLink: null,
      setSelectedLink: (link) => set({ selectedLink: link }),

      hoverYear:  null as number | null,
      setHoverYear: (year: number | null) => set({ hoverYear: year }),

}));


