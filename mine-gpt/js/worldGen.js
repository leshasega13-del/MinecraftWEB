// worldGen.js

const noise = new SimplexNoise(Math.random);
const worldWidth = 40;
const worldDepth = 40;
const maxHeight = 8;

const offsetX = -Math.floor(worldWidth/2);
const offsetZ = -Math.floor(worldDepth/2);

const treeHeightRange = [3, 5];
const treeProbability = 0.04;

function generateWorld() {
  for (let ix=0; ix<worldWidth; ix++) {
    for (let iz=0; iz<worldDepth; iz++) {
      const x = ix + offsetX;
      const z = iz + offsetZ;
      const n = noise.noise2D(ix/10, iz/10);
      const h = Math.max(1, Math.floor(((n+1)/2) * (maxHeight-1)) + 1);

      for (let y=0; y<h; y++) {
        const type = getBlockType(y, h);
        createBlock(x, y, z, type);
      }
      if (Math.random() < treeProbability) generateTree(x, h, z);
    }
  }
}

function getBlockType(y, colHeight) {
  if (y === colHeight-1) return 'grass';
  if (y > colHeight-4) return 'dirt';
  return 'stone';
}

function generateTree(x, h, z) {
  const th = Math.floor(Math.random()*(treeHeightRange[1]-treeHeightRange[0]+1))+treeHeightRange[0];
  for (let y=h; y<h+th; y++) createBlock(x,y,z,'wood');
  const r=2;
  for (let dx=-r; dx<=r; dx++)
    for (let dz=-r; dz<=r; dz++)
      for (let dy=0; dy<=1; dy++) {
        if (Math.sqrt(dx*dx+dz*dz+dy*dy)<=r)
          createBlock(x+dx,h+th+dy,z+dz,'leaves');
      }
}
