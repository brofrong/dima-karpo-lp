export async function initWebGLCanvas(
  canvas: HTMLCanvasElement,
  scrollProgress: () => number,
  THREE: typeof import("three"),
): Promise<() => void> {
  try {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    // Set pixel ratio cap at 2
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x0a0e27, 0);

    camera.position.z = 5;

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(0x00d9ff, 0xff006e, 0.6);
    scene.add(hemisphereLight);

    const pointLight = new THREE.PointLight(0xff006e, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00d9ff, 0.8, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Create dance floor plane with grid
    const geometry = new THREE.PlaneGeometry(10, 10, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1f3a,
      emissive: 0x0a0e27,
      metalness: 0.3,
      roughness: 0.7,
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // Create grid lines
    const gridGeometry = new THREE.BufferGeometry();
    const gridPoints = [];
    const size = 10;
    const divisions = 16;

    for (let i = 0; i <= divisions; i++) {
      const pos = (i / divisions) * size - size / 2;
      gridPoints.push(-size / 2, pos, 0);
      gridPoints.push(size / 2, pos, 0);
      gridPoints.push(pos, -size / 2, 0);
      gridPoints.push(pos, size / 2, 0);
    }

    gridGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(gridPoints), 3),
    );
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.3,
      linewidth: 1,
    });
    const gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
    gridLines.position.z = 0.01;
    scene.add(gridLines);

    // Particle system
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = Math.random() * 2;

      velocities[i * 3] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 2] = Math.random() * 0.1 + 0.05;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff006e,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Animation state
    let rotation = 0;
    const positionsArray = positions;
    const velocitiesArray = velocities;

    // Handle resize
    function onWindowResize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    window.addEventListener("resize", onWindowResize);

    // Stop rendering when off-screen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      if (!isVisible) return;

      // Update rotation based on scroll
      const scrollAmount = scrollProgress();
      rotation = scrollAmount * Math.PI * 2;
      plane.rotation.x = Math.sin(rotation) * 0.3;
      plane.rotation.y = Math.cos(rotation) * 0.3;
      gridLines.rotation.copy(plane.rotation);

      // Update particles
      for (let i = 0; i < particleCount; i++) {
        positionsArray[i * 3] += velocitiesArray[i * 3];
        positionsArray[i * 3 + 1] += velocitiesArray[i * 3 + 1];
        positionsArray[i * 3 + 2] += velocitiesArray[i * 3 + 2];

        if (positionsArray[i * 3 + 2] > 3) {
          positionsArray[i * 3 + 2] = 0;
          positionsArray[i * 3] = (Math.random() - 0.5) * 10;
          positionsArray[i * 3 + 1] = (Math.random() - 0.5) * 10;
        }

        if (
          positionsArray[i * 3] > 6 ||
          positionsArray[i * 3] < -6 ||
          positionsArray[i * 3 + 1] > 6 ||
          positionsArray[i * 3 + 1] < -6
        ) {
          positionsArray[i * 3] = (Math.random() - 0.5) * 10;
          positionsArray[i * 3 + 1] = (Math.random() - 0.5) * 10;
        }
      }

      particleGeometry.attributes.position.needsUpdate = true;

      // Subtle light animation
      const time = Date.now() * 0.001;
      pointLight.intensity = 1 + Math.sin(time) * 0.3;
      pointLight2.intensity = 0.8 + Math.cos(time) * 0.2;

      renderer.render(scene, camera);
    }

    animate();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", onWindowResize);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  } catch (error) {
    console.error("WebGL error:", error);
    // Hide canvas on error
    canvas.style.display = "none";
    return () => {};
  }
}
