// blockSystem.js

const blockColors = {
    grass: 0x4caf50,
    dirt:  0x8b5a2b,
    stone: 0x808080,
    wood:  0x8b5a2b,
    leaves:0x2e7d32
  };
  
  // global block list
  const blocks = [];
  
  function createBlock(x, y, z, type) {
    const color = blockColors[type] || 0xffffff;
    const g = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.MeshLambertMaterial({ color });
    const block = new THREE.Mesh(g, m);
    block.position.set(x, y, z);
    block.userData.blockType = type;
    scene.add(block);
    blocks.push(block);
  }
  