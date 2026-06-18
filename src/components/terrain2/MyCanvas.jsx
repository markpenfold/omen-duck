import { Canvas, useThree, useFrame } from '@react-three/fiber'
import {WebGPURenderer} from '@/lib/three-webgpu';
import { TerrainScene } from './TerrainScene';
import { useEffect, useRef, useState } from 'react';

function CameraLogger() {
  const { camera } = useThree()

  useFrame(() => {
    console.log('Camera position:', camera.position.toArray())
  })

  return null
}

export default function MyCanvas({ className, endpoint, onHover }){
  const [key, setKey] = useState(0);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    let rafId = null;

    // Handle visibility change (wake from sleep)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible again - checking WebGL context');

        // Check if renderer is still valid
        if (rendererRef.current) {
          try {
            // Try to access a renderer property - will throw if context is lost
            const ext = rendererRef.current.backend?.device;
            if (!ext) {
              console.log('Renderer invalid, remounting...');
              setKey(prev => prev + 1);
            }
          } catch (error) {
            console.log('Renderer check failed, remounting...', error);
            setKey(prev => prev + 1);
          }
        }
      }
    };

    // Handle context loss on the canvas element
    const handleContextLost = (event) => {
      console.warn('WebGL context lost - preventing default and preparing remount');
      event.preventDefault();
      // Delay remount slightly to allow context loss to complete
      rafId = requestAnimationFrame(() => {
        setKey(prev => prev + 1);
      });
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored - remounting Canvas');
      setKey(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add context loss handlers if canvas element exists
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      console.log('Cleaning up Canvas resources');
    };
  }, []);

  return (
    <div ref={canvasRef} style={{ height: '100%', width: '100%' }}>
      <Canvas
      
          key={key}
          style={{
            background: 'linear-gradient(to bottom, #111a2e 0%, #34211a 100%)',
            width: '100%',   // 👈 add this
            height: '100%',
          }}
          camera={{ position: [3, 110, 100] }}
          frameloop="demand"   // 👈 add this — only render when invalidate() is called
          gl={async (props) => {
            try {
              const renderer = new WebGPURenderer({
                ...props,
                antialias: true,
                samples: 4
              });
              await renderer.init();
              rendererRef.current = renderer;
              return renderer;
            } catch (error) {
              console.error('Failed to initialize WebGPU renderer:', error);
              throw error;
            }
          }}
          onCreated={({ gl, size, camera }) => {
            // Force correct size and a render pass after async renderer is ready
            gl.setSize(size.width, size.height);
            camera.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
          }}
        >
          <TerrainScene onHover={onHover} />
      </Canvas>
    </div>
)

}