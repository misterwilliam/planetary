class GameModel {
  player : Player;
  terrainGrid = new Grid<Ground>();
  terrainStore = new TerrainStore(new FlatEarth());

  private _entities : Entity[] = [];
  private lastEntityId = -1;

  addEntity(entity : Entity) {
    entity.id = ++this.lastEntityId;
    this._entities[entity.id] = entity;
  }

  removeEntity(entity : Entity) {
    delete this._entities[entity.id];
  }

  get entities() : Entity[] {
    return this._entities;
  }
}