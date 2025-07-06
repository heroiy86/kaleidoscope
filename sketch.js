import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.165.0/three.min.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.min.js';

// Three.js variables
let scene, camera, renderer;
let particles = []; // Stores master particles (mesh and body)
let kaleidoscopeRadius = 10; // Radius for the 3D kaleidoscope effect

// Cannon-es variables
let world;
let kaleidoscopeBoundaryBody; // For the 3D spherical boundary

// Device orientation variables
let permissionGranted = false;
let alpha = 0, beta = 0, gamma = 0; // Device orientation angles

// --- Setup Functions ---

function setupThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add some light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    camera.position.z = 30; // Adjust camera position

    // Add a visual representation of the spherical boundary
    const boundaryGeometry = new THREE.SphereGeometry(kaleidoscopeRadius, 32, 32);
    const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 });
    const boundaryMesh = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    scene.add(boundaryMesh);
}

function setupCannonJS() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // m/s²

    // Create a spherical boundary
    const boundaryShape = new CANNON.Sphere(kaleidoscopeRadius);
    kaleidoscopeBoundaryBody = new CANNON.Body({ mass: 0, shape: boundaryShape });
    world.addBody(kaleidoscopeBoundaryBody);
}

function createParticle3D() {
    const radius = Math.random() * 0.2 + 0.2; // Smaller particles for kaleidoscope
    const baseColor = new THREE.Color(Math.random() * 0xffffff);

    // マスター粒子
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: baseColor });
    const masterMesh = new THREE.Mesh(geometry, material);
    scene.add(masterMesh);

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass: 1, shape: shape });

    // Random initial position within a smaller sphere at the center
    const initialPositionRadius = kaleidoscopeRadius * 0.2; // より中心に集める
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const x = initialPositionRadius * Math.sin(theta) * Math.cos(phi);
    const y = initialPositionRadius * Math.sin(theta) * Math.sin(phi);
    const z = initialPositionRadius * Math.cos(theta);

    const numSectors = 6; // カレイドスコープのセクター数
    const angleStep = (Math.PI * 2) / numSectors;

    // 対称的な初期位置を計算
    const symmetricPositions = [];
    for (let i = 0; i < numSectors; i++) {
        const angle = angleStep * i;
        const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
        const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
        symmetricPositions.push(new CANNON.Vec3(rotatedX, rotatedY, z));

        // 反転
        const reflectedX = x * Math.cos(angle) - (-y) * Math.sin(angle);
        const reflectedY = x * Math.sin(angle) + (-y) * Math.cos(angle);
        symmetricPositions.push(new CANNON.Vec3(reflectedX, reflectedY, z));
    }

    // 対称的な位置からランダムに選択
    const initialPos = symmetricPositions[Math.floor(Math.random() * symmetricPositions.length)];
    body.position.copy(initialPos);

    world.addBody(body);

    const reflectedMeshes = [];

    for (let i = 0; i < numSectors; i++) {
        // オリジナル
        const originalReflectedMesh = masterMesh.clone();
        scene.add(originalReflectedMesh);
        reflectedMeshes.push(originalReflectedMesh);

        // 反射 (Y軸で反転)
        const reflectedMesh = masterMesh.clone();
        reflectedMesh.scale.y = -1; // Y軸で反転
        scene.add(reflectedMesh);
        reflectedMeshes.push(reflectedMesh);
    }

    return { mesh: masterMesh, body, material };
}

// --- Event Handlers ---

function handleOrientation(event) {
    alpha = event.alpha; // Z-axis rotation (0-360)
    beta = event.beta;   // X-axis rotation (-180 to 180)
    gamma = event.gamma; // Y-axis rotation (-90 to 90)

    // Convert degrees to radians
    const alphaRad = THREE.MathUtils.degToRad(alpha);
    const betaRad = THREE.MathUtils.degToRad(beta);
    const gammaRad = THREE.MathUtils.degToRad(gamma);

    // Create a rotation matrix from device orientation angles
    const euler = new THREE.Euler(betaRad, alphaRad, -gammaRad, 'YXZ'); // YXZ order for device orientation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);

    // Define a base gravity vector (e.g., straight down in device coordinates)
    const baseGravity = new THREE.Vector3(0, -1, 0);

    // Rotate the base gravity vector by the device's orientation
    baseGravity.applyQuaternion(quaternion);

    // Apply the rotated gravity to Cannon.js world
    world.gravity.set(baseGravity.x * 9.82, baseGravity.y * 9.82, baseGravity.z * 9.82);
}

function requestDeviceOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    permissionGranted = true;
                    document.getElementById('permission-overlay')?.remove();
                } else {
                    console.warn("Device orientation permission denied.");
                }
            })
            .catch(error => {
                console.error("Error requesting device orientation permission:", error);
            });
    } else {
        // For non-iOS 13+ devices or browsers that don't support requestPermission
        window.addEventListener('deviceorientation', handleOrientation);
        permissionGranted = true;
        document.getElementById('permission-overlay')?.remove();
    }
}

// --- Main Loop ---

function animate() {
    requestAnimationFrame(animate);

    world.step(1 / 60); // Update physics world

    // Update particle positions and rotations
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.mesh.position.copy(p.body.position);
        p.mesh.quaternion.copy(p.body.quaternion);
    }

    renderer.render(scene, camera);
}

// --- Initialization ---

window.onload = () => {
    setupThreeJS();
    setupCannonJS();

    // Add initial particles
    for (let i = 0; i < 20; i++) { // Start with 20 particles
        particles.push(createParticle3D());
    }

    // Permission overlay for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const overlay = document.createElement('div');
        overlay.id = 'permission-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); color: white; display: flex; justify-content: center; align-items: center; font-size: 24px; cursor: pointer; z-index: 100;';
        overlay.innerHTML = 'Click to start';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', requestDeviceOrientationPermission);
    } else {
        // Automatically start for non-iOS 13+ devices
        window.addEventListener('deviceorientation', handleOrientation);
        permissionGranted = true;
    }

    animate(); // Start the animation loop
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});