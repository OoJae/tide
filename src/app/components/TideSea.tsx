"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function TideSea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrap = canvas.parentElement;
    if (!wrap) return;

    let w = wrap.clientWidth;
    let h = wrap.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x06080a, 0.058);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 220);
    camera.position.set(0, 1.4, 14);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    /* ---------- sea plane ---------- */
    const SIZE = 140;
    const SEG = 180;
    const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geom.rotateX(-Math.PI / 2);
    const original = Float32Array.from(geom.attributes.position.array);

    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d11,
      metalness: 0.92,
      roughness: 0.28,
      flatShading: false,
    });
    const sea = new THREE.Mesh(geom, seaMat);
    sea.position.y = -0.05;
    scene.add(sea);

    /* ---------- secondary darker plane ---------- */
    const geom2 = new THREE.PlaneGeometry(SIZE, SIZE, 60, 60);
    geom2.rotateX(-Math.PI / 2);
    const original2 = Float32Array.from(geom2.attributes.position.array);
    const sea2 = new THREE.Mesh(
      geom2,
      new THREE.MeshStandardMaterial({
        color: 0x05070a,
        metalness: 0.85,
        roughness: 0.5,
      })
    );
    sea2.position.y = -0.6;
    scene.add(sea2);

    /* ---------- horizon glow ---------- */
    const horizonGeo = new THREE.PlaneGeometry(120, 30);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0xd49267,
      transparent: true,
      opacity: 0.0,
    });
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const cx = c.getContext("2d")!;
    const grd = cx.createLinearGradient(0, 128, 0, 0);
    grd.addColorStop(0.0, "rgba(212,146,103,0.85)");
    grd.addColorStop(0.45, "rgba(168,107,68,0.35)");
    grd.addColorStop(1.0, "rgba(6,8,10,0)");
    cx.fillStyle = grd;
    cx.fillRect(0, 0, 512, 128);
    const g2 = cx.createRadialGradient(256, 110, 0, 256, 110, 240);
    g2.addColorStop(0, "rgba(255,200,160,0.7)");
    g2.addColorStop(1, "rgba(255,200,160,0)");
    cx.fillStyle = g2;
    cx.fillRect(0, 0, 512, 128);
    const hTex = new THREE.CanvasTexture(c);
    hTex.colorSpace = THREE.SRGBColorSpace;
    horizonMat.map = hTex;
    horizonMat.opacity = 1.0;
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    horizon.position.set(0, 4.4, -55);
    scene.add(horizon);

    /* ---------- lights ---------- */
    scene.add(new THREE.AmbientLight(0x161a20, 0.85));

    const key = new THREE.DirectionalLight(0xd49267, 1.4);
    key.position.set(0, 1, -10);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x5d6c7a, 0.45);
    fill.position.set(2, 12, 6);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xa86b44, 0.55);
    rim.position.set(-4, 0.5, -8);
    scene.add(rim);

    /* ---------- floating motes ---------- */
    const moteCount = 90;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 40;
      motePos[i * 3 + 1] = Math.random() * 6 + 0.2;
      motePos[i * 3 + 2] = -Math.random() * 30 - 4;
    }
    moteGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(motePos, 3)
    );
    const moteMat = new THREE.PointsMaterial({
      color: 0xd49267,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    /* ---------- interaction ---------- */
    let targetMX = 0;
    let targetMY = 0;
    let mx = 0;
    let my = 0;
    const onPointerMove = (e: PointerEvent) => {
      targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    let scrollY = 0;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ---------- loop ---------- */
    const posAttr = geom.attributes.position;
    const posAttr2 = geom2.attributes.position;
    let t0 = performance.now();
    let t = 0;
    let rafId: number;

    function loop() {
      const now = performance.now();
      const dt = (now - t0) / 1000;
      t0 = now;
      t += dt;

      mx += (targetMX - mx) * 0.04;
      my += (targetMY - my) * 0.04;

      const scrollK = Math.min(scrollY / window.innerHeight, 1);
      const ampBoost = 1 + scrollK * 1.2;

      // primary surface
      const arr = posAttr.array;
      for (let i = 0; i < posAttr.count; i++) {
        const ix = i * 3;
        const x = original[ix];
        const z = original[ix + 2];
        const y =
          Math.sin(x * 0.18 + t * 0.55) * 0.32 * ampBoost +
          Math.sin(z * 0.24 + t * 0.38) * 0.26 * ampBoost +
          Math.sin((x + z) * 0.11 + t * 0.22) * 0.46 * ampBoost +
          Math.cos(x * 0.42 + z * 0.21 + t * 0.78) * 0.1 +
          Math.sin(x * 0.07 - z * 0.05 + t * 0.15) * 0.55 * ampBoost;
        arr[ix + 1] = y;
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();

      // secondary slow plate
      const arr2 = posAttr2.array;
      for (let i = 0; i < posAttr2.count; i++) {
        const ix = i * 3;
        const x = original2[ix];
        const z = original2[ix + 2];
        arr2[ix + 1] =
          Math.sin(x * 0.12 + t * 0.22) * 0.4 +
          Math.cos(z * 0.16 + t * 0.18) * 0.3;
      }
      posAttr2.needsUpdate = true;

      // motes drift
      const mp = moteGeo.attributes.position.array;
      for (let i = 0; i < moteCount; i++) {
        mp[i * 3 + 1] += dt * 0.12;
        mp[i * 3] -= dt * 0.06;
        if (mp[i * 3 + 1] > 6) {
          mp[i * 3 + 1] = 0.2;
          mp[i * 3] = (Math.random() - 0.5) * 40;
        }
      }
      moteGeo.attributes.position.needsUpdate = true;

      // camera parallax
      camera.position.x = mx * 0.6;
      camera.position.y = 1.4 - my * 0.25 + scrollK * 0.5;
      camera.lookAt(0, 0.6 + scrollK * 0.4, 0);

      // horizon brightness
      horizonMat.opacity = 0.85 - Math.max(0, my) * 0.25 + scrollK * 0.05;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geom.dispose();
      geom2.dispose();
      seaMat.dispose();
      horizonMat.dispose();
      moteMat.dispose();
      moteGeo.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[1]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
