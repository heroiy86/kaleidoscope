const { Engine, World, Bodies, Composite } = Matter;

let engine;
let world;
let particles = [];
let numParticles = 10; // Initial particle count
let kaleidoscopeRadius; // Define kaleidoscope radius globally
let circularBoundary; // Declare circularBoundary globally

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // Use HSB color mode for vibrant colors
  engine = Engine.create();
  world = engine.world;

  // Calculate kaleidoscope radius
  kaleidoscopeRadius = min(width, height) * 0.4; // Slightly less than half to leave some margin

  // Create a single robust circular boundary
  const wallOptions = { isStatic: true, restitution: 0.5, friction: 0 }; // Match particle restitution
  circularBoundary = Bodies.circle(width / 2, height / 2, kaleidoscopeRadius, wallOptions);
  World.add(world, circularBoundary);

  // Add some initial particles
  for (let i = 0; i < numParticles; i++) {
    particles.push(createParticle());
  }

  // Particle count slider setup
  const particleCountSlider = document.getElementById('particleCount');
  const particleCountDisplay = document.getElementById('particleCountDisplay');
  if (particleCountSlider && particleCountDisplay) {
    particleCountSlider.value = numParticles; // Set initial slider value
    particleCountDisplay.textContent = numParticles; // Set initial display value
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
      particleCountDisplay.textContent = numParticles; // Update display
    });
  }

  // Add touch event listeners for gravity control
  let touchStartX = 0;
  let touchStartY = 0;
  let currentRotationAngle = 0; // Current rotation angle for gravity

  canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length > 0) {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }
  });

  canvas.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      const touchCurrentX = event.touches[0].clientX;
      const touchCurrentY = event.touches[0].clientY;

      const centerX = width / 2;
      const centerY = height / 2;

      // Calculate angle from center to touch start
      const startAngle = atan2(touchStartY - centerY, touchStartX - centerX);
      // Calculate angle from center to touch current
      const currentAngle = atan2(touchCurrentY - centerY, touchCurrentX - centerX);

      let deltaAngle = currentAngle - startAngle;

      // Adjust for angle wrap-around
      if (deltaAngle > PI) deltaAngle -= 2 * PI;
      if (deltaAngle < -PI) deltaAngle += 2 * PI;

      currentRotationAngle += deltaAngle; // Accumulate rotation

      // Apply gravity based on the rotation angle
      const gravityMagnitude = 1; // Standard gravity for Matter.js
      world.gravity.x = gravityMagnitude * cos(currentRotationAngle + PI / 2); // +PI/2 to align with Y-axis up
      world.gravity.y = gravityMagnitude * sin(currentRotationAngle + PI / 2);

      // Update start position for next move event to make it continuous
      touchStartX = touchCurrentX;
      touchStartY = touchCurrentY;
    }
  });

  canvas.addEventListener('touchend', (event) => {
    // Optionally reset gravity or apply a damping effect
  });
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
  }

  pop(); // End clipping

  // Draw the outer circle boundary
  noFill();
  stroke(255, 100);
  strokeWeight(2);
  ellipse(0, 0, kaleidoscopeRadius * 2);

  // Draw gravity direction arrow
  push();
  translate(width / 2, height / 2);
  const gravity = engine.world.gravity;
  const arrowLength = 50;
  const arrowAngle = atan2(gravity.y, gravity.x);
  rotate(arrowAngle);
  stroke(255, 200, 0); // Yellowish orange
  strokeWeight(3);
  line(0, 0, arrowLength, 0);
  line(arrowLength, 0, arrowLength - 10, -5);
  line(arrowLength, 0, arrowLength - 10, 5);
  pop();
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
      restitution: 0.5, // Slightly lower restitution
      friction: 0.5,    // Higher friction
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
        drawParticle(p);
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
  // Recalculate and recreate the circular wall
  kaleidoscopeRadius = min(width, height) * 0.4; // Recalculate radius on resize
  // Remove existing wall
  if (circularBoundary) {
    World.remove(world, circularBoundary);
  }
  // Create a single robust circular boundary
  const wallOptions = { isStatic: true, restitution: 0.5, friction: 0 }; // Match particle restitution
  circularBoundary = Bodies.circle(width / 2, height / 2, kaleidoscopeRadius, wallOptions);
  World.add(world, circularBoundary);
}