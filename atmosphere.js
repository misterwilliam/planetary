var ATMOS_MAT = new THREE.MeshBasicMaterial({color: 0x1e1e1e});
ATMOS_MAT.transparent = true;
ATMOS_MAT.blending = THREE.CustomBlending;
ATMOS_MAT.blendSrc = THREE.DstColorFactor;
ATMOS_MAT.blendDst = THREE.DstAlphaFactor;
ATMOS_MAT.blendEquation = THREE.AddEquation;

var ATMOS_SHAPE = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);

function AtmosphereController(scene) {
  this.scene = scene;
};

AtmosphereController.prototype.addAir = function(x, y) {
  var mesh = new THREE.Mesh(ATMOS_SHAPE, ATMOS_MAT);
  var lc = game.blockToLocal(x, y);
  mesh.position.set(lc[0], lc[1], -10);
  this.scene.add(mesh);
}