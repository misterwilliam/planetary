// Encapsulates HUD related logic.
// Depends on game calling tick() and handleResize() at the appropriate times.
// Creates a canvas for the renderer appended the body during the constructor.
// This can create a brittle dependency if the DOM is not in the expected state.

class Hud {
  private static DEFAULT_ZOOM_FACTOR = 3;
  private static HEART_MATERIAL = LoadJaggyMaterial('images/heart.png');
  private static SLOT_MATERIAL = LoadJaggyMaterial('images/inventory-slot.png');

  scene  : THREE.Scene = new THREE.Scene();
  camera : THREE.OrthographicCamera = new THREE.OrthographicCamera(
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({alpha:true});

  hearts : THREE.Sprite[];
  numHearts : Number;
  numInventorySlots : Number;

  inventorySlots : THREE.Sprite[];

  constructor() {
    this.camera.position.set(0, 0, 800);
    this.renderer.domElement.style.position = "absolute";
    document.body.appendChild(this.renderer.domElement);

    // Stuff that should be moved out.
    this.hearts = new Array<THREE.Sprite>();
    this.numHearts = 3;
    for (var i = 0; i < this.numHearts; i++) {
      var heart = new THREE.Sprite(Hud.HEART_MATERIAL);
      this.hearts[i] = heart;
      this.hearts[i].scale.set(4 * 16, 4 * 16, 1.0);
      this.scene.add(heart);
    }
    this.inventorySlots = new Array<THREE.Sprite>();
    this.numInventorySlots = 5;
    for (var i = 0; i < this.numInventorySlots; i++) {
      var slot = new THREE.Sprite(Hud.SLOT_MATERIAL);
      this.inventorySlots[i] = slot;
      slot.scale.set(4 * 32, 4 * 32, 1.0);
      this.scene.add(slot);
    }

    // This stuff should stay
    this.positionHudElements();
    this.handleResize();
  }

  tick() {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.positionHudElements();

    // Update camera size
    this.camera.left = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth;
    this.camera.right = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth;
    this.camera.top = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight;
    this.camera.bottom = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);


  }

  positionHudElements() {
    // Position hearts
    for (var i = 0; i < this.numHearts; i++) {
      this.hearts[i].position.set(
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth - 74 * (i + 1),
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight - 64, -1);

    }
    // Position inventory slots
    for (var i = 0; i < this.numInventorySlots; i++) {
      this.inventorySlots[i].position.set(
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth + 118 * i + 2 * 32,
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight + 63, -1);
      this.inventorySlots[i].scale.set(4 * 32, 4 * 32, 1.0);
    }
  }
}