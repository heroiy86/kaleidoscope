const { Engine, World, Bodies, Composite } = Matter;

let engine;
let world;
let particles = [];
let numParticles = 100; // Increased particle count
let kaleidoscopeRadius; // Define kaleidoscope radius globally

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // Use HSB color mode for vibrant colors
  engine = Engine.create();
  world = engine.world;

  // Calculate kaleidoscope radius
  kaleidoscopeRadius = min(width, height) * 0.45; // Slightly less than half to leave some margin

  // Add walls (these walls are outside the visible kaleidoscope area)
  const wallOptions = { isStatic: true, restitution: 1, friction: 0 };
  World.add(world, [
    Bodies.rectangle(width / 2, -5, width, 10, wallOptions), // top
    Bodies.rectangle(width / 2, height + 5, width, 10, wallOptions), // bottom
    Bodies.rectangle(-5, height / 2, 10, height, wallOptions), // left
    Bodies.rectangle(width + 5, height / 2, 10, height, wallOptions) // right
  ]);

  // Add some initial particles
  for (let i = 0; i < numParticles; i++) {
    particles.push(createParticle());
  }

  // Particle count slider setup
  const particleCountSlider = document.getElementById('particleCount');
  particleCountSlider.value = numParticles; // Set initial slider value
  particleCountSlider.addEventListener('input', () => {
    const newParticleCount = parseInt(particleCountSlider.value);
    const diff = newParticleCount - particles.length;

    if (diff > 0) {
      // Add particles
      for (let i = 0; i < diff; i++) {
        particles.push(createParticle());
      }
    } else if (diff < 0) {
      // Remove particles
      for (let i = 0; i < Math.abs(diff); i++) {
        const removedParticle = particles.pop();
        if (removedParticle) {
          World.remove(world, removedParticle);
        }
      }
    }
    numParticles = newParticleCount; // Update the global particle count
  });

  // Add device orientation event listener
  // Request permission for iOS 13+
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // On click, request permission
    document.body.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
              document.getElementById('permission-overlay')?.remove();
            }
          })
          .catch(console.error);
    });
    // Add a visual cue for the user to click
    const overlay = document.createElement('div');
    overlay.id = 'permission-overlay';
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); color: white; display: flex; justify-content: center; align-items: center; font-size: 24px; cursor: pointer; z-index: 100;';
    overlay.innerHTML = 'Click to start';
    document.body.appendChild(overlay);

  } else {
    // Handle regular non-iOS 13+ devices.
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function draw() {
  background(0, 25); // Fading background for a trail effect
  Engine.update(engine);

  translate(width / 2, height / 2);

  // Clip drawing to a circle
  push();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, kaleidoscopeRadius, 0, TWO_PI);
  drawingContext.clip();

  const numSectors = 6;
  for (let i = 0; i < numSectors; i++) {
    rotate(TWO_PI / numSectors);
    drawParticles();
    scale(1, -1); // Reflect for kaleidoscope effect
    drawParticles();

    // Draw kaleidoscope sector lines
    stroke(255, 50); // White with some transparency
    strokeWeight(1);
    line(0, 0, kaleidoscopeRadius, 0);
  }
  pop(); // End clipping

  // Draw the outer circle boundary
  noFill();
  stroke(255, 100);
  strokeWeight(2);
  ellipse(0, 0, kaleidoscopeRadius * 2);
}

function createParticle() {
  // Create particles within the kaleidoscope radius
  const angle = random(TWO_PI);
  const dist = random(kaleidoscopeRadius * 0.7);
  const x = dist * cos(angle);
  const y = dist * sin(angle);

  const shapeType = random(['circle', 'box', 'polygon']);
  let particle;

  const options = {
      restitution: 0.8,
      friction: 0.1,
      density: 0.001
  };

  if (shapeType === 'circle') {
    const radius = random(8, 20);
    particle = Bodies.circle(x, y, radius, options);
    particle.shapeRadius = radius; // Store radius
  } else if (shapeType === 'box') {
    const size = random(10, 25);
    particle = Bodies.rectangle(x, y, size, size, options);
    particle.shapeWidth = size;
    particle.shapeHeight = size;
  } else { // polygon
    const radius = random(8, 20);
    const sides = round(random(3, 7));
    particle = Bodies.polygon(x, y, sides, radius, options);
    particle.shapeRadius = radius;
    particle.shapeSides = sides;
  }

  particle.shapeType = shapeType;
  // Assign a vibrant color
  particle.color = color(random(360), random(70, 100), 100, 80);

  World.add(world, particle);
  return particle;
}

// A helper function to avoid code duplication in draw()
function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Only draw particles if they are within the kaleidoscope radius
        if (dist(0, 0, p.position.x, p.position.y) < kaleidoscopeRadius + p.circleRadius) { // Add particle radius for full visibility
            drawParticle(p);
        }
    }
}

function drawParticle(particle) {
  const pos = particle.position;
  const angle = particle.angle;

  push();
  translate(pos.x, pos.y);
  rotate(angle);
  fill(particle.color);
  noStroke();

  switch (particle.shapeType) {
    case 'circle':
      ellipse(0, 0, particle.shapeRadius * 2);
      break;
    case 'box':
      rectMode(CENTER);
      rect(0, 0, particle.shapeWidth, particle.shapeHeight);
      break;
    case 'polygon':
      beginShape();
      for (let vert of particle.vertices) {
        vertex(vert.x - pos.x, vert.y - pos.y);
      }
      endShape(CLOSE);
      break;
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  kaleidoscopeRadius = min(width, height) * 0.45; // Recalculate radius on resize
  // Note: walls are not resized. For a full app, you'd need to remove and recreate them.
}

function handleOrientation(event) {
  const { beta, gamma } = event; // beta: -180 to 180 (front/back), gamma: -90 to 90 (left/right)
  const gravity = engine.world.gravity;
  // Map gamma and beta to gravity, with a multiplier for sensitivity
  gravity.x = constrain(gamma / 30, -1, 1);
  gravity.y = constrain(beta / 30, -1, 1);
}
