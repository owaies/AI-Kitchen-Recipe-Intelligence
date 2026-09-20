import { useEffect, useRef } from "react";
import * as THREE from "three";
// @ts-expect-error anime.js v3 ships runtime module without the declaration shape Vite needs here.
import anime from "animejs";

type SceneName = "kitchen" | "cupboards" | "recipes" | "meal-plan" | "shopping";

type Props = {
  scene: SceneName;
};

function makeMaterial(color: number, roughness = 0.72, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], color: number, radius = 0) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, makeMaterial(color));
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function addCylinder(group: THREE.Group, radius: number, height: number, position: [number, number, number], color: number) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, height, 32),
    makeMaterial(color),
  );
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function buildScene(scene: SceneName) {
  const root = new THREE.Group();
  const accent = 0xb85b43;
  const wood = 0x62432e;
  const cream = 0xe9ddc5;
  const olive = 0x687a43;
  const brass = 0xcaa45e;

  if (scene === "kitchen") {
    addBox(root, [12, 0.7, 6], [0, -2.3, 0], wood);
    addBox(root, [9, 0.55, 1.8], [0, -1.75, 0], cream);
    addBox(root, [5.5, 3.8, 0.28], [0, 0.25, -1.8], 0x30261f);
    addBox(root, [5, 3.25, 0.12], [0, 0.25, -1.62], 0xb9c8ae);
    for (let i = -2; i <= 2; i += 1) addBox(root, [0.08, 3.2, 0.12], [i * 1.05, 0.25, -1.53], wood);
    addBox(root, [8, 0.18, 0.25], [0, 1.65, -0.7], wood);
    for (let i = -2; i <= 2; i += 1) addCylinder(root, 0.22, 0.35, [i * 0.75, 1.92, -0.7], i % 2 ? accent : olive);
    addCylinder(root, 0.75, 0.16, [-3.5, -1.35, 0.2], brass);
    addCylinder(root, 0.55, 0.16, [3.2, -1.35, 0.25], accent);
  }

  if (scene === "cupboards") {
    addBox(root, [9.5, 5.7, 0.45], [0, 0, -1.2], wood);
    const left = addBox(root, [4.35, 5.25, 0.3], [-2.3, 0, -0.9], 0x765238);
    const right = addBox(root, [4.35, 5.25, 0.3], [2.3, 0, -0.9], 0x765238);
    left.name = "cupboard-left";
    right.name = "cupboard-right";
    addBox(root, [0.14, 4.4, 0.4], [0, 0, -0.55], brass);
    for (const y of [-1.25, 0.25, 1.7]) {
      addBox(root, [7.7, 0.12, 0.42], [0, y, -0.45], cream);
      for (let i = -3; i <= 3; i += 1) addCylinder(root, 0.18, 0.25, [i * 0.9, y + 0.18, -0.1], i % 3 === 0 ? accent : olive);
    }
  }

  if (scene === "recipes") {
    addBox(root, [10, 0.45, 6], [0, -2.1, 0], wood);
    addCylinder(root, 2.3, 0.2, [0, -1.8, 0], cream);
    addCylinder(root, 1.6, 0.18, [0, -1.55, 0], 0xd2a76a);
    for (let i = 0; i < 5; i += 1) {
      const plate = addCylinder(root, 0.32, 0.12, [-3.6 + i * 1.8, -1.55, 0], i % 2 ? olive : accent);
      plate.rotation.x = Math.PI / 2;
    }
    addBox(root, [5.5, 0.18, 0.25], [0, 1.8, -0.8], brass);
    addBox(root, [0.18, 2.7, 0.2], [-2.7, 0.5, -0.8], wood);
    addBox(root, [0.18, 2.7, 0.2], [2.7, 0.5, -0.8], wood);
  }

  if (scene === "meal-plan") {
    addBox(root, [10, 0.4, 6], [0, -2.15, 0], wood);
    for (let x = -3; x <= 3; x += 1) {
      addBox(root, [1.1, 2.8, 0.12], [x, -0.55, 0], x === 0 ? accent : cream);
      addBox(root, [0.75, 0.08, 0.1], [x, 0.35, -0.08], brass);
      addBox(root, [0.55, 0.08, 0.1], [x, 0.0, -0.08], olive);
      addBox(root, [0.35, 0.08, 0.1], [x, -0.35, -0.08], accent);
    }
  }

  if (scene === "shopping") {
    addBox(root, [10, 0.35, 6], [0, -2.15, 0], wood);
    addBox(root, [5.6, 2.6, 2.4], [0, -0.3, 0], 0x8a6a49);
    for (let i = -2; i <= 2; i += 1) addBox(root, [0.18, 2.4, 0.18], [i * 1.05, -0.3, 1.25], brass);
    for (let i = 0; i < 7; i += 1) {
      addCylinder(root, 0.32, 0.48, [-2.5 + (i % 4) * 1.55, 0.9 - Math.floor(i / 4) * 0.9, 0.5], i % 2 ? olive : accent);
    }
  }

  return root;
}

export default function PageTransitionScene({ scene }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(35, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 11);

    const world = new THREE.Scene();
    world.background = new THREE.Color(0x211a14);
    world.fog = new THREE.Fog(0x211a14, 7, 18);

    world.add(new THREE.HemisphereLight(0xffefd0, 0x241a14, 2.4));
    const key = new THREE.DirectionalLight(0xffdba5, 3.5);
    key.position.set(4, 7, 6);
    world.add(key);
    const fill = new THREE.PointLight(0xb7c985, 12, 12);
    fill.position.set(-4, 2, 3);
    world.add(fill);

    const group = buildScene(scene);
    group.position.y = -0.2;
    group.rotation.y = -0.18;
    world.add(group);

    const particles = new THREE.Group();
    for (let i = 0; i < 70; i += 1) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018 + Math.random() * 0.035, 8, 8),
        new THREE.MeshBasicMaterial({ color: i % 3 ? 0xe8c766 : 0xb85b43, transparent: true, opacity: 0.35 }),
      );
      dot.position.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5);
      particles.add(dot);
    }
    world.add(particles);

    const state = { cameraZ: 13, rotate: -0.35, opacity: 0 };
    anime({
      targets: state,
      cameraZ: 7.4,
      rotate: 0.16,
      opacity: 1,
      duration: 1050,
      easing: "easeOutExpo",
      update: () => {
        camera.position.z = state.cameraZ;
        group.rotation.y = state.rotate;
      },
    });

    anime({
      targets: particles.rotation,
      y: Math.PI * 2,
      duration: 6500,
      easing: "linear",
      loop: true,
    });

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const t = clock.getElapsedTime();
      group.position.y = -0.2 + Math.sin(t * 1.1) * 0.045;
      particles.position.y = Math.sin(t * 0.35) * 0.18;
      renderer.render(world, camera);
    };
    render();

    const resize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      anime.remove(state);
      anime.remove(particles.rotation);
      renderer.dispose();
      world.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose?.();
      });
      renderer.domElement.remove();
    };
  }, [scene]);

  return <div ref={mountRef} className="three-transition-canvas" />;
}
