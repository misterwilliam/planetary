/// <reference path='engine/game2d.ts'/>

class Hud {
  private static DEFAULT_ZOOM_FACTOR = 3;
  private static HEART_MATERIAL = LoadJaggyMaterial('images/heart.png');

  game : Game;
  scene  : THREE.Scene = new THREE.Scene();
  camera : THREE.OrthographicCamera = new THREE.OrthographicCamera(
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight,
    Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({alpha:true});

  hearts : THREE.Sprite[];

  constructor(game : Game) {
    this.game = game;
    this.camera.position.set(0, 0, 900);
    this.renderer.domElement.style.position = "absolute";
    document.body.appendChild(this.renderer.domElement);

    // Stuff that should be moved out.
    this.hearts = new Array<THREE.Sprite>();
    for (var i = 0; i < 3; i++) {
      var heart = new THREE.Sprite(Hud.HEART_MATERIAL);
      this.hearts[i] = heart;
      heart.position.set(
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth - 74 * (i + 1),
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight - 64, -1);
      heart.scale.set(4 * 16, 4 * 16, 1.0);
      this.scene.add(heart);
    }

    // This stuff should stay
    this.handleResize();
  }

  tick() {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    // Update health position
    for (var i = 0; i < 3; i++) {
      this.hearts[i].position.set(
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth - 74 * (i + 1),
        Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight - 64, -1);
    }

    // Update camera size
    this.camera.left = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerWidth;
    this.camera.right = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerWidth;
    this.camera.top = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * window.innerHeight;
    this.camera.bottom = Hud.DEFAULT_ZOOM_FACTOR * 0.5 * -window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}