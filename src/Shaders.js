import * as THREE from 'three';

/**
 * Custom Shaders and Material Enhancers for the Mario Kart Stylized Look.
 * Injects Fresnel rim lighting and vibrant specular enamel finish directly
 * into Three.js standard materials via onBeforeCompile.
 */
export class ShaderFactory {
  /**
   * Creates an enamel toy material with stylized Fresnel rim glow.
   * @param {Object} params - { color, metalness, roughness, rimColor, rimPower, rimIntensity }
   */
  static createToyMaterial(params = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color: params.color ?? 0xffffff,
      metalness: params.metalness ?? 0.25,
      roughness: params.roughness ?? 0.35,
    });

    const rimColor = new THREE.Color(params.rimColor ?? 0xffffff);
    const rimPower = params.rimPower ?? 2.8;
    const rimIntensity = params.rimIntensity ?? 0.65;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimColor };
      shader.uniforms.uRimPower = { value: rimPower };
      shader.uniforms.uRimIntensity = { value: rimIntensity };

      // Inject uniforms
      shader.fragmentShader = `
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uRimIntensity;
        ${shader.fragmentShader}
      `;

      // Inject Fresnel rim light calculation before outgoing light final output
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        
        // Stylized Fresnel Rim Highlight (Toy Enamel Sheen)
        vec3 viewDir = normalize(vViewPosition);
        float vDotN = clamp(dot(viewDir, normal), 0.0, 1.0);
        float fresnel = pow(1.0 - vDotN, uRimPower) * uRimIntensity;
        gl_FragColor.rgb += uRimColor * fresnel * 0.45;
        `
      );
    };

    return mat;
  }
}
