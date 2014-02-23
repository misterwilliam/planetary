// Creates a generic full screen WebGL app with othrographic camera and
// animation loop. Automatically handles window resizes so that view is
// always fullscreen. Clients should extend Platformer2D and implement
// Platformer2DProtocol.

interface Platformer2DProtocol {
  scene : THREE.Scene;
  camera : THREE.OrthographicCamera;
  renderer : THREE.WebGLRenderer;
  projector : THREE.Projector;
  // Set to true if render has rendered a single frame, which initializes
  // render. Prior to this render is in invalid state.
  hasRendered : boolean;

  // Number of tickcounts since game began
  tickCount : number;

  // Call this to start game. Do not override.
  start() : void;
  // Override to implement game state update per tick of game clock
  handleTick() : void;
  // Override this to implement logic that happens during game initialization.
  handleStart() : void;
  // Override this to implement logic that happens during window resize.
  handleResize() : void;
}

var getNow = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance);
  }
  return function(){return +new Date()};
})();

class Platformer2D implements Platformer2DProtocol {
  private static DEFAULT_ZOOM_FACTOR = 3;
  private static MAX_CATCHUP = 10;

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth,
      Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth,
      Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight,
      Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  projector = new THREE.Projector();

  hasRendered = false;
  tickCount = 0;

  private now = getNow();
  private lastTime = getNow();
  private unprocessedFrames = 0;

  constructor() {
    this.camera.position.set(0, 0, 800);
    this.resize();
  }

  // Begin implement Platformer2DProtocol
  start() {
    window.addEventListener('resize', this.resize.bind(this));
    document.body.appendChild(this.renderer.domElement);
    this.handleStart();
    this.animate();
  }
  handleStart() { }
  handleResize() { }
  handleTick() { }
  // End implement Platformer2DProtocol

  private resize() {
    this.camera.left = Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth;
    this.camera.right = Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth;
    this.camera.top = Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight;
    this.camera.bottom = Platformer2D.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.handleResize();
  }

  // Called when when we are allowed to render. In general at 60 fps.
  animate() {
    this.now = getNow();
    this.unprocessedFrames += (this.now - this.lastTime) * 60.0 / 1000.0; // 60 fps
    this.lastTime = this.now;
    if (this.unprocessedFrames > Platformer2D.MAX_CATCHUP) {
      this.unprocessedFrames = Platformer2D.MAX_CATCHUP;
    }
    while (this.unprocessedFrames >= 1.0) {
      this.handleTick();
      this.tickCount++;
      this.unprocessedFrames -= 1.0;
    }
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }

  // Renders a single frame
  render() {
    this.hasRendered = true;
    this.renderer.render(this.scene, this.camera);
  }
}