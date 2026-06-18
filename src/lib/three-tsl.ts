// lib/three-tsl.ts
// Centralized TSL imports to prevent bundle duplication
export {
  //top level
  Fn,
  // Math/utility functions
  distance,
  mix,
  step,
  float,
  clamp,
  abs,
  
  
  // Vectors
  vec2,
  vec3,
  
  // Shader nodes
  color,
  uniform,
  uniformArray,
  uv,
  positionLocal,
  attribute,
  texture,
  varying,
} from 'three/tsl';


//distance, step, vec3, vec4, color, uniform, mix, uv, positionLocal, attribute, float, clamp, abs, Fn 