/**
 * 3D Card — Three.js via expo-gl
 * No idle sway. Returns to rest after 2s. Drag to spin, double-tap to flip.
 */
import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Dimensions, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, loadTextureAsync } from 'expo-three';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_W = SCREEN_W - 40;
const GL_W = PANEL_W;
const GL_H = PANEL_W * 0.62;

const CAM_FOV = 40;
const CAM_Z = 4.6;
const VIS_H = 2 * Math.tan((CAM_FOV * Math.PI / 180) / 2) * CAM_Z;
const ASPECT = GL_W / GL_H;
const VIS_W = VIS_H * ASPECT;
const CW = VIS_W * 0.88;
const CH = CW / 1.586;
const CD = 0.05;
const CR = CW * 0.04;
const CSEGS = 10;

const SENS = 0.0096;
const FRICTION = 0.94;
const FLIP_SPRING = 0.12;
const REST_X = 0.06;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function fixUVs(geo: THREE.ShapeGeometry, w: number, h: number) {
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
}

export default function Card3D() {
  const grp = useRef<THREE.Group | null>(null);
  const rot = useRef({ x: REST_X, y: 0 });
  const tgt = useRef({ x: REST_X, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const drg = useRef(false);
  const lt = useRef(Date.now());
  const fb = useRef(0);
  const flp = useRef(false);
  const prv = useRef({ x: 0, y: 0 });
  const tt = useRef(0);

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: (_, g) => {
        drg.current = true;
        prv.current = { x: g.x0, y: g.y0 };
        vel.current = { x: 0, y: 0 };
        lt.current = Date.now();
      },
      onPanResponderMove: (_, g) => {
        const dx = g.moveX - prv.current.x;
        const dy = g.moveY - prv.current.y;
        prv.current = { x: g.moveX, y: g.moveY };
        vel.current.y = dx * SENS;
        vel.current.x = -dy * SENS;
        tgt.current.y += vel.current.y;
        tgt.current.x += vel.current.x;
        tgt.current.x = Math.max(-1.05, Math.min(1.05, tgt.current.x));
        lt.current = Date.now();
      },
      onPanResponderRelease: (_, g) => {
        drg.current = false;
        lt.current = Date.now();
        if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
          const now = Date.now();
          if (now - tt.current < 300) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            flp.current = true;
            fb.current += Math.PI;
            tt.current = 0;
          } else {
            tt.current = now;
          }
          vel.current = { x: 0, y: 0 };
        }
      },
    })
  ).current;

  const onCreate = useCallback(async (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(CAM_FOV, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    cam.position.set(0, 0, CAM_Z);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 0.3);
    sun.position.set(0, 3, 6);
    scene.add(sun);

    let fTex: THREE.Texture | null = null;
    let bTex: THREE.Texture | null = null;
    try {
      [fTex, bTex] = await Promise.all([
        loadTextureAsync({ asset: require('../../pics/1.png') }),
        loadTextureAsync({ asset: require('../../pics/2.png') }),
      ]);
    } catch (e) {
      console.warn('Tex err:', e);
    }
    [fTex, bTex].forEach(t => {
      if (!t) return;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      (t as any).isVideoTexture = true;
      (t as any).update = () => {};
      t.needsUpdate = true;
    });

    const card = new THREE.Group();
    scene.add(card);
    grp.current = card;

    // Body
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(CW, CH, CR), {
      depth: CD, bevelEnabled: false, curveSegments: CSEGS,
    });
    bodyGeo.translate(0, 0, -CD / 2);
    const goldEdge = new THREE.MeshBasicMaterial({ color: 0xd4aa3a });
    const noCap = new THREE.MeshBasicMaterial({ visible: false, colorWrite: false, depthWrite: false });
    card.add(new THREE.Mesh(bodyGeo, [goldEdge, noCap]));

    // Faces
    const ins = 0.003;
    const fW = CW - ins * 2, fH = CH - ins * 2, fR = Math.max(0.02, CR - ins);

    const frontGeo = new THREE.ShapeGeometry(roundedRect(fW, fH, fR), CSEGS);
    fixUVs(frontGeo, fW, fH);
    const front = new THREE.Mesh(frontGeo, fTex ? new THREE.MeshBasicMaterial({ map: fTex }) : new THREE.MeshBasicMaterial({ color: 0xdde4ef }));
    front.position.z = CD / 2 + 0.002;
    card.add(front);

    const backGeo = new THREE.ShapeGeometry(roundedRect(fW, fH, fR), CSEGS);
    fixUVs(backGeo, fW, fH);
    const back = new THREE.Mesh(backGeo, bTex ? new THREE.MeshBasicMaterial({ map: bTex }) : new THREE.MeshBasicMaterial({ color: 0xd8eaf5 }));
    back.position.z = -(CD / 2 + 0.002);
    back.rotation.y = Math.PI;
    card.add(back);

    // Corner slices
    const sliceGeo = new THREE.ShapeGeometry(roundedRect(CW, CH, CR), CSEGS);
    const sliceMat = new THREE.MeshBasicMaterial({ color: 0xc49030, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const sl = new THREE.Mesh(sliceGeo, sliceMat);
      sl.position.z = -CD / 2 + (CD / 5) * i;
      card.add(sl);
    }

    card.rotation.x = REST_X;

    // Render loop — NO idle sway, just return to rest
    const tick = () => {
      requestAnimationFrame(tick);
      if (!grp.current) return;

      const now = Date.now();
      const idle = now - lt.current;

      // Flip
      if (flp.current) {
        const diff = fb.current - tgt.current.y;
        if (Math.abs(diff) < 0.003) {
          tgt.current.y = fb.current;
          flp.current = false;
          lt.current = now;
        } else {
          tgt.current.y += diff * FLIP_SPRING;
        }
      }

      if (!drg.current && !flp.current) {
        // Momentum
        if (Math.abs(vel.current.y) > 0.00002 || Math.abs(vel.current.x) > 0.00002) {
          tgt.current.y += vel.current.y;
          tgt.current.x += vel.current.x;
          vel.current.y *= FRICTION;
          vel.current.x *= FRICTION;
          tgt.current.x = Math.max(-1.05, Math.min(1.05, tgt.current.x));
          if (Math.abs(vel.current.y) < 0.0002 && Math.abs(vel.current.x) < 0.0002) {
            vel.current.y = 0;
            vel.current.x = 0;
          } else {
            lt.current = now;
          }
        }

        // Return to rest after 2s — no sway
        if (idle > 2000) {
          tgt.current.y += (fb.current - tgt.current.y) * 0.04;
          tgt.current.x += (REST_X - tgt.current.x) * 0.04;
        }
      }

      rot.current.x += (tgt.current.x - rot.current.x) * 0.22;
      rot.current.y += (tgt.current.y - rot.current.y) * 0.22;
      grp.current.rotation.x = rot.current.x;
      grp.current.rotation.y = rot.current.y;

      renderer.render(scene, cam);
      gl.endFrameEXP();
    };
    tick();
  }, []);

  return (
    <View style={styles.wrap} {...pr.panHandlers}>
      <GLView style={styles.gl} onContextCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: GL_W,
    height: GL_H,
    alignSelf: 'center',
  },
  gl: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
