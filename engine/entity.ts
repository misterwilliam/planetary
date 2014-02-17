interface Entity {
  tick() : void;
  sprite : THREE.Sprite;
  id : number
}

interface BlockAlignedEntity extends Entity {
  // x and y are in blockspace
  x: number;
  y: number;
}