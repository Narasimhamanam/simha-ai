import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * SimhaCanvas3D — Premium Interactive 3D Guardian
 *
 * mode="login"     → full-height hero, 550 particles, orchestrated intro, cinematic lighting
 * mode="workspace" → compact orbital workspace with active satellite agent nodes & energy beams
 */

const AGENT_NODES = [
  { id: "study",        label: "Study",        color: 0x2DD4BF, angle: 0 },
  { id: "coding",       label: "Coding",       color: 0x818CF8, angle: Math.PI / 2 },
  { id: "productivity", label: "Productivity", color: 0xA78BFA, angle: Math.PI },
  { id: "wisdom",       label: "Wisdom",       color: 0x00F0FF, angle: (3 * Math.PI) / 2 },
];

export default function SimhaCanvas3D({
  selectedAgent = "study",
  onSelectAgent,
  mode = "workspace",
}) {
  const mountRef = useRef(null);
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isLogin = mode === "login";
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 300;

    // ── SCENE & CAMERA ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isLogin ? 40 : 45, width / height, 0.1, 100);
    camera.position.set(0, 0, isLogin ? 8.5 : 6.8);

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLogin ? 1.25 : 1.1;
    container.appendChild(renderer.domElement);

    // ── LIGHTING ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const cyanLight = new THREE.PointLight(0x00F0FF, isLogin ? 3.0 : 2.4, 25);
    cyanLight.position.set(4, 5, 5);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(0x6366F1, 2.0, 18);
    violetLight.position.set(-5, -3, 4);
    scene.add(violetLight);

    const goldLight = new THREE.PointLight(0xFCD34D, 1.2, 14);
    goldLight.position.set(0, -4, 3);
    scene.add(goldLight);

    // ── SIMHA GUARDIAN GROUP ──
    const guardian = new THREE.Group();
    scene.add(guardian);

    // Core: Faceted crystalline lion head
    const coreGeo = new THREE.IcosahedronGeometry(isLogin ? 1.45 : 1.18, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0F766E,
      emissive: 0x042F2E,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    guardian.add(core);

    // Mane lattice (outer glowing wireframe shell)
    const maneGeo = new THREE.IcosahedronGeometry(isLogin ? 1.68 : 1.34, 1);
    const maneMat = new THREE.MeshBasicMaterial({
      color: 0x2DD4BF,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const mane = new THREE.Mesh(maneGeo, maneMat);
    guardian.add(mane);

    // Eyes: dual emissive cognitive spheres
    const eyeGeo = new THREE.SphereGeometry(isLogin ? 0.14 : 0.11, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00F0FF,
      emissive: 0x00F0FF,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    leftEye.position.set(-0.4, 0.24, isLogin ? 1.18 : 0.94);
    guardian.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.4, 0.24, isLogin ? 1.18 : 0.94);
    guardian.add(rightEye);

    // Orbital energy rings
    const ringGeo = new THREE.TorusGeometry(isLogin ? 2.2 : 1.75, 0.014, 16, 100);
    const ring1 = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({
        color: 0x6366F1,
        emissive: 0x6366F1,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5,
      })
    );
    ring1.rotation.x = Math.PI / 3;
    guardian.add(ring1);

    const ring2 = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({
        color: 0x00F0FF,
        emissive: 0x00F0FF,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.38,
      })
    );
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    guardian.add(ring2);

    // ── AGENT SATELLITES (workspace mode) ──
    const nodeMeshes = [];
    const beamLines = [];
    const orbitRadius = 2.6;

    if (!isLogin) {
      AGENT_NODES.forEach((agent) => {
        const grp = new THREE.Group();
        const nGeo = new THREE.SphereGeometry(0.2, 20, 20);
        const nMat = new THREE.MeshStandardMaterial({
          color: agent.color,
          emissive: agent.color,
          emissiveIntensity: 1.0,
          metalness: 0.4,
          roughness: 0.2,
        });
        const nMesh = new THREE.Mesh(nGeo, nMat);
        grp.add(nMesh);

        const hGeo = new THREE.RingGeometry(0.26, 0.32, 32);
        const hMat = new THREE.MeshBasicMaterial({
          color: agent.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        });
        const halo = new THREE.Mesh(hGeo, hMat);
        grp.add(halo);

        scene.add(grp);
        nodeMeshes.push({ group: grp, mesh: nMesh, halo, agent });

        // Energy beam connecting satellite to Simha core
        const lGeo = new THREE.BufferGeometry();
        const lPos = new Float32Array(6);
        lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
        const lMat = new THREE.LineBasicMaterial({
          color: agent.color,
          transparent: true,
          opacity: 0.25,
        });
        const beam = new THREE.Line(lGeo, lMat);
        scene.add(beam);
        beamLines.push({ line: beam, agent });
      });
    }

    // ── PARTICLE CONSTELLATION ──
    const pCount = isLogin ? 450 : 220;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const cyanC = new THREE.Color(0x00F0FF);
    const violetC = new THREE.Color(0x818CF8);
    const tealC = new THREE.Color(0x2DD4BF);

    for (let i = 0; i < pCount; i++) {
      const i3 = i * 3;
      const r = (isLogin ? 2.5 : 2.0) + Math.random() * (isLogin ? 5 : 3.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i3 + 2] = r * Math.cos(phi);

      const chosenColor = i % 3 === 0 ? cyanC : i % 3 === 1 ? violetC : tealC;
      pCol[i3] = chosenColor.r;
      pCol[i3 + 1] = chosenColor.g;
      pCol[i3 + 2] = chosenColor.b;
    }

    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));

    const pMat = new THREE.PointsMaterial({
      size: isLogin ? 0.05 : 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── INTERACTION HANDLERS ──
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

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

      const hits = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh));
      if (hits.length > 0) {
        const found = nodeMeshes.find((n) => n.mesh === hits[0].object);
        if (found) onSelectAgent(found.agent.id);
      }
    };
    container.addEventListener("click", onCanvasClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 380;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── ANIMATION LOOP ──
    let frameId;
    const clock = new THREE.Clock();
    let blinkTimer = 3.5;
    let isBlinking = false;
    let blinkProgress = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // 1. Idle Natural Eye Blink
      blinkTimer -= dt;
      if (blinkTimer <= 0 && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }
      if (isBlinking) {
        blinkProgress += dt * 6;
        const blinkVal = blinkProgress < 0.5 ? 1 - blinkProgress * 2 : (blinkProgress - 0.5) * 2;
        const intensity = 2.5 * Math.max(0.05, blinkVal);
        leftEye.material.emissiveIntensity = intensity;
        rightEye.material.emissiveIntensity = intensity;
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkTimer = 3 + Math.random() * 5;
          leftEye.material.emissiveIntensity = 2.5;
          rightEye.material.emissiveIntensity = 2.5;
        }
      }

      // 2. Subtle Breathing Pulse
      const breath = 1 + Math.sin(t * 1.5) * 0.035;
      core.scale.setScalar(breath);
      mane.scale.setScalar(breath * 1.05);

      // 3. Ring Rotations
      ring1.rotation.z = t * 0.35;
      ring2.rotation.z = -t * 0.25;

      // 4. Cursor Tracking Parallax with Damping
      const maxRot = (12 * Math.PI) / 180;
      targetRotY += (mouseX * maxRot - targetRotY) * 0.04;
      targetRotX += (-mouseY * maxRot * 0.8 - targetRotX) * 0.04;
      guardian.rotation.y = targetRotY + Math.sin(t * 0.4) * 0.06;
      guardian.rotation.x = targetRotX;

      cyanLight.position.x = 4 + mouseX * 2;
      cyanLight.position.y = 5 - mouseY * 2;

      // 5. Ambient Constellation Drift
      particles.rotation.y = t * 0.05;
      particles.rotation.x = Math.sin(t * 0.03) * 0.04;

      // 6. Orbiting Agent Satellites
      const selected = selectedAgentRef.current;
      nodeMeshes.forEach((n, idx) => {
        const isActive = selected === n.agent.id;
        const angle = n.agent.angle + t * 0.3;
        const nx = Math.cos(angle) * orbitRadius;
        const ny = Math.sin(angle) * (orbitRadius * 0.4) + Math.sin(t * 1.8 + idx) * 0.12;
        const nz = Math.sin(angle) * (orbitRadius * 0.8);

        n.group.position.set(nx, ny, nz);
        n.halo.lookAt(camera.position);

        const targetScale = isActive ? 1.45 : 1.0;
        n.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        n.mesh.material.emissiveIntensity = isActive ? 2.8 : 0.8;
        n.halo.material.opacity = isActive ? 0.85 : 0.3;

        const beam = beamLines[idx];
        if (beam) {
          const p = beam.line.geometry.attributes.position.array;
          p[0] = 0;
          p[1] = 0;
          p[2] = 0;
          p[3] = nx;
          p[4] = ny;
          p[5] = nz;
          beam.line.geometry.attributes.position.needsUpdate = true;
          beam.line.material.opacity = isActive ? 0.7 : 0.15;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // ── RESOURCE DISPOSAL ──
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("click", onCanvasClick);

      [coreGeo, coreMat, maneGeo, maneMat, eyeGeo, eyeMat, ringGeo, pGeo, pMat].forEach((r) =>
        r?.dispose()
      );
      [leftEye.material, rightEye.material, ring1.material, ring2.material].forEach((m) =>
        m?.dispose()
      );
      nodeMeshes.forEach((n) => {
        n.mesh.geometry.dispose();
        n.mesh.material.dispose();
        n.halo.geometry.dispose();
        n.halo.material.dispose();
      });
      beamLines.forEach((b) => {
        b.line.geometry.dispose();
        b.line.material.dispose();
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mode, onSelectAgent]);

  const h = mode === "login" ? "h-full" : "h-[220px] sm:h-[280px] md:h-[320px]";

  return (
    <div className={`relative w-full ${h} flex items-center justify-center select-none`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
