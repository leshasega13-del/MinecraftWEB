// cameraControls.js
// Movement, collisions, inventory, breaking/placing

const PLAYER = {
    height: 1.8,
    width: 0.6,
    depth: 0.6,
    speed: 5.0,
    runMultiplier: 1.9,
    jumpVelocity: 11.0,   // higher jump
    gravity: -25.0
  };
  
  let playerMesh=null;
  let velocityY=0;
  let yaw=0,pitch=0;
  let isPointerLocked=false;
  const keyStates={};
  const EPS=1e-4;
  
  // inventory
  const availableBlocks=['grass','dirt','stone','wood','leaves'];
  let selectedBlockIndex=0;
  
  function initHotbar() {
    const hotbar=document.getElementById('hotbar');
    hotbar.innerHTML='';
    availableBlocks.forEach((b,i)=>{
      const slot=document.createElement('div');
      slot.className='slot'+(i===selectedBlockIndex?' selected':'');
      slot.textContent=b;
      hotbar.appendChild(slot);
    });
  }
  function updateHotbar() {
    document.querySelectorAll('#hotbar .slot').forEach((s,i)=>{
      s.classList.toggle('selected',i===selectedBlockIndex);
    });
  }
  
  function initControls() {
    // invisible collider
    const geo=new THREE.BoxGeometry(PLAYER.width,PLAYER.height,PLAYER.depth);
    const mat=new THREE.MeshBasicMaterial({visible:false});
    playerMesh=new THREE.Mesh(geo,mat);
    scene.add(playerMesh);
  
    // spawn near 0,0
    let topY=-Infinity;
    for (let b of blocks) if (Math.round(b.position.x)===0 && Math.round(b.position.z)===0)
      topY=Math.max(topY,b.position.y);
    if (topY===-Infinity) topY=5;
    playerMesh.position.set(0, topY+0.5+PLAYER.height/2, 0);
  
    camera.rotation.order='YXZ';
    updateCameraFromPlayer();
  
    initHotbar();
  
    // pointer lock
    document.body.addEventListener('click',()=>{
      if(!isPointerLocked) document.body.requestPointerLock();
    });
    document.addEventListener('pointerlockchange',()=>{
      isPointerLocked=(document.pointerLockElement===document.body);
    });
  
    document.addEventListener('mousemove',(e)=>{
      if(!isPointerLocked) return;
      yaw -= e.movementX*0.0022;
      pitch -= e.movementY*0.0022;
      pitch=Math.max(-Math.PI/2+0.01,Math.min(Math.PI/2-0.01,pitch));
      updateCameraFromPlayer();
    });
  
    window.addEventListener('keydown',(e)=>{
      keyStates[e.code]=true;
      if(e.code==='Space') e.preventDefault();
  
      // 1-5 select block
      if(e.code.startsWith('Digit')){
        const num=parseInt(e.code.replace('Digit',''));
        if(num>=1&&num<=availableBlocks.length){
          selectedBlockIndex=num-1; updateHotbar();
        }
      }
    });
    window.addEventListener('keyup',(e)=>{ keyStates[e.code]=false; });
  
    // mouse for break/place
    document.addEventListener('mousedown',(e)=>{
      if(!isPointerLocked) return;
      if(e.button===0) breakBlock();
      if(e.button===2) placeBlock();
    });
    document.addEventListener('contextmenu',e=>e.preventDefault());
  }
  
  function updatePlayer(dt) {
    if(!playerMesh) return;
    const forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0,yaw,0));
    const right=new THREE.Vector3(1,0,0).applyEuler(new THREE.Euler(0,yaw,0));
    const moveDir=new THREE.Vector3();
    if(keyStates['KeyW']) moveDir.add(forward);
    if(keyStates['KeyS']) moveDir.add(forward.clone().negate());
    if(keyStates['KeyA']) moveDir.add(right.clone().negate());
    if(keyStates['KeyD']) moveDir.add(right);
  
    let speed=PLAYER.speed*((keyStates['ShiftLeft']||keyStates['ShiftRight'])?PLAYER.runMultiplier:1);
    if(moveDir.lengthSq()>0) moveDir.normalize().multiplyScalar(speed*dt);
  
    const onGround=isPlayerOnGround();
    if(keyStates['Space']&&onGround) velocityY=PLAYER.jumpVelocity;
    velocityY+=PLAYER.gravity*dt;
  
    // move per-axis
    tryMove(moveDir.x,0,0);
    tryMove(0,0,moveDir.z);
    tryMove(0,velocityY*dt,0);
  
    updateCameraFromPlayer();
  }
  
  function tryMove(dx,dy,dz){
    const cand=playerMesh.position.clone().add(new THREE.Vector3(dx,dy,dz));
    const hit=getFirstBlockIntersection(cand);
    if(!hit) playerMesh.position.copy(cand);
    else {
      if(dy<0){ // landed
        const top=hit.position.y+0.5;
        playerMesh.position.y=top+PLAYER.height/2+EPS;
        velocityY=0;
      } else if(dy>0){ // ceiling
        const bottom=hit.position.y-0.5;
        playerMesh.position.y=bottom-PLAYER.height/2-EPS;
        velocityY=0;
      }
    }
  }
  
  function updateCameraFromPlayer(){
    const eye=PLAYER.height/2-0.15;
    camera.position.set(playerMesh.position.x,playerMesh.position.y+eye,playerMesh.position.z);
    camera.rotation.order='YXZ';
    camera.rotation.x=pitch;
    camera.rotation.y=yaw;
  }
  
  // collisions
  function playerAABBAt(pos){
    const half=new THREE.Vector3(PLAYER.width/2,PLAYER.height/2,PLAYER.depth/2);
    return new THREE.Box3(pos.clone().sub(half),pos.clone().add(half));
  }
  function getFirstBlockIntersection(pos){
    const pb=playerAABBAt(pos);
    for(let b of blocks){
      const bb=new THREE.Box3(
        new THREE.Vector3(b.position.x-0.5,b.position.y-0.5,b.position.z-0.5),
        new THREE.Vector3(b.position.x+0.5,b.position.y+0.5,b.position.z+0.5)
      );
      if(pb.intersectsBox(bb)) return b;
    }
    return null;
  }
  function isPlayerOnGround(){
    const pos=playerMesh.position.clone(); pos.y-=0.05;
    return !!getFirstBlockIntersection(pos);
  }
  
  // breaking / placing
  const raycaster=new THREE.Raycaster();
  function breakBlock(){
    raycaster.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
    const hits=raycaster.intersectObjects(blocks);
    if(hits.length>0){
      const hit=hits[0].object;
      scene.remove(hit);
      const i=blocks.indexOf(hit);
      if(i>-1) blocks.splice(i,1);
    }
  }
  function placeBlock(){
    raycaster.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
    const hits=raycaster.intersectObjects(blocks);
    if(hits.length>0){
      const h=hits[0];
      const pos=h.object.position.clone().add(h.face.normal);
      createBlock(Math.round(pos.x),Math.round(pos.y),Math.round(pos.z),availableBlocks[selectedBlockIndex]);
    }
  }
  