import { useEffect, useRef } from "react";
import * as THREE from "three";

const AGENT_NODES = [
  { id: "study", label: "Study Agent", color: 0xD6A84F, icon: "📚", angle: 0 },
  { id: "coding", label: "Coding Agent", color: 0x8B5CF6, icon: "💻", angle: Math.PI / 2 },
  { id: "productivity", label: "Productivity Agent", color: 0x22D3EE, icon: "🚀", angle: Math.PI },
  { id: "divine", label: "Krishna AI", color: 0x38BDF8, icon: "🦚", angle: (3 * Math.PI) / 2 },
];

export default function SimhaCanvas3D({ selectedAgent = "study", onSelectAgent, theme = "dark" }) {
  const mountRef = useRef(null);
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    // ── 1. SCENE & CAMERA ─────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    // ── 2. RENDERER ───────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── 3. LIGHTING ───────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainGoldLight = new THREE.PointLight(0xD6A84F, 2.5, 20);
    mainGoldLight.position.set(3, 4, 5);
    scene.add(mainGoldLight);

    const rimVioletLight = new THREE.PointLight(0x6D4AFF, 2.0, 15);
    rimVioletLight.position.set(-4, -2, 3);
    scene.add(rimVioletLight);

    const cyanAccentLight = new THREE.PointLight(0x22D3EE, 1.5, 12);
    cyanAccentLight.position.set(0, -3, 2);
    scene.add(cyanAccentLight);

    // ── 4. SIMHA GUARDIAN 3D CORE MESHES ──────────────────────────
    const guardianGroup = new THREE.Group();
    scene.add(guardianGroup);

    // Core 1: Faceted Golden Crystal Core (Head / Emblem)
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xD6A84F,
      metalness: 0.85,
      roughness: 0.2,
      reflectivity: 0.9,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      wireframe: false,
      flatShading: true,
    });
    const simhaCore = new THREE.Mesh(coreGeo, coreMat);
    guardianGroup.add(simhaCore);

    // Core 2: Wireframe Radiant Shield (Mane Lattice)
    const wireGeo = new THREE.IcosahedronGeometry(1.35, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xF0C66A,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const simhaWire = new THREE.Mesh(wireGeo, wireMat);
    guardianGroup.add(simhaWire);

    // Core 3: Luminous Eyes (Dual Emissive Spheres)
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x22D3EE,
      emissive: 0x22D3EE,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.38, 0.22, 0.95);
    guardianGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.38, 0.22, 0.95);
    guardianGroup.add(rightEye);

    // Core 4: Orbital Rings (Energy Mantle)
    const ringGeo = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x8B5CF6,
      emissive: 0x6D4AFF,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
    });
    const orbitalRing1 = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing1.rotation.x = Math.PI / 3;
    guardianGroup.add(orbitalRing1);

    const orbitalRing2 = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
      color: 0xD6A84F,
      emissive: 0xB8862B,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.45,
    }));
    orbitalRing2.rotation.x = -Math.PI / 4;
    orbitalRing2.rotation.y = Math.PI / 6;
    guardianGroup.add(orbitalRing2);

    // ── 5. AGENT SATELLITE NODES & BEAMS ──────────────────────────
    const orbitRadius = 2.7;
    const nodeMeshes = [];
    const beamLines = [];

    AGENT_NODES.forEach((agent) => {
      // Node Group
      const nodeGroup = new THREE.Group();

      // Node Sphere
      const nodeGeo = new THREE.SphereGeometry(0.25, 20, 20);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: agent.color,
        emissive: agent.color,
        emissiveIntensity: 1.2,
        metalness: 0.5,
        roughness: 0.2,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeGroup.add(nodeMesh);

      // Node Halo Ring
      const haloGeo = new THREE.RingGeometry(0.32, 0.38, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: agent.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      nodeGroup.add(halo);

      scene.add(nodeGroup);
      nodeMeshes.push({ group: nodeGroup, mesh: nodeMesh, halo, agent });

      // Energy Beam from Core to Node
      const lineGeo = new THREE.BufferGeometry();
      const linePositions = new Float32Array(6);
      lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: agent.color,
        transparent: true,
        opacity: 0.4,
      });
      const beamLine = new THREE.Line(lineGeo, lineMat);
      scene.add(beamLine);
      beamLines.push({ line: beamLine, agent });
    });

    // ── 6. AMBIENT PARTICLE CONSTELLATION ─────────────────────────
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xD6A84F);
    const violetColor = new THREE.Color(0x8B5CF6);
    const cyanColor = new THREE.Color(0x22D3EE);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i3 + 2] = radius * Math.cos(phi);

      const chosenColor = i % 3 === 0 ? goldColor : i % 3 === 1 ? violetColor : cyanColor;
      particleColors[i3] = chosenColor.r;
      particleColors[i3 + 1] = chosenColor.g;
      particleColors[i3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    scene.add(particleField);

    // ── 7. INTERACTION & ANIMATION LOOP ───────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 2;
      mouseY = y * 2;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Raycaster for 3D node clicking
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const onCanvasClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const interactiveMeshes = nodeMeshes.map((n) => n.mesh);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const clickedNode = nodeMeshes.find((n) => n.mesh === hitMesh);
        if (clickedNode && onSelectAgent) {
          onSelectAgent(clickedNode.agent.id);
        }
      }
    };

    container.addEventListener("click", onCanvasClick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // ── ANIMATION FRAME ───────────────────────────────────────────
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Breathing geometry pulse
      const breathScale = 1 + Math.sin(elapsedTime * 1.8) * 0.04;
      simhaCore.scale.set(breathScale, breathScale, breathScale);
      simhaWire.scale.set(breathScale * 1.05, breathScale * 1.05, breathScale * 1.05);

      // Orbital rings rotation
      orbitalRing1.rotation.z = elapsedTime * 0.4;
      orbitalRing2.rotation.z = -elapsedTime * 0.3;

      // Mouse Parallax with smooth Damping (lerp)
      targetRotY += (mouseX * 0.55 - targetRotY) * 0.05;
      targetRotX += (-mouseY * 0.4 - targetRotX) * 0.05;

      guardianGroup.rotation.y = targetRotY + Math.sin(elapsedTime * 0.5) * 0.08;
      guardianGroup.rotation.x = targetRotX;

      // Cursor light tracking
      mainGoldLight.position.x = 3 + mouseX * 2;
      mainGoldLight.position.y = 4 - mouseY * 2;

      // Rotate particle field slowly
      particleField.rotation.y = elapsedTime * 0.06;
      particleField.rotation.x = Math.sin(elapsedTime * 0.04) * 0.05;

      // Update Satellite Nodes position in Orbit
      const currentSelected = selectedAgentRef.current;

      nodeMeshes.forEach((nodeItem, idx) => {
        const isSelected = currentSelected === nodeItem.agent.id;
        const currentAngle = nodeItem.agent.angle + elapsedTime * 0.35;

        // Position on 3D elliptical tilted plane
        const nodeX = Math.cos(currentAngle) * orbitRadius;
        const nodeY = Math.sin(currentAngle) * (orbitRadius * 0.45) + Math.sin(elapsedTime * 2 + idx) * 0.15;
        const nodeZ = Math.sin(currentAngle) * (orbitRadius * 0.85);

        nodeItem.group.position.set(nodeX, nodeY, nodeZ);
        nodeItem.halo.lookAt(camera.position);

        // Highlight selected active agent node
        const targetScale = isSelected ? 1.4 : 1.0;
        nodeItem.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        nodeItem.mesh.material.emissiveIntensity = isSelected ? 2.5 : 1.0;
        nodeItem.halo.material.opacity = isSelected ? 0.9 : 0.4;

        // Update connected energy beam positions
        const beam = beamLines[idx];
        if (beam) {
          const positions = beam.line.geometry.attributes.position.array;
          // Start point (Core)
          positions[0] = 0;
          positions[1] = 0;
          positions[2] = 0;
          // End point (Satellite node)
          positions[3] = nodeX;
          positions[4] = nodeY;
          positions[5] = nodeZ;
          beam.line.geometry.attributes.position.needsUpdate = true;
          beam.line.material.opacity = isSelected ? 0.8 : 0.25;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // ── CLEANUP ───────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("click", onCanvasClick);

      // Dispose Three.js resources
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

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
  }, [onSelectAgent]);

  return (
    <div className="relative w-full h-[260px] sm:h-[320px] md:h-[360px] flex items-center justify-center pointer-events-auto select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* Subtle depth lighting overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-dark-base/40" />
    </div>
  );
}
