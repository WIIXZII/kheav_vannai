let sections = document.querySelectorAll("section");
let spans = document.querySelectorAll("span");
window.onscroll = () => {
  sections.forEach((sec) => {
    let top = window.scrollY;
    let offset = sec.offsetTop - 100;
    let height = sec.offsetHeight;

    if (top >= offset && top < offset + height) {
      sec.classList.add("show-animate");
    } else {
      sec.classList.remove("show-animate");
    }
  });
};

// Variable Declarations for Three.js components
let scene, camera, renderer;
let planets = []; // Array to store planets
let orbitSpeeds = []; // Array to store orbit speeds
let asteroidBelt = []; // Array to store asteroids

// Initialization Function to set up the scene
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  ); // Set up the camera

  // Set up the WebGL renderer and add it to the document
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create the Sun
  const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sun);

  // Defining Planet Data
  const planetData = [
    { name: "Mercury", color: 0xaaaaaa, size: 2, distance: 20, speed: 0.02 },
    { name: "Venus", color: 0xffcc00, size: 3, distance: 30, speed: 0.015 },
    { name: "Earth", color: 0x0000ff, size: 3.5, distance: 40, speed: 0.01 },
    { name: "Mars", color: 0xff0000, size: 3, distance: 50, speed: 0.008 },
    { name: "Jupiter", color: 0xffa500, size: 5, distance: 70, speed: 0.006 },
    { name: "Saturn", color: 0xffff00, size: 4.5, distance: 90, speed: 0.005 },
    { name: "Uranus", color: 0x00ffff, size: 4, distance: 110, speed: 0.004 },
    { name: "Neptune", color: 0x0000ff, size: 4, distance: 130, speed: 0.003 },
  ];

  // Creating Each Planet and their orbits
  planetData.forEach((data) => {
    const geometry = new THREE.SphereGeometry(data.size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: data.color });
    const planet = new THREE.Mesh(geometry, material);
    planet.position.x = data.distance;
    planets.push({ mesh: planet, data: data });
    orbitSpeeds.push(data.speed);
    scene.add(planet);

    // Create orbit rings for visual effect
    const orbitGeometry = new THREE.RingGeometry(
      data.distance - 0.2,
      data.distance + 0.2,
      64
    );
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);
  });

  // Create asteroid belt
  const asteroidGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const asteroidMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

  for (let i = 0; i < 1000; i++) {
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    const angle = Math.random() * 2 * Math.PI;
    const distance = 60 + Math.random() * 20;
    asteroid.position.x = distance * Math.cos(angle);
    asteroid.position.z = distance * Math.sin(angle);
    asteroidBelt.push({ mesh: asteroid, distance: distance, angle: angle });
    scene.add(asteroid);
  }

  // Positioning the camera for a better view
  camera.position.set(0, 160, 200);
  camera.lookAt(0, 0, 0);

  // Starting animation loop
  animate();
}

// Animation Function
function animate() {
  requestAnimationFrame(animate);

  // Rotate and orbit planets
  planets.forEach(({ mesh, data }, index) => {
    mesh.rotation.y += 0.01; // Rotate planet
    mesh.position.x =
      data.distance * Math.cos(Date.now() * 0.001 * orbitSpeeds[index]);
    mesh.position.z =
      data.distance * Math.sin(Date.now() * 0.001 * orbitSpeeds[index]);
  });

  // Move asteroids around the belt
  asteroidBelt.forEach((asteroid) => {
    asteroid.angle += 0.001; // Rotation speed
    asteroid.mesh.position.x = asteroid.distance * Math.cos(asteroid.angle);
    asteroid.mesh.position.z = asteroid.distance * Math.sin(asteroid.angle);
  });

  renderer.render(scene, camera);
}

// Resizing window
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize, false);

// Clicking on Planets
document.body.addEventListener("click", (event) => {
  const { clientX: x, clientY: y } = event;
  const mouse = new THREE.Vector2(
    (x / window.innerWidth) * 2 - 1,
    -(y / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map((p) => p.mesh));

  if (intersects.length > 0) {
    const planet = planets.find((p) => p.mesh === intersects[0].object);
    if (planet) {
      document.getElementById(
        "info"
      ).innerText = `This is ${planet.data.name}!`;
    }
  }
});

// Starting the initialization
init();
