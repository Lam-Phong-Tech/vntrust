"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── World Markers (Vietnam focused) ───────────────────────────────────────────
export const MARKERS = [
  // North
  { id: 0, name: "Lai Châu", country: "Việt Nam", lat: 22.39, lon: 103.15, scans: 1200, fake: 5, type: "normal", color: "#4ade80" },
  { id: 1, name: "Điện Biên", country: "Việt Nam", lat: 21.38, lon: 103.02, scans: 1800, fake: 12, type: "warning", color: "#f97316" },
  { id: 2, name: "Lào Cai", country: "Việt Nam", lat: 22.48, lon: 103.97, scans: 3400, fake: 21, type: "normal", color: "#4ade80" },
  { id: 3, name: "Tuyên Quang", country: "Việt Nam", lat: 21.82, lon: 105.23, scans: 2100, fake: 0, type: "normal", color: "#4ade80" },
  { id: 4, name: "Cao Bằng", country: "Việt Nam", lat: 22.66, lon: 106.26, scans: 1540, fake: 8, type: "normal", color: "#4ade80" },
  { id: 5, name: "Lạng Sơn", country: "Việt Nam", lat: 21.85, lon: 106.75, scans: 4300, fake: 87, type: "hot", color: "#fbbf24" },
  { id: 6, name: "Sơn La", country: "Việt Nam", lat: 21.32, lon: 103.91, scans: 1950, fake: 4, type: "normal", color: "#4ade80" },
  { id: 7, name: "Phú Thọ", country: "Việt Nam", lat: 21.34, lon: 105.22, scans: 2230, fake: 15, type: "warning", color: "#f97316" },
  { id: 8, name: "Thái Nguyên", country: "Việt Nam", lat: 21.59, lon: 105.84, scans: 3100, fake: 11, type: "normal", color: "#4ade80" },
  { id: 9, name: "Bắc Ninh", country: "Việt Nam", lat: 21.18, lon: 106.07, scans: 8900, fake: 42, type: "hot", color: "#fbbf24" },
  { id: 10, name: "Quảng Ninh", country: "Việt Nam", lat: 21.04, lon: 107.19, scans: 6100, fake: 75, type: "hot", color: "#fbbf24" },
  { id: 11, name: "Hà Nội", country: "Việt Nam", lat: 21.03, lon: 105.85, scans: 15210, fake: 98, type: "hot", color: "#fbbf24" },
  { id: 12, name: "Hải Phòng", country: "Việt Nam", lat: 20.84, lon: 106.68, scans: 5100, fake: 55, type: "warning", color: "#f97316" },
  { id: 13, name: "Hưng Yên", country: "Việt Nam", lat: 20.65, lon: 106.05, scans: 2750, fake: 9, type: "normal", color: "#4ade80" },
  { id: 14, name: "Ninh Bình", country: "Việt Nam", lat: 20.25, lon: 105.97, scans: 1800, fake: 0, type: "normal", color: "#4ade80" },
  // Central
  { id: 15, name: "Thanh Hóa", country: "Việt Nam", lat: 19.80, lon: 105.77, scans: 2300, fake: 18, type: "normal", color: "#4ade80" },
  { id: 16, name: "Nghệ An", country: "Việt Nam", lat: 19.06, lon: 104.97, scans: 2100, fake: 10, type: "normal", color: "#4ade80" },
  { id: 17, name: "Hà Tĩnh", country: "Việt Nam", lat: 18.34, lon: 105.90, scans: 1500, fake: 2, type: "normal", color: "#4ade80" },
  { id: 18, name: "Quảng Trị", country: "Việt Nam", lat: 16.74, lon: 107.19, scans: 1100, fake: 4, type: "normal", color: "#4ade80" },
  { id: 19, name: "Thừa Thiên Huế", country: "Việt Nam", lat: 16.46, lon: 107.59, scans: 2100, fake: 14, type: "normal", color: "#4ade80" },
  { id: 20, name: "Đà Nẵng", country: "Việt Nam", lat: 16.07, lon: 108.21, scans: 5580, fake: 28, type: "warning", color: "#f97316" },
  { id: 21, name: "Quảng Ngãi", country: "Việt Nam", lat: 15.11, lon: 108.80, scans: 1400, fake: 6, type: "normal", color: "#4ade80" },
  { id: 22, name: "Gia Lai", country: "Việt Nam", lat: 13.98, lon: 108.00, scans: 2500, fake: 22, type: "warning", color: "#f97316" },
  { id: 23, name: "Đắk Lắk", country: "Việt Nam", lat: 12.66, lon: 108.03, scans: 3200, fake: 35, type: "warning", color: "#f97316" },
  { id: 24, name: "Khánh Hòa", country: "Việt Nam", lat: 12.24, lon: 109.19, scans: 2800, fake: 8, type: "normal", color: "#4ade80" },
  { id: 25, name: "Lâm Đồng", country: "Việt Nam", lat: 11.54, lon: 108.08, scans: 3100, fake: 16, type: "normal", color: "#4ade80" },
  // South
  { id: 26, name: "Đồng Nai", country: "Việt Nam", lat: 10.95, lon: 106.82, scans: 6900, fake: 87, type: "hot", color: "#fbbf24" },
  { id: 27, name: "Tây Ninh", country: "Việt Nam", lat: 11.30, lon: 106.10, scans: 4200, fake: 64, type: "warning", color: "#f97316" },
  { id: 28, name: "Đồng Tháp", country: "Việt Nam", lat: 10.45, lon: 105.63, scans: 2600, fake: 18, type: "normal", color: "#4ade80" },
  { id: 29, name: "An Giang", country: "Việt Nam", lat: 10.37, lon: 105.43, scans: 3500, fake: 22, type: "warning", color: "#f97316" },
  { id: 30, name: "TP. Hồ Chí Minh", country: "Việt Nam", lat: 10.82, lon: 106.63, scans: 18420, fake: 142, type: "hot", color: "#fbbf24" },
  { id: 31, name: "Vĩnh Long", country: "Việt Nam", lat: 10.25, lon: 105.96, scans: 1900, fake: 5, type: "normal", color: "#4ade80" },
  { id: 32, name: "Cần Thơ", country: "Việt Nam", lat: 10.04, lon: 105.74, scans: 3240, fake: 12, type: "normal", color: "#4ade80" },
  { id: 33, name: "Cà Mau", country: "Việt Nam", lat: 9.17, lon: 105.15, scans: 2200, fake: 15, type: "normal", color: "#4ade80" },
  { id: 34, name: "Đảo Phú Quốc", country: "Việt Nam", lat: 10.22, lon: 103.96, scans: 4100, fake: 33, type: "warning", color: "#f97316" },
  { id: 35, name: "QĐ Hoàng Sa", country: "Việt Nam", lat: 16.83, lon: 112.33, scans: 50, fake: 0, type: "normal", color: "#4ade80" },
  { id: 36, name: "QĐ Trường Sa", country: "Việt Nam", lat: 8.64, lon: 111.91, scans: 80, fake: 0, type: "normal", color: "#4ade80" },
];

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

interface ScreenMarker { id: number; x: number; y: number; visible: boolean; scale: number }

export default function GlobeCanvas({ onMarkerClick }: { onMarkerClick: (m: typeof MARKERS[0]) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [screenMarkers, setScreenMarkers] = useState<ScreenMarker[]>([]);

  const updateMarkers = useCallback(() => {
    const cam = cameraRef.current;
    const globe = globeRef.current;
    const mount = mountRef.current;
    if (!cam || !globe || !mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    const updated = MARKERS.map((m) => {
      const wp = latLonToVec3(m.lat, m.lon, 1.0).applyMatrix4(globe.matrixWorld);
      const dir = wp.clone().normalize();
      const cam_dir = cam.position.clone().normalize();
      const dot = dir.dot(cam_dir);
      const ndc = wp.clone().project(cam);
      // scale markers by "depth" — closer to center of facing = bigger
      const scale = Math.max(0.4, dot);
      return { id: m.id, x: ((ndc.x + 1) / 2) * W, y: ((-ndc.y + 1) / 2) * H, visible: dot > 0.08, scale };
    });
    setScreenMarkers(updated);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 500;
    const H = mount.clientHeight || 500;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 1.5); // Zoomed in closely so Vietnam takes up more space
    cameraRef.current = camera;

    // ── Globe ─────────────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();
    const geo = new THREE.SphereGeometry(1, 80, 80);

    // Custom shader material for the stylish blue and white globe
    const globeMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * vec4(vPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          // Distinguish land from water (water's red channel is very low)
          float landMask = smoothstep(0.04, 0.15, tex.r);
          
          // Ocean is now light (inverted)
          vec3 waterColorTop = vec3(0.95, 0.98, 1.0);
          vec3 waterColorBot = vec3(0.85, 0.92, 0.98);
          vec3 waterColor = mix(waterColorBot, waterColorTop, vUv.y);
          
          // Landmass is now blue 
          vec3 landColorTop = vec3(0.2, 0.55, 0.9);
          vec3 landColorBot = vec3(0.0, 0.25, 0.7);
          vec3 landColor = mix(landColorBot, landColorTop, vUv.y);
          
          vec3 finalColor = mix(waterColor, landColor, landMask);
          
          // Basic Lighting
          vec3 lightDir = normalize(vec3(3.0, 5.0, 2.0));
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 ambient = vec3(0.7, 0.8, 0.9);
          
          // Outer edge rim highlight
          float rim = 1.0 - max(dot(normalize(-vPosition), vNormal), 0.0);
          rim = smoothstep(0.5, 1.0, rim);
          vec3 rimGlow = mix(vec3(0.8, 0.9, 1.0), vec3(0.3, 0.6, 1.0), landMask) * rim * 0.4;
          
          gl_FragColor = vec4(finalColor * (ambient + vec3(0.3) * diff) + rimGlow, 1.0);
        }
      `
    });

    const globe = new THREE.Mesh(geo, globeMat);
    globeRef.current = globe;
    scene.add(globe);

    // Focus camera directly on Vietnam (Lat 16, Lon 108)
    globe.rotation.y = 198 * (Math.PI / 180); // Correctly centering to +Z axis
    globe.rotation.x = 0.2; // Slight downward tilt

    // Load earth texture to use as a mask
    loader.load("/earth_day.jpg",
      (tex) => { globeMat.uniforms.uMap.value = tex; globeMat.needsUpdate = true; },
      undefined, () => { });

    // ── Atmosphere (outer glow) ───────────────────────────────────────────────
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vPos = vec3(modelViewMatrix * vec4(position,1.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main(){
          float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0)));
          rim = pow(rim, 3.5);
          vec3 color = mix(vec3(0.7, 0.85, 1.0), vec3(0.95, 0.98, 1.0), rim);
          gl_FragColor = vec4(color, rim * 0.6);
        }`,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.07, 64, 64), atmMat));

    // ── Inner atmosphere (thin haze ring) ─────────────────────────────────────
    const hazeGeo = new THREE.SphereGeometry(1.015, 64, 64);
    const hazeMat = new THREE.MeshPhongMaterial({
      color: 0x66bbff,
      transparent: true,
      opacity: 0.25,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(hazeGeo, hazeMat));

    // ── Grid lines ─────────────────────────────────────────────────────────────
    const gridMat = new THREE.LineBasicMaterial({ color: 0x4499cc, transparent: true, opacity: 0.07 });
    for (let la = -80; la <= 80; la += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lo = -180; lo <= 180; lo += 3) pts.push(latLonToVec3(la, lo, 1.003));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lo = -180; lo <= 180; lo += 30) {
      const pts: THREE.Vector3[] = [];
      for (let la = -90; la <= 90; la += 3) pts.push(latLonToVec3(la, lo, 1.003));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    // Equator highlight
    const eqPts: THREE.Vector3[] = [];
    for (let lo = -180; lo <= 180; lo += 1) eqPts.push(latLonToVec3(0, lo, 1.004));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts),
      new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.2 })));

    // ── Lighting ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 1.2));
    const sun = new THREE.DirectionalLight(0xfff0dd, 2.0);
    sun.position.set(5, 2, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x1144aa, 0.5);
    fill.position.set(-4, -2, -3);
    scene.add(fill);

    // ── Animation ─────────────────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (autoRotate.current) globe.rotation.y += 0.0012;
      renderer.render(scene, camera);
      updateMarkers();
    };
    animate();

    // ── Drag (mouse) ──────────────────────────────────────────────────────────
    const canvas = renderer.domElement;

    const resetAutoRotate = () => {
      // Intentionally left disabled to keep manual focus.
    };

    const onMouseDown = (e: MouseEvent) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; resetAutoRotate(); };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x + dy * 0.005));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };

    // ── Drag (touch) ───────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      isDragging.current = true; prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; resetAutoRotate();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouse.current.x, dy = e.touches[0].clientY - prevMouse.current.y;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x + dy * 0.005));
      prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { isDragging.current = false; };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    // ── Resize ─────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      ro.disconnect();
      if (autoTimer.current) clearTimeout(autoTimer.current);
      renderer.dispose();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, [updateMarkers]);

  const typeStyle = {
    hot: { bg: "bg-amber-400", ring: "border-amber-300/80", glow: "rgba(251,191,36,0.7)", size: 14 },
    warning: { bg: "bg-orange-500", ring: "border-orange-400/80", glow: "rgba(249,115,22,0.6)", size: 11 },
    normal: { bg: "bg-cyan-400", ring: "border-cyan-300/80", glow: "rgba(34,211,238,0.5)", size: 9 },
  };

  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing select-none" ref={mountRef}>
      {/* HTML marker overlay */}
      {screenMarkers.map((sm) => {
        const m = MARKERS[sm.id];
        if (!sm.visible) return null;
        const s = typeStyle[m.type as keyof typeof typeStyle];
        const sz = Math.round(s.size * Math.min(1, sm.scale * 1.3));

        return (
          <button
            key={m.id}
            onClick={() => onMarkerClick(m)}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
            style={{ left: sm.x, top: sm.y, transition: "opacity 0.15s" }}
          >
            {/* Pulse ring for hot markers */}
            {m.type === "hot" && (
              <div className="absolute rounded-full animate-ping opacity-30"
                style={{ width: sz * 2.4, height: sz * 2.4, background: s.glow, top: -sz * 0.7, left: -sz * 0.7 }} />
            )}
            {/* Main dot */}
            <div
              className={`rounded-full border-2 ${s.ring} transition-transform group-hover:scale-150`}
              style={{
                width: sz, height: sz,
                background: m.type === "hot"
                  ? `linear-gradient(135deg, #fcd34d, #f59e0b)`
                  : m.type === "warning"
                    ? `linear-gradient(135deg, #fb923c, #ea580c)`
                    : `linear-gradient(135deg, #67e8f9, #0891b2)`,
                boxShadow: `0 0 ${sz}px ${s.glow}, 0 0 ${sz * 0.5}px ${s.glow}`,
              }}
            />
            {/* Permanent Label */}
            <div className={`absolute top-1/2 left-full ml-1.5 -translate-y-1/2 whitespace-nowrap pointer-events-none transition-opacity duration-300 ${sm.scale < 0.6 ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[10px] font-bold text-white tracking-wide" style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}>{m.name}</span>
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
              <div className="rounded-xl border border-white/20 backdrop-blur-md px-3 py-2 min-w-[140px] shadow-2xl"
                style={{ background: "rgba(8,22,40,0.92)" }}>
                <p className="text-xs font-black text-white">{m.name}</p>
                <p className="text-[9px] text-slate-400">{m.country}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] text-cyan-400 font-bold">{m.scans.toLocaleString()} quét</span>
                  {m.fake > 0 && <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">⚠ {m.fake}</span>}
                </div>
              </div>
              <div className="w-2 h-2 bg-[#081628] border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
