

// Three.js variables
let scene, camera, renderer;
let particles = []; // Stores objects with master mesh, body, and kaleidoscope group
let kaleidoscopeRadius = 10; // Radius for the 3D kaleidoscope effect

// Cannon-es variables
let world;
let kaleidoscopeBoundaryBody; // For the 3D spherical boundary

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

    // マスター粒子 (物理演算される本体)
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: baseColor });
    const masterMesh = new THREE.Mesh(geometry, material);
    // masterMeshは直接シーンに追加せず、グループに追加する

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

    // カレイドスコープ効果のためのグループとクローン
    const kaleidoscopeGroup = new THREE.Group();
    kaleidoscopeGroup.add(masterMesh); // マスターメッシュをグループに追加

    const reflectedGroups = [];
    for (let i = 0; i < numSectors; i++) {
        // オリジナルセクター
        const originalGroup = kaleidoscopeGroup.clone();
        originalGroup.rotation.z = angleStep * i;
        scene.add(originalGroup);
        reflectedGroups.push(originalGroup);

        // 反転セクター
        const reflectedGroup = kaleidoscopeGroup.clone();
        reflectedGroup.rotation.z = angleStep * i;
        reflectedGroup.scale.y = -1; // Y軸で反転
        scene.add(reflectedGroup);
        reflectedGroups.push(reflectedGroup);
    }

    return { masterMesh, body, reflectedGroups };
}

// --- Main Loop ---

function animate() {
    requestAnimationFrame(animate);

    world.step(1 / 60); // Update physics world

    // Update master particle positions and rotations, then update their reflected groups
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.masterMesh.position.copy(p.body.position);
        p.masterMesh.quaternion.copy(p.body.quaternion);

        // Update reflected groups' positions and rotations based on master mesh
        for (let j = 0; j < p.reflectedGroups.length; j++) {
            const group = p.reflectedGroups[j];
            // The group's children (masterMesh clone) will inherit the group's transformation
            // No need to copy position/quaternion to children directly here, as they are already part of the group
        }
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

    // Add touch event listeners
    let touchStartX = 0;
    let touchStartY = 0;
    let currentRotationAngle = 0; // Current rotation angle for gravity

    renderer.domElement.addEventListener('touchstart', (event) => {
        if (event.touches.length > 0) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        }
    });

    renderer.domElement.addEventListener('touchmove', (event) => {
        if (event.touches.length > 0) {
            const touchCurrentX = event.touches[0].clientX;
            const touchCurrentY = event.touches[0].clientY;

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // Calculate angle from center to touch start
            const startAngle = Math.atan2(touchStartY - centerY, touchStartX - centerX);
            // Calculate angle from center to touch current
            const currentAngle = Math.atan2(touchCurrentY - centerY, touchCurrentX - centerX);

            let deltaAngle = currentAngle - startAngle;

            // Adjust for angle wrap-around
            if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
            if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

            currentRotationAngle += deltaAngle; // Accumulate rotation

            // Apply gravity based on the rotation angle
            const gravityMagnitude = 9.82; // Standard gravity
            world.gravity.x = gravityMagnitude * Math.cos(currentRotationAngle + Math.PI / 2); // +PI/2 to align with Y-axis up
            world.gravity.y = gravityMagnitude * Math.sin(currentRotationAngle + Math.PI / 2);
            world.gravity.z = 0; // Assuming rotation is in XY plane

            // Update start position for next move event to make it continuous
            touchStartX = touchCurrentX;
            touchStartY = touchCurrentY;
        }
    });

    renderer.domElement.addEventListener('touchend', (event) => {
        // Optionally reset gravity or apply a damping effect
    });

    animate(); // Start the animation loop
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});