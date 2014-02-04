var BACKGROUND_TEXTURE = THREE.ImageUtils.loadTexture("images/mountains.png");
var BACKGROUND_MATERIAL = new THREE.MeshBasicMaterial({map: BACKGROUND_TEXTURE});

class BackgroundController {
	constructor(public scene) {}
	drawBackground() {
	  for (var x = -30; x < 30; x++) {
	    var meshBg = new THREE.Mesh(new THREE.PlaneGeometry(640 * 2, 640 * 2),
	      BACKGROUND_MATERIAL);
	    meshBg.position.set(x * 640 * 2, 640 -100, -200 );
	    this.scene.add(meshBg);
	  }
	}
}
