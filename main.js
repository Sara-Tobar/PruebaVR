import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';


// Escena
const scene = new THREE.Scene();

// Cámara (perspectiva, ideal para VR)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 6); // Posición a altura de ojos

// Renderer con soporte WebXR para VR
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // Habilita VR
renderer.xr.setReferenceSpaceType( 'local' );
document.body.appendChild(renderer.domElement);

// Botón para entrar en modo VR (aparece automáticamente)
document.body.appendChild(VRButton.createButton(renderer));

// Cuarto (room)
// Piso (gris claro)
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Paredes (blancas)
const wallGeometry = new THREE.PlaneGeometry(10, 5);
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

// Pared trasera
const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
backWall.position.set(0, 2.5, -5);
scene.add(backWall);

// Pared izquierda
const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
leftWall.position.set(-5, 2.5, 0);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

// Pared derecha
const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
rightWall.position.set(5, 2.5, 0);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// Techo (gris claro)
const ceilingGeometry = new THREE.PlaneGeometry(10, 10);
const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.DoubleSide });
const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
ceiling.position.y = 5;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

// Cubo en el centro (rojo para diferenciar)
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0.5, -2); // Sobre el piso
scene.add(cube);

// Luz ambiental (para que se vea todo)
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Raycaster y puntero (Vector2)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Línea para visualizar el rayo (azul)
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const rayLine = new THREE.Line(lineGeometry, lineMaterial);
scene.add(rayLine);

// Evento para puntero (mouse/touch)
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('pointermove', onPointerMove);

// Soporte para touch en móviles
window.addEventListener('touchmove', (event) => {
  if (event.touches.length > 0) {
    pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
});

// Bucle de animación
renderer.setAnimationLoop(() => {
  // En modo VR, usa gaze (puntero en centro)
  if (renderer.xr.isPresenting) {
    pointer.set(0, 0);
  }

  // Configura el raycaster desde la cámara con el Vector2 del puntero
  raycaster.setFromCamera(pointer, camera);

  // Calcula intersecciones
  const intersects = raycaster.intersectObjects(scene.children, true);

  // Actualiza la línea del rayo
  const positions = rayLine.geometry.attributes.position;
  positions.setXYZ(0, camera.position.x, camera.position.y, camera.position.z);
  if (intersects.length > 0) {
    // Termina en el punto de intersección
    const point = intersects[0].point;
    positions.setXYZ(1, point.x, point.y, point.z);
  } else {
    // Si no intersecta, extiende 100 unidades
    const direction = raycaster.ray.direction.clone().normalize().multiplyScalar(100);
    const endPoint = camera.position.clone().add(direction);
    positions.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);
  }
  positions.needsUpdate = true;

  renderer.render(scene, camera);
});

// Manejo de resize (para móviles)
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});