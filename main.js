import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

let scene, camera, renderer, world, ball, ballBody;
let pins = [], pinBodies = [], pinStartTransforms = [];
let raycaster, laserLine, pointer = new THREE.Vector2(0, 0);

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
  renderer.xr.setReferenceSpaceType('local');

  document.body.appendChild(VRButton.createButton(renderer));
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

  // === SOLO 3 PINOS (geometría simple, sin GLB) ===
  createPins();

  // === RAYCASTER + LÁSER VISUAL ===
  raycaster = new THREE.Raycaster();

  const laserMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 3,
    opacity: 0.9,
    transparent: true
  });

  const laserGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(6);
  positions.fill(0);
  laserGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  laserLine = new THREE.Line(laserGeometry, laserMaterial);
  laserLine.visible = false;
  scene.add(laserLine);

  // === CONTROLES VR + Mouse ===
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove);

  // Detectar VR Select (botón del controlador)
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('VR Session started');
  });

  window.addEventListener('resize', onWindowResize);
}

function createPins() {
  const pinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xaa00ff,
    emissiveIntensity: 0.4
  });

  // SOLO 3 PINOS en triángulo
  const positions = [
    [0, 0.3, -8],
    [-0.4, 0.3, -8.8],
    [0.4, 0.3, -8.8]
  ];

  positions.forEach(([x, y, z]) => {
    // Pino visual (cilindro blanco neón)
    const pinGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16);
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    pinMesh.position.set(x, y, z);
    pinMesh.castShadow = true;
    pinMesh.receiveShadow = true;
    scene.add(pinMesh);
    pins.push(pinMesh);

    // Cuerpo físico
    const pinBody = new CANNON.Body({
      mass: 0.3,
      shape: new CANNON.Cylinder(0.08, 0.08, 0.8, 16),
      position: new CANNON.Vec3(x, y, z),
      material: new CANNON.Material({ restitution: 0.05, friction: 0.6 })
    });
    world.addBody(pinBody);
    pinBodies.push(pinBody);

    pinStartTransforms.push({
      position: new CANNON.Vec3(x, y, z),
      quaternion: new CANNON.Quaternion()
    });
  });
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  let clientX, clientY;
  if (event.touches) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
}

function shootBall() {
  // Raycast desde la cámara
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const direction = new THREE.Vector3();
    direction.copy(intersects[0].point).sub(camera.position).normalize();

    // Convertir a Cannon vector y aplicar velocidad
    const velocity = new CANNON.Vec3(direction.x, direction.y, direction.z);
    velocity.scale(15, velocity); // Fuerza del disparo

    // Resetear bola a posición inicial
    ballBody.position.set(0, 0.3, 10);
    ballBody.velocity.set(0, 0, 0);
    ballBody.angularVelocity.set(0, 0, 0);

    // Disparar!
    ballBody.velocity = velocity;
  }
}

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  // Sincronizar bola
  ball.position.copy(ballBody.position);
  ball.quaternion.copy(ballBody.quaternion);

  // Sincronizar pinos
  for (let i = 0; i < pins.length; i++) {
    pins[i].position.copy(pinBodies[i].position);
    pins[i].quaternion.copy(pinBodies[i].quaternion);
  }

  // === ACTUALIZAR RAYCASTER Y LÁSER ===
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    const positions = laserLine.geometry.attributes.position.array;
    positions[0] = camera.position.x;
    positions[1] = camera.position.y;
    positions[2] = camera.position.z;
    positions[3] = point.x;
    positions[4] = point.y + 0.01;
    positions[5] = point.z;

    laserLine.geometry.attributes.position.needsUpdate = true;
    laserLine.visible = true;

    // Color magenta si apunta a pino
    if (pins.includes(intersects[0].object) || intersects[0].object === ball) {
      laserLine.material.color.set(0xff00ff);
    } else {
      laserLine.material.color.set(0x00ffff);
    }
  } else {
    laserLine.visible = false;
  }

  // === DISPARO CON BOTÓN VR / CLICK / ESPACIO ===
  if (renderer.xr.isPresenting) {
    // En VR: detectar botón del controlador
    const session = renderer.xr.getSession();
    if (session && session.inputSources) {
      for (let source of session.inputSources) {
        if (source.gamepad && source.gamepad.buttons[0].pressed) {
          shootBall();
          break;
        }
      }
    }
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Controles desktop (opcional)
window.addEventListener('click', shootBall);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    shootBall();
    e.preventDefault();
  }
});