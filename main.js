import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';


let scene, camera, renderer, world, ball, ballBody;
let pins = [], pinBodies = [], pinStartTransforms = [];

init();
animate();

function init() {
  // === Escena ===
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);

  // === Cámara ===
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 13);

  // === Render ===
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
				renderer.xr.setReferenceSpaceType( 'local' );

				document.body.appendChild( VRButton.createButton( renderer ) );
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // === Mundo físico ===
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();

  // === Piso ===
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.7 });
  const floorGeometry = new THREE.BoxGeometry(20, 0.1, 35);
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.position.set(0, -0.05, 0);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(10, 0.05, 17.5)),
    position: new CANNON.Vec3(0, 0, 0)
  });
  world.addBody(floorBody);

  // === Líneas de neón laterales ===
  const neonMaterial = new THREE.MeshStandardMaterial({
    emissive: 0x00ffff,
    emissiveIntensity: 5,
    color: 0x00ffff
  });
  const lineGeometry = new THREE.BoxGeometry(0.1, 0.01, 35);
  const neonPositionsX = [-9, -5, -2, 2, 5, 9];

  neonPositionsX.forEach((x) => {
    const neonLine = new THREE.Mesh(lineGeometry, neonMaterial);
    neonLine.position.set(x, 0.05, 0);
    scene.add(neonLine);
  });

  // === Paredes y techo ===
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0C0024,
    emissive: 0x220044,
    emissiveIntensity: 0.3
  });

  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.1), wallMaterial);
  wallBack.position.set(0, 2, -17.5);
  scene.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 35), wallMaterial);
  wallLeft.position.set(-10, 2, 0);
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 35), wallMaterial);
  wallRight.position.set(10, 2, 0);
  scene.add(wallRight);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 35), wallMaterial);
  ceiling.position.set(0, 4, 0);
  scene.add(ceiling);

  // === Luces ===
  const ambient = new THREE.AmbientLight(0x8888ff, 0.7);
  scene.add(ambient);

  const blueLight = new THREE.PointLight(0x0066ff, 1, 25);
  blueLight.position.set(-5, 3, -5);
  scene.add(blueLight);

  const violetLight = new THREE.PointLight(0xaa00ff, 1, 25);
  violetLight.position.set(5, 3, 5);
  scene.add(violetLight);

  // === Bola ===
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x0088ff,
    emissiveIntensity: 1
  });
  const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
  ballMesh.position.set(0, 0.3, 10);
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  ball = ballMesh;

  ballBody = new CANNON.Body({
    mass: 3,
    shape: new CANNON.Sphere(0.3),
    position: new CANNON.Vec3(0, 0.3, 10),
    material: new CANNON.Material({ restitution: 0.1, friction: 0.5 })
  });
  world.addBody(ballBody);

  // === Bolos ===
  createPins();

  //modelos
const loader = new GLTFLoader();
loader.load(
  './bowling_ball_return.glb',
  (gltf) => {
    console.log('✅ Modelo cargado correctamente');
    const model = gltf.scene;

    // Escala y posición de prueba
    model.scale.set(1.5, 1.5, 1.5);
    model.position.set(20, 0, -50);
    model.rotation.set(0, Math.PI, 0);

    scene.add(model);
  },
);
const loader2 = new GLTFLoader();
loader2.load(
  './bowling_ball_return.glb',
  (gltf) => {
    const model2 = gltf.scene;

    // Escala y posición de prueba
    model2.scale.set(1.5, 1.5, 1.5);
    model2.position.set(27, 0, -50);
    model2.rotation.set(0, Math.PI, 0);

    scene.add(model2);
  },
);
const loader3 = new GLTFLoader();
loader3.load(
  './bolos.glb',
  (gltf) => {
    const model3 = gltf.scene;

    // Escala y posición de prueba
    model3.scale.set(0.1, 0.1, 0.1);
    model3.position.set(7, 0, -10);
    model3.rotation.set(0, 1.55, 0);

    scene.add(model3);
  },
);
const loader4 = new GLTFLoader();
loader4.load(
  './bolos.glb',
  (gltf) => {

    const model4 = gltf.scene;

    // Escala y posición de prueba
    model4.scale.set(0.1, 0.1, 0.1);
    model4.position.set(-7, 0, -10);
    model4.rotation.set(0, 1.55, 0);

    scene.add(model4);
  },
);

  // === Control del teclado ===
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      ballBody.velocity.set(0, 0, -12);
    }
  });

  window.addEventListener('resize', onWindowResize);
}

function createPins() {
  //const pinGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
  const pinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xaa00ff,
    emissiveIntensity: 0.4
  });

  const positions = [
    [0, 0.3, -8], // fila 1
    [-0.3, 0.3, -8.5], [0.3, 0.3, -8.5],
    [-0.6, 0.3, -9], [0, 0.3, -9], [0.6, 0.3, -9],
    [-0.9, 0.3, -9.5], [-0.3, 0.3, -9.5], [0.3, 0.3, -9.5], [0.9, 0.3, -9.5]
  ];
  
    const loader = new GLTFLoader();
  loader.load('./cono.glb', (gltf) => {
    const baseModel = gltf.scene;
    baseModel.scale.set(2.7, 2.7, 2.7); // ajusta según tu modelo
    baseModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    positions.forEach(([x, y, z]) => {
      // === 1️⃣ Crear cuerpo físico invisible (cilindro)
      const pinGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
      const pinMesh = new THREE.Mesh(
        pinGeometry,
        new THREE.MeshStandardMaterial({ visible: false }) // invisible
      );
      pinMesh.position.set(x, y, z);
      scene.add(pinMesh);
      pins.push(pinMesh);

      const pinBody = new CANNON.Body({
        mass: 0.3,
        shape: new CANNON.Cylinder(0.1, 0.1, 0.6, 16),
        position: new CANNON.Vec3(x, y, z),
        material: new CANNON.Material({ restitution: 0.05, friction: 0.6 })
      });
      world.addBody(pinBody);
      pinBodies.push(pinBody);

      // Guardar posición inicial
      pinStartTransforms.push({
        position: new CANNON.Vec3(x, y, z),
        quaternion: new CANNON.Quaternion()
      });

      // === 2️⃣ Crear el modelo visual del cono (decorativo)
      const pinModel = baseModel.clone();
      pinModel.position.set(x, y - 0.3, z); // bajarlo un poco
      scene.add(pinModel);

      // Vincular rotación y posición al cilindro invisible
      pinMesh.userData.model = pinModel;
    });
  });
}



function resetScene() {
  // 🔹 Reiniciar bola
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  ballBody.position.set(0, ballRadius + 0.05, 8);
  ballBody.quaternion.set(0, 0, 0, 1);

  // 🔹 Reiniciar bolos
  for (let i = 0; i < pinBodies.length; i++) {
    const start = pinStartTransforms[i];

    // cuerpo físico
    pinBodies[i].velocity.set(0, 0, 0);
    pinBodies[i].angularVelocity.set(0, 0, 0);
    pinBodies[i].position.copy(start.position);
    pinBodies[i].quaternion.copy(start.quaternion);

    // malla invisible
    pins[i].position.copy(start.position);
    pins[i].quaternion.copy(start.quaternion);

    // modelo GLB vinculado
    if (pins[i].userData.model) {
      pins[i].userData.model.position.copy(start.position);
      pins[i].userData.model.quaternion.copy(start.quaternion);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  // Sincronizar bola
  ball.position.copy(ballBody.position);
  ball.quaternion.copy(ballBody.quaternion);

  // Sincronizar bolos
  // for (let i = 0; i < pins.length; i++) {
  //   pins[i].position.copy(pinBodies[i].position);
  //   pins[i].quaternion.copy(pinBodies[i].quaternion);
  // }

  // // Reinicio cuando la bola llega al final
  // if (ballBody.position.z < -16) {
  //   resetBallAndPins();
  // }
  for (let i = 0; i < pins.length; i++) {
  pins[i].position.copy(pinBodies[i].position);
  pins[i].quaternion.copy(pinBodies[i].quaternion);

  if (pins[i].userData.model) {
    pins[i].userData.model.position.copy(pinBodies[i].position);
    pins[i].userData.model.quaternion.copy(pinBodies[i].quaternion);
  }
}

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}