import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controller;
let reticle;
let hitTestSource = null;

init();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  // Reticle (placement ring)
  const geometry = new THREE.RingGeometry(0.1, 0.11, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  document.getElementById("startAR").addEventListener("click", startAR);
}

async function startAR() {
  const session = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test"]
  });

  renderer.xr.setSession(session);

  const viewerSpace = await session.requestReferenceSpace("viewer");
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  const localSpace = await session.requestReferenceSpace("local");

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localSpace);

        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }

    renderer.render(scene, camera);
  });
}

function onSelect() {
  if (!reticle.visible) return;

  const loader = new GLTFLoader();

  const urlParams = new URLSearchParams(window.location.search);
  const modelName = urlParams.get("model") || "donut.glb";

  loader.load(`models/${modelName}`, (gltf) => {
    const model = gltf.scene;

    // Position at reticle
    model.position.setFromMatrixPosition(reticle.matrix);

    // Scale (adjust if needed)
    model.scale.set(0.25, 0.25, 0.25);

    scene.add(model);
  });
}