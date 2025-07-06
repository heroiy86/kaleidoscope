# Kaleidoscope App

This is a web-based kaleidoscope application that uses p5.js for rendering and Matter.js for 2D physics simulation. It responds to device orientation (tilt) to control gravity, creating an interactive and visually appealing experience.

## Features

- **Dynamic Kaleidoscope Effect:** Particles are rendered with a symmetrical kaleidoscope pattern.
- **Physics Simulation:** Utilizes Matter.js for realistic particle movement and collisions.
- **Device Tilt Control:** Gravity direction changes based on smartphone tilt (device orientation).
- **Customizable Particles:** Particles have varied shapes (circles, squares, polygons) and vibrant, rainbow-like colors.
- **Circular Display Area:** The kaleidoscope is confined to a circular area, enhancing the visual effect.
- **Particle Count Adjustment:** A slider allows users to dynamically control the number of particles.
- **iOS Device Compatibility:** Includes a permission request for device orientation on iOS 13+.

## How to Use

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/heroiy86/kaleidoscope.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd kaleidoscope
    ```
3.  **Open `index.html`:**
    Simply open the `index.html` file in your web browser. For device tilt functionality, it's recommended to open it on a smartphone or tablet.

## Deployment on GitHub Pages

This application is designed to be easily deployed on GitHub Pages. Follow these steps:

1.  **Push your code to a GitHub repository** (if you haven't already).
2.  **Go to your repository on GitHub.**
3.  **Navigate to `Settings` > `Pages`.**
4.  **Under `Branch`, select `main` (or your primary branch) and `/ (root)` for the folder.**
5.  **Click `Save`.**

Your application will be deployed to `https://<your-username>.github.io/<your-repository-name>/` within a few minutes.

## Technologies Used

-   **p5.js:** For creative coding and drawing.
-   **Matter.js:** For 2D rigid body physics.
-   **HTML, CSS, JavaScript:** Standard web technologies.

## License

This project is open source and available under the [MIT License](LICENSE).