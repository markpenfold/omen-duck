'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three/webgpu';
import { getMat3 } from './threedee.js';
import { useEventStore } from '../../app/store/useEventStore';
import { useUIStore } from '../../app/store/useUIStore';
import { useThree } from '@react-three/fiber';
import { getSmoothArray } from './helpers.js';

const MAX_TIMELINES = 10;

export function TerrainShaderTest() {

    const meshRef    = useRef();
    const tData      = useEventStore((state) => state.terrainData);
    const restored   = useEventStore((state) => state.restorationComplete);
    const hoverUV    = useUIStore((state) => state.hoverUV);
    const { invalidate } = useThree();

    const resolution   = 512;
    const curve_points = resolution;
    const isReady      = restored && tData && tData.length > 0;

    const [numTimelines, setNumTimelines] = useState(0);
    const [geoVersion, setGeoVersion]     = useState(0);

    const emptyRaycast = () => {};

    ///////////////////////////////////////////////////////////
    // BASE GEOMETRY — recreated only if resolution changes
    ///////////////////////////////////////////////////////////
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(400, 400, resolution - 1, resolution - 1);
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, [resolution]);

    useEffect(() => () => geometry.dispose(), [geometry]);

    ///////////////////////////////////////////////////////////
    // COMPUTE FUNCTIONS
    ///////////////////////////////////////////////////////////

    // 1. Derive grid shape from data structure
    function computeGridMeta(data) {
        const baseCount    = data.length;
        const gridSize     = Math.sqrt(baseCount);
        let   nTimelines   = data[0].length - 1;
        if (nTimelines > MAX_TIMELINES) nTimelines = MAX_TIMELINES;
        return { baseCount, gridSize, numTimelines: nTimelines };
    }

    // 2. Spline-smooth heights and per-layer values
    function computeSmoothedData(data, gridMeta) {
        const { baseCount, gridSize, numTimelines } = gridMeta;
        const rawLayers = Array.from({ length: numTimelines }, () => new Float32Array(baseCount));
        const hMatrix   = [];

        for (let row = 0; row < gridSize; row++) {
            const rowVectors = [];
            for (let col = 0; col < gridSize; col++) {
                const idx      = row * gridSize + col;
                const eventRow = data[idx];
                let total      = 0;
                for (let t = 0; t < numTimelines; t++) {
                    const val         = eventRow ? (eventRow[t + 1] ?? 0) : 0;
                    rawLayers[t][idx] = val;
                    total            += val;
                }
                rowVectors.push(new THREE.Vector2(col, total > 0 ? Math.log(total + 1) * 15 : 0));
            }
            hMatrix.push(rowVectors);
        }

        const smoothHeights  = getSmoothArray(hMatrix, curve_points);
        const smoothedLayers = [];

        for (let t = 0; t < numTimelines; t++) {
            const layerMatrix = [];
            for (let row = 0; row < gridSize; row++) {
                const rowVectors = [];
                for (let col = 0; col < gridSize; col++) {
                    rowVectors.push(new THREE.Vector2(col, rawLayers[t][row * gridSize + col]));
                }
                layerMatrix.push(rowVectors);
            }
            const smoothed = getSmoothArray(layerMatrix, curve_points);
            for (let i = 0; i < smoothed.length; i++) if (smoothed[i] < 0) smoothed[i] = 0;
            smoothedLayers.push(smoothed);
        }

        return { smoothHeights, smoothedLayers, numTimelines };
    }

    // 3. Build cumulative band buffers from smoothed layers
    function computeBandBuffers(smoothedLayers, nTimelines) {
        const vertexCount = smoothedLayers[0].length;
        const cumBufs = Array.from({ length: MAX_TIMELINES }, () => new Float32Array(vertexCount));

        for (let v = 0; v < vertexCount; v++) {
            let cum = 0;
            for (let t = 0; t < nTimelines; t++) {
                cum        += smoothedLayers[t][v] ?? 0;
                cumBufs[t][v] = cum > 0 ? Math.log(cum + 1) * 15 : 0;
            }
        }
        return cumBufs;
    }

    // 4. Write all computed data into GPU geometry buffers
    function writeGeometry(smoothHeights, bandBufs, nTimelines) {
        const posAttr     = geometry.attributes.position;
        const vertexCount = posAttr.count;
        const heights     = new Float32Array(vertexCount);

        let maxHeight = -Infinity, minHeight = Infinity;
        let runningTotal = 0, nonZeroCount = 0;

        for (let i = 0; i < vertexCount; i++) {
            const h = smoothHeights[i] < 0.55 ? 0 : smoothHeights[i];
            heights[i]                = h;
            posAttr.array[i * 3 + 1] = h;
            if (h > maxHeight) maxHeight = h;
            if (h > 0) {
                if (h < minHeight) minHeight = h;
                runningTotal += h;
                nonZeroCount++;
            }
        }

        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();

        for (let t = 0; t < MAX_TIMELINES; t++) {
            geometry.setAttribute(`band${t}`, new THREE.Float32BufferAttribute(bandBufs[t], 1));
        }
        geometry.setAttribute('heightBuffer', new THREE.Float32BufferAttribute(heights, 1));

        geometry.userData.numTimelines  = nTimelines;
        geometry.userData.maxHeight     = maxHeight;
        geometry.userData.minHeight     = minHeight === Infinity ? 0 : minHeight;
        geometry.userData.averageHeight = nonZeroCount > 0 ? runningTotal / nonZeroCount : 0;
        geometry.userData.maxTimelines  = MAX_TIMELINES;
    }

    // 5. Build the TSL material from current geometry state
    function buildMaterial() {
        const mat       = getMat3(geometry, null);
        mat.needsUpdate = true;
        return mat;
    }

    ///////////////////////////////////////////////////////////
    // WATCHERS
    ///////////////////////////////////////////////////////////

    // 1. Data changed — recompute everything and write to GPU
    useEffect(() => {
        if (!isReady) return;
        const gridMeta                            = computeGridMeta(tData);
        const { smoothHeights, smoothedLayers,
                numTimelines: nTimelines }        = computeSmoothedData(tData, gridMeta);
        const bandBufs                            = computeBandBuffers(smoothedLayers, nTimelines);
        writeGeometry(smoothHeights, bandBufs, nTimelines);
        setNumTimelines(nTimelines);  // triggers material rebuild via watcher 2
    }, [tData, isReady]);

    // 2. Geometry is ready / numTimelines changed — rebuild material
    const material = useMemo(() => {
        if (!isReady || numTimelines === 0) return null;
        return buildMaterial();
    }, [isReady, numTimelines, tData]);

    // 3.CLEANUP Material replaced or component unmounted — dispose GPU resources
    useEffect(() => {
        return () => {
            if (!material) return;
            const ud = material.userData;
            if (ud?.heightTexture)    ud.heightTexture.dispose();
            if (ud?.strataTexture)    ud.strataTexture.dispose();
            if (ud?.timelineTextures) ud.timelineTextures.forEach(t => t?.dispose());
            material.dispose();
        };
    }, [material]);

    // 4. Hover changed — update uniform directly, no rebuild
    useEffect(() => {
        if (!material?.userData?.hoverUVUniform) return;
        const u = material.userData.hoverUVUniform;
        hoverUV ? u.value.set(hoverUV.x, hoverUV.y) : u.value.set(-1.0, -1.0);
    }, [hoverUV, material]);

    // 5. Material ready — trigger render frame
    useEffect(() => {
        if (material && meshRef.current) invalidate();
    }, [material]);

    ///////////////////////////////////////////////////////////
    // RENDER
    ///////////////////////////////////////////////////////////
    if (!isReady || !material) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            position={[0, 0, 0]}
            raycast={emptyRaycast}
        />
    );
}