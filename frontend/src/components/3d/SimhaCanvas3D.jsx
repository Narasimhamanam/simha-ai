import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * SimhaCanvas3D — Perplexity Edition
 *
 * mode="login"     → full-viewport, 600 particles, orchestrated intro, no agent nodes
 * mode="workspace" → compact, 300 particles, agent orbit nodes
 */

const AGENT_NODES = [
  { id: "study",        label: "Study",        color: 0x20B2AA, angle: 0 },
  { id: "coding",       label: "Coding",       color: 0x818CF8, angle: Math.PI / 2 },
  { id: "productivity", label: "Productivity", color: 0x2DD4BF, angle: Math.PI },
  { id: "divine",       label: "Krishna AI",   color: 0x38BDF8, angle: (3 * Math.PI) / 2 },
];

export default function SimhaCanvas3D({ selectedAgent = "study", onSelectAgent, mode = "workspace" }) {
  const mountRef = useRef(null);
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isLogin = mode === "login";
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // ── SCENE ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isLogin ? 40 : 45, width / height, 0.1, 120);
    camera.position.set(0, 0, isLogin ? 9 : 7);

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLogin ? 1.3 : 1.1;
    container.appendChild(renderer.domElement);

    // ── LIGHTING ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const tealLight = new THREE.PointLight(0x2DD4BF, isLogin ? 3.5 : 2.5, 25);
    tealLight.position.set(4, 5, 6);
    scene.add(tealLight);

    const violetLight = new THREE.PointLight(0x818CF8, 2.0, 18);
    violetLight.position.set(-5, -3, 4);
    scene.add(violetLight);

    const cyanLight = new THREE.PointLight(0x38BDF8, 1.4, 14);
    cyanLight.position.set(0, -4, 3);
    scene.add(cyanLight);

    // ── GUARDIAN GROUP ──
    const guardian = new THREE.Group();
    scene.add(guardian);

    // Core: Faceted teal crystal head
    const coreGeo = new THREE.IcosahedronGeometry(isLogin ? 1.5 : 1.2, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x20B2AA,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    guardian.add(core);

    // Mane lattice (wireframe shell)
    const maneGeo = new THREE.IcosahedronGeometry(isLogin ? 1.7 : 1.35, 1);
    const maneMat = new THREE.MeshBasicMaterial({
      color: 0x2DD4BF, wireframe: true, transparent: true, opacity: 0.3,
    });
    const mane = new THREE.Mesh(maneGeo, maneMat);
    guardian.add(mane);

    // Eyes: dual emissive spheres
    const eyeGeo = new THREE.SphereGeometry(isLogin ? 0.15 : 0.12, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x2DD4BF, emissive: 0x2DD4BF, emissiveIntensity: 0, roughness: 0.1,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    leftEye.position.set(-0.42, 0.25, isLogin ? 1.2 : 0.95);
    guardian.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.42, 0.25, isLogin ? 1.2 : 0.95);
    guardian.add(rightEye);

    // Orbital energy rings
    const ringGeo = new THREE.TorusGeometry(isLogin ? 2.3 : 1.8, 0.015, 16, 100);
    const ring1 = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
      color: 0x818CF8, emissive: 0x818CF8, emissiveIntensity: 0.6, transparent: true, opacity: 0.5,
    }));
    ring1.rotation.x = Math.PI / 3;
    guardian.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
      color: 0x2DD4BF, emissive: 0x20B2AA, emissiveIntensity: 0.5, transparent: true, opacity: 0.35,
    }));
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    guardian.add(ring2);

    // ── AGENT SATELLITES (workspace mode only) ──
    const nodeMeshes = [];
    const beamLines = [];
    const orbitRadius = 2.7;

    if (!isLogin) {
      AGENT_NODES.forEach((agent) => {
        const grp = new THREE.Group();
        const nGeo = new THREE.SphereGeometry(0.22, 20, 20);
        const nMat = new THREE.MeshStandardMaterial({
          color: agent.color, emissive: agent.color, emissiveIntensity: 1.0, metalness: 0.5, roughness: 0.2,
        });
        const nMesh = new THREE.Mesh(nGeo, nMat);
        grp.add(nMesh);

        const hGeo = new THREE.RingGeometry(0.28, 0.34, 32);
        const hMat = new THREE.MeshBasicMaterial({ color: agent.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        const halo = new THREE.Mesh(hGeo, hMat);
        grp.add(halo);

        scene.add(grp);
        nodeMeshes.push({ group: grp, mesh: nMesh, halo, agent });

        // Beam
        const lGeo = new THREE.BufferGeometry();
        const lPos = new Float32Array(6);
        lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
        const lMat = new THREE.LineBasicMaterial({ color: agent.color, transparent: true, opacity: 0.3 });
        const beam = new THREE.Line(lGeo, lMat);
        scene.add(beam);
        beamLines.push({ line: beam, agent });
      });
    }

    // ── PARTICLE CONSTELLATION ──
    const pCount = isLogin ? 600 : 300;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const tealC = new THREE.Color(0x2DD4BF);
    const violetC = new THREE.Color(0x818CF8);
    const cyanC = new THREE.Color(0x38BDF8);

    // Store initial positions for login intro convergence
    const pInitPos = new Float32Array(pCount * 3);
    const pStartPos = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const i3 = i * 3;
      const r = (isLogin ? 3 : 2.5) + Math.random() * (isLogin ? 6 : 4.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pInitPos[i3]     = r * Math.sin(phi) * Math.cos(theta);
      pInitPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pInitPos[i3 + 2] = r * Math.cos(phi);

      if (isLogin) {
        pStartPos[i3]     = pInitPos[i3] * 3 + (Math.random() - 0.5) * 10;
        pStartPos[i3 + 1] = pInitPos[i3 + 1] * 3 + (Math.random() - 0.5) * 10;
        pStartPos[i3 + 2] = pInitPos[i3 + 2] * 3 + (Math.random() - 0.5) * 10;
        pPos[i3] = pStartPos[i3]; pPos[i3+1] = pStartPos[i3+1]; pPos[i3+2] = pStartPos[i3+2];
      } else {
        pPos[i3] = pInitPos[i3]; pPos[i3+1] = pInitPos[i3+1]; pPos[i3+2] = pInitPos[i3+2];
      }

      const c = i % 3 === 0 ? tealC : i % 3 === 1 ? violetC : cyanC;
      pCol[i3] = c.r; pCol[i3+1] = c.g; pCol[i3+2] = c.b;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
      size: isLogin ? 0.06 : 0.045, vertexColors: true, transparent: true,
      opacity: isLogin ? 0 : 0.7, blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── INTERACTION ──
    let mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
    const onMouse = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const onCanvasClick = (e) => {
      if (isLogin || !onSelectAgent) return;
      const rect = container.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const hits = raycaster.intersectObjects(nodeMeshes.map(n => n.mesh));
      if (hits.length > 0) {
        const found = nodeMeshes.find(n => n.mesh === hits[0].object);
        if (found) onSelectAgent(found.agent.id);
      }
    };
    container.addEventListener("click", onCanvasClick);

    const onResize = () => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── ANIMATION ──
    let frameId;
    const clock = new THREE.Clock();
    let introPhase = isLogin ? 0 : 2;
    let blinkTimer = 3 + Math.random() * 5;
    let isBlinking = false;
    let blinkProgress = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // ── LOGIN INTRO SEQUENCE ──
      if (isLogin && introPhase < 2) {
        if (introPhase === 0) {
          let allSettled = true;
          const posArr = particles.geometry.attributes.position.array;
          for (let i = 0; i < pCount; i++) {
            const i3 = i * 3;
            for (let a = 0; a < 3; a++) {
              posArr[i3+a] += (pInitPos[i3+a] - posArr[i3+a]) * 0.025;
              if (Math.abs(posArr[i3+a] - pInitPos[i3+a]) > 0.1) allSettled = false;
            }
          }
          particles.geometry.attributes.position.needsUpdate = true;
          pMat.opacity = Math.min(pMat.opacity + 0.008, 0.75);

          if (camera.position.z > 9) camera.position.z -= 0.02;
          if (allSettled || t > 4) introPhase = 1;
        }
        if (introPhase === 1) {
          const eyeIntensity = Math.min((t - 3) * 1.5, 3.0);
          leftEye.material.emissiveIntensity = eyeIntensity;
          rightEye.material.emissiveIntensity = eyeIntensity;
          if (eyeIntensity >= 3.0) introPhase = 2;
        }
      }

      // ── IDLE BLINK ──
      blinkTimer -= dt;
      if (blinkTimer <= 0 && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }
      if (isBlinking) {
        blinkProgress += dt * 6;
        const blinkVal = blinkProgress < 0.5
          ? 1 - blinkProgress * 2
          : (blinkProgress - 0.5) * 2;
        const baseIntensity = introPhase >= 2 ? 3.0 : leftEye.material.emissiveIntensity;
        leftEye.material.emissiveIntensity = baseIntensity * Math.max(0.1, blinkVal);
        rightEye.material.emissiveIntensity = baseIntensity * Math.max(0.1, blinkVal);
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkTimer = 3 + Math.random() * 6;
          leftEye.material.emissiveIntensity = baseIntensity;
          rightEye.material.emissiveIntensity = baseIntensity;
        }
      } else if (introPhase >= 2) {
        leftEye.material.emissiveIntensity = 3.0;
        rightEye.material.emissiveIntensity = 3.0;
      }

      // ── BREATHING PULSE ──
      const breath = 1 + Math.sin(t * 1.5) * 0.035;
      core.scale.setScalar(breath);
      mane.scale.setScalar(breath * 1.06);

      // ── MANE SWAY ──
      const manePositions = mane.geometry.attributes.position;
      if (!mane.userData.origPositions) {
        mane.userData.origPositions = new Float32Array(manePositions.array);
      }
      const orig = mane.userData.origPositions;
      for (let i = 0; i < manePositions.count; i++) {
        const i3 = i * 3;
        const noiseVal = Math.sin(t * 1.2 + orig[i3] * 3) * 0.03 +
                         Math.cos(t * 0.8 + orig[i3+1] * 4) * 0.025;
        manePositions.array[i3]     = orig[i3] + noiseVal;
        manePositions.array[i3 + 1] = orig[i3 + 1] + noiseVal * 0.8;
        manePositions.array[i3 + 2] = orig[i3 + 2] + noiseVal * 0.5;
      }
      manePositions.needsUpdate = true;

      // ── RING ROTATION ──
      ring1.rotation.z = t * 0.35;
      ring2.rotation.z = -t * 0.25;

      // ── CURSOR PARALLAX ──
      const maxRot = (12 * Math.PI) / 180;
      targetRotY += (mouseX * maxRot - targetRotY) * 0.04;
      targetRotX += (-mouseY * maxRot * 0.8 - targetRotX) * 0.04;
      guardian.rotation.y = targetRotY + Math.sin(t * 0.4) * 0.06;
      guardian.rotation.x = targetRotX;

      tealLight.position.x = 4 + mouseX * 2;
      tealLight.position.y = 5 - mouseY * 2;

      // ── PARTICLES DRIFT ──
      particles.rotation.y = t * 0.05;
      particles.rotation.x = Math.sin(t * 0.03) * 0.04;

      // ── AGENT SATELLITES ──
      const selected = selectedAgentRef.current;
      nodeMeshes.forEach((n, idx) => {
        const isActive = selected === n.agent.id;
        const angle = n.agent.angle + t * 0.3;
        const nx = Math.cos(angle) * orbitRadius;
        const ny = Math.sin(angle) * (orbitRadius * 0.4) + Math.sin(t * 1.8 + idx) * 0.12;
        const nz = Math.sin(angle) * (orbitRadius * 0.8);

        n.group.position.set(nx, ny, nz);
        n.halo.lookAt(camera.position);

        const ts = isActive ? 1.5 : 1.0;
        n.group.scale.lerp(new THREE.Vector3(ts, ts, ts), 0.08);
        n.mesh.material.emissiveIntensity = isActive ? 2.8 : 0.8;
        n.halo.material.opacity = isActive ? 0.85 : 0.3;

        const beam = beamLines[idx];
        if (beam) {
          const p = beam.line.geometry.attributes.position.array;
          p[0] = 0; p[1] = 0; p[2] = 0;
          p[3] = nx; p[4] = ny; p[5] = nz;
          beam.line.geometry.attributes.position.needsUpdate = true;
          beam.line.material.opacity = isActive ? 0.7 : 0.15;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("click", onCanvasClick);
      [coreGeo, coreMat, maneGeo, maneMat, eyeGeo, ringGeo, pGeo, pMat].forEach(r => r?.dispose());
      [leftEye.material, rightEye.material, ring1.material, ring2.material].forEach(m => m?.dispose());
      nodeMeshes.forEach(n => { n.mesh.geometry.dispose(); n.mesh.material.dispose(); n.halo.geometry.dispose(); n.halo.material.dispose(); });
      beamLines.forEach(b => { b.line.geometry.dispose(); b.line.material.dispose(); });
      if (renderer.domElement && container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [mode, onSelectAgent]);

  const h = mode === "login" ? "h-full" : "h-[240px] sm:h-[300px] md:h-[340px]";

  return (
    <div className={`relative w-full ${h} flex items-center justify-center select-none`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
