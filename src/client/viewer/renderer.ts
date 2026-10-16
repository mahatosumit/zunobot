import type { Batch, RobotModel } from './scene';
import type { Mat4, Vec3 } from './math';

const VERT = `#version 300 es
in vec3 aPos; in vec3 aNor; in vec2 aUv;
uniform mat4 uViewProj; uniform float uMirror;
out vec3 vPos; out vec3 vNor; out vec2 vUv;
void main() {
  vec3 p = aPos; vec3 n = aNor;
  if (uMirror < 0.0) { p.y = -p.y; n.y = -n.y; }
  vPos = p; vNor = n; vUv = aUv;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNor; in vec2 vUv;
uniform vec3 uCam; uniform vec3 uColor; uniform float uRough; uniform float uCoat; uniform float uEmissive;
uniform sampler2D uTex; uniform float uUseTex; uniform float uMirror;
out vec4 outColor;

// Procedural studio environment: soft boxes, no texture download.
vec3 studio(vec3 r) {
  vec3 base = mix(vec3(0.045, 0.04, 0.035), vec3(0.26, 0.28, 0.32), smoothstep(-0.25, 0.9, r.y));
  float k = smoothstep(0.78, 0.92, dot(r, normalize(vec3(-0.55, 0.75, 0.55))));
  float s = smoothstep(0.86, 0.97, dot(r, normalize(vec3(0.9, 0.25, 0.3))));
  float b = smoothstep(0.8, 0.95, dot(r, normalize(vec3(0.1, 0.35, -0.9))));
  float f = smoothstep(0.55, 0.7, dot(r, normalize(vec3(0.0, 0.15, 1.0)))) * 0.25;
  return base + vec3(1.0, 0.88, 0.68) * k * 3.0 + vec3(0.7, 0.82, 1.0) * s * 1.6 + vec3(1.0) * b * 1.1 + vec3(1.0, 0.95, 0.85) * f;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec3 N = normalize(vNor);
  vec3 V = normalize(uCam - vPos);
  vec3 albedo = pow(uColor, vec3(2.2));
  vec3 em = vec3(0.0);
  if (uUseTex > 0.5) {
    vec3 t = pow(texture(uTex, vec2(vUv.x, 1.0 - vUv.y)).rgb, vec3(2.2));
    albedo = t; em = t * uEmissive * 2.2;
  }
  vec3 L1 = normalize(vec3(-0.5, 0.8, 0.65));
  vec3 L2 = normalize(vec3(0.85, 0.15, 0.4));
  vec3 L3 = normalize(vec3(0.0, 0.4, -1.0));
  vec3 c1 = vec3(1.0, 0.9, 0.75) * 2.3;
  vec3 c2 = vec3(0.45, 0.6, 1.0) * 0.65;
  vec3 c3 = vec3(1.0) * 0.8;
  float ao = 0.5 + 0.5 * smoothstep(0.0, 1.0, vPos.y);
  vec3 hemi = mix(vec3(0.13, 0.105, 0.07), vec3(0.3, 0.33, 0.4), N.y * 0.5 + 0.5) * ao;
  vec3 diffuse = albedo * (max(dot(N, L1), 0.0) * c1 + max(dot(N, L2), 0.0) * c2 + max(dot(N, L3), 0.0) * c3 + hemi);
  float NdV = max(dot(N, V), 0.0);
  float shin = mix(10.0, 260.0, pow(1.0 - uRough, 2.0));
  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), shin) * (1.0 - uRough) * 0.55;
  vec3 R = reflect(-V, N);
  float fres = 0.04 + 0.96 * pow(1.0 - NdV, 5.0);
  vec3 refl = studio(R) * (0.06 + fres) * uCoat * mix(1.0, 0.45, uRough);
  vec3 col = diffuse + spec * c1 + refl + albedo * pow(1.0 - NdV, 3.0) * 0.1 + em;
  col = aces(col * 0.92);
  col = pow(col, vec3(1.0 / 2.2));
  float a = 1.0;
  if (uMirror < 0.0) { a = 0.3 * (1.0 - smoothstep(0.0, 1.5, -vPos.y)); col *= a; }
  outColor = vec4(col, a);
}`;

const SHADOW_VERT = `#version 300 es
in vec3 aPos; uniform mat4 uViewProj; out vec3 vPos;
void main() { vPos = aPos; gl_Position = uViewProj * vec4(aPos, 1.0); }`;
const SHADOW_FRAG = `#version 300 es
precision mediump float; in vec3 vPos; out vec4 outColor;
void main() {
  float core = 1.0 - smoothstep(0.25, 1.0, length(vec2(vPos.x / 1.0, vPos.z / 0.8)));
  float soft = 1.0 - smoothstep(0.1, 1.0, length(vec2(vPos.x / 2.0, vPos.z / 1.5)));
  float a = clamp(0.7 * core * core + 0.3 * soft * soft, 0.0, 0.85);
  outColor = vec4(0.0, 0.0, 0.0, a);
}`;

interface GpuBatch { vao: WebGLVertexArrayObject; count: number; type: number; batch: Batch }

export interface Renderer {
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  render(viewProj: Mat4, cam: Vec3, opts: { mirror: boolean; blink: boolean }): void;
  dispose(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('Could not create shader');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`Shader error: ${gl.getShaderInfoLog(sh) ?? ''}`);
  return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram();
  if (!p) throw new Error('Could not create program');
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.bindAttribLocation(p, 1, 'aNor');
  gl.bindAttribLocation(p, 2, 'aUv');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Link error: ${gl.getProgramInfoLog(p) ?? ''}`);
  return p;
}

export function createRenderer(canvas: HTMLCanvasElement, model: RobotModel, faces: { open: HTMLCanvasElement; blink: HTMLCanvasElement }): Renderer {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'default' });
  if (!gl) throw new Error('WebGL 2 is not available');

  const main = program(gl, VERT, FRAG);
  const shadow = program(gl, SHADOW_VERT, SHADOW_FRAG);
  const u = (p: WebGLProgram, n: string): WebGLUniformLocation | null => gl.getUniformLocation(p, n);
  const U = {
    viewProj: u(main, 'uViewProj'), mirror: u(main, 'uMirror'), cam: u(main, 'uCam'), color: u(main, 'uColor'), rough: u(main, 'uRough'),
    coat: u(main, 'uCoat'), emissive: u(main, 'uEmissive'), tex: u(main, 'uTex'), useTex: u(main, 'uUseTex'),
  };
  const SU = { viewProj: u(shadow, 'uViewProj') };

  const buffers: WebGLBuffer[] = [];
  const makeBuffer = (target: number, data: ArrayBufferView): WebGLBuffer => {
    const b = gl.createBuffer();
    if (!b) throw new Error('Could not create buffer');
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    buffers.push(b);
    return b;
  };

  const batches: GpuBatch[] = model.batches.map((batch) => {
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create VAO');
    gl.bindVertexArray(vao);
    const attr = (loc: number, data: number[], size: number): void => {
      makeBuffer(gl.ARRAY_BUFFER, new Float32Array(data));
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr(0, batch.mesh.pos, 3);
    attr(1, batch.mesh.nor, 3);
    attr(2, batch.mesh.uv, 2);
    const big = batch.mesh.pos.length / 3 > 65535;
    makeBuffer(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(batch.mesh.idx) : new Uint16Array(batch.mesh.idx));
    gl.bindVertexArray(null);
    return { vao, count: batch.mesh.idx.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, batch };
  });

  // Floor quad used for the soft contact shadow
  const floorVao = gl.createVertexArray();
  if (!floorVao) throw new Error('Could not create VAO');
  gl.bindVertexArray(floorVao);
  makeBuffer(gl.ARRAY_BUFFER, new Float32Array([-3, 0.003, -3, 3, 0.003, -3, 3, 0.003, 3, -3, 0.003, 3]));
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  makeBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 0, 3, 2]));
  gl.bindVertexArray(null);

  const makeTexture = (src: HTMLCanvasElement): WebGLTexture => {
    const t = gl.createTexture();
    if (!t) throw new Error('Could not create texture');
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texOpen = makeTexture(faces.open);
  const texBlink = makeTexture(faces.blink);

  const drawBatches = (mirror: boolean, cam: Vec3, blink: boolean): void => {
    gl.uniform1f(U.mirror, mirror ? -1 : 1);
    gl.uniform3f(U.cam, cam[0], mirror ? -cam[1] : cam[1], cam[2]);
    for (const g of batches) {
      const m = g.batch.material;
      gl.uniform3f(U.color, m.color[0], m.color[1], m.color[2]);
      gl.uniform1f(U.rough, m.rough);
      gl.uniform1f(U.coat, m.coat);
      gl.uniform1f(U.emissive, m.emissive ?? 0);
      gl.uniform1f(U.useTex, m.textured ? 1 : 0);
      if (m.textured) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, blink ? texBlink : texOpen);
        gl.uniform1i(U.tex, 0);
      }
      gl.bindVertexArray(g.vao);
      gl.drawElements(gl.TRIANGLES, g.count, g.type, 0);
    }
  };

  return {
    resize(w, h, dpr) {
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      gl.viewport(0, 0, pw, ph);
    },
    render(viewProj, cam, { mirror, blink }) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(main);
      gl.uniformMatrix4fv(U.viewProj, false, viewProj);
      if (mirror && cam[1] > 0) {
        gl.frontFace(gl.CW);
        drawBatches(true, cam, blink);
        gl.frontFace(gl.CCW);
      }

      // Contact shadow on the floor, then the robot itself
      gl.useProgram(shadow);
      gl.uniformMatrix4fv(SU.viewProj, false, viewProj);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(floorVao);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);

      gl.useProgram(main);
      drawBatches(false, cam, blink);
      gl.bindVertexArray(null);
    },
    dispose() {
      for (const b of buffers) gl.deleteBuffer(b);
      for (const g of batches) gl.deleteVertexArray(g.vao);
      gl.deleteVertexArray(floorVao);
      gl.deleteTexture(texOpen);
      gl.deleteTexture(texBlink);
      gl.deleteProgram(main);
      gl.deleteProgram(shadow);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
