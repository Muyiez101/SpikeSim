/* SpikeSim field measurements and physical objectives. GPL-3.0, 2026-11-01. */
window.spikeField=new function(){
  'use strict';
  var self=this,send=function(){},active=false,points=[],lines=[],targets=[],goal=null,baseline=null,held=0,last=0,passed=false,locked=false,design=null,marker=null;
  var copy={},names={},measureHeading=0,previous=null,lastDescribe=0,result=null;
  function yaw(){return robot.body.rotationQuaternion.toEulerAngles().y*180/Math.PI;}
  function rotationDistance(a,b){var dot=Math.abs(BABYLON.Quaternion.Dot(a,b))/Math.sqrt(BABYLON.Quaternion.Dot(a,a)*BABYLON.Quaternion.Dot(b,b));return 2*Math.acos(Math.min(1,dot))*180/Math.PI;}
  function publish(){send('measurement',{points:points.map(function(p){return {x:p.x,y:p.z};}),heading:measureHeading,wheelDiameter:robot.processedOptions.wheelDiameter});}
  function cleanLines(){lines.forEach(function(line){if(!line.isDisposed())line.dispose();});lines=[];}
  function draw(){
    cleanLines();
    if(points.length>1){var line=BABYLON.MeshBuilder.CreateLines('student-measure-line',{points:points.map(function(p){return new BABYLON.Vector3(p.x,0.6,p.z);})},babylon.scene);line.color=new BABYLON.Color3(0.5,0.3,1);line.isPickable=false;lines.push(line);}
    points.forEach(function(p){var marker=BABYLON.MeshBuilder.CreateSphere('student-measure-point',{diameter:1.3,segments:8},babylon.scene);marker.position=new BABYLON.Vector3(p.x,0.7,p.z);marker.material=babylon.getMaterial(babylon.scene,'d8ff59');marker.isPickable=false;lines.push(marker);});publish();
  }
  function pointAtPointer(){var ray=babylon.scene.createPickingRay(babylon.scene.pointerX,babylon.scene.pointerY,BABYLON.Matrix.Identity(),babylon.scene.activeCamera);var distance=ray.intersectsPlane(new BABYLON.Plane(0,1,0,0));if(distance===null||distance<0)return;var point=ray.origin.add(ray.direction.scale(distance));if(Math.abs(point.x)>5000||Math.abs(point.z)>5000)return;return point;}
  function rootImpostors(){return babylon.scene.getPhysicsEngine().getImpostors().filter(function(p){return !p.parent&&p.physicsBody&&p.object!==robot.body&&!p.object.component;});}
  function robotPart(mesh){for(var node=mesh;node;node=node.parent)if(node===robot.body||node.component)return true;return false;}
  function targetFor(id){return targets.find(function(target){return target.id===id;});}
  function position(mesh){var p=mesh.getAbsolutePosition();return {x:p.x,y:p.z,height:p.y};}
  function describe(){
    var counts={},jointMeshes=[];
    (babylon.world.hinges||[]).concat(babylon.world.ballJoints||[]).forEach(function(j){Object.values(j).forEach(function(v){if(v&&v.id)jointMeshes.push(v.id);});});
    targets=rootImpostors().filter(function(p){return !robotPart(p.object)&&p.getParam('mass')>0;}).slice(0,200).map(function(p,index){
      var mesh=p.object;mesh.computeWorldMatrix(true);var bounds=mesh.getBoundingInfo().boundingBox.extendSizeWorld.scale(2),pos=position(mesh);
      var joint=Boolean(p._joints&&p._joints.length)||jointMeshes.includes(mesh.id),magnetic=Boolean(mesh.isMagnetic);
      var type=magnetic?copy.magnetic:joint?copy.mechanism:copy.object;counts[type]=(counts[type]||0)+1;
      // Legacy worlds reuse names such as "box". Keep identifiers unique and
      // stable while retaining authored IDs used by existing projects.
      var duplicate=(babylon.scene.meshes||[]).some(function(other){return other!==mesh&&other.id===mesh.id;});
      var id=duplicate?mesh.id+'-'+mesh.uniqueId:mesh.id;
      return {id:id,label:names[mesh.id]||type+' '+counts[type],x:pos.x,y:pos.y,height:pos.height,mass:p.getParam('mass'),joint:joint,magnetic:magnetic,size:[bounds.x,bounds.z,bounds.y],mesh:mesh};
    });
    var actuators=[];function walk(list){list.forEach(function(c){if(c.type.endsWith('Actuator'))actuators.push(c);if(c.components)walk(c.components);});}walk(robot.components);
    var ports=design?design.motors.filter(function(m){return m.side!=='left'&&m.side!=='right';}):[];
    var state={targets:targets.map(function(t){var copy=Object.assign({},t);delete copy.mesh;return copy;}),robot:{x:robot.body.position.x,y:robot.body.position.z,heading:robot.body.rotationQuaternion.toEulerAngles().y*180/Math.PI},attachments:actuators.slice(0,ports.length).map(function(c,i){return {port:ports[i].port,type:c.type,position:Number(c.position)||0};})};
    var game=babylon.world.game;if(game&&Number.isFinite(game.score)){state.score=game.score;state.scoreLabel=copy.score;}
    send('field-state',state);
  }
  function showGoal(){
    if(marker&&!marker.isDisposed())marker.dispose();marker=null;
    var target=goal&&targetFor(goal.target),p=goal&&goal.destination;
    if(!target&&!p)return;
    var x=p?p.x:target.x,y=p?p.y:target.y;
    marker=BABYLON.MeshBuilder.CreateTorus('student-goal',{diameter:goal.action==='deliver'||goal.action==='reach'?goal.amount*2:Math.max(target.size[0],target.size[1])+3,thickness:0.4,tessellation:40},babylon.scene);marker.position.set(x,0.6,y);marker.material=babylon.getMaterial(babylon.scene,'d8ff59');marker.isPickable=false;
  }
  this.init=function(callback){send=callback;var down=null,canvas=document.getElementById('renderCanvas');canvas.addEventListener('pointerdown',function(event){down={x:event.clientX,y:event.clientY};},true);canvas.addEventListener('pointerup',function(event){if(!active||locked||event.button!==0||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)return;var point=pointAtPointer();if(!point||points.length>=20)return;if(!points.length)measureHeading=yaw();points.push(point);draw();},true);};
  this.reset=function(robotDesign,fieldGoal,fieldCopy,targetNames){design=robotDesign;copy=fieldCopy||{};names=targetNames||{};goal=fieldGoal||null;active=false;locked=false;points=[];cleanLines();baseline=null;previous=null;held=0;last=0;passed=false;result=null;marker=null;describe();showGoal();measureHeading=yaw();publish();send('goal-progress',{value:0,passed:false,heldMs:0,running:false});};
  this.setGoal=function(value){goal=value;baseline=null;previous=null;result=null;passed=false;held=0;showGoal();send('goal-progress',{value:0,passed:false,heldMs:0,running:false});};
  this.start=function(){active=false;locked=true;held=0;last=performance.now();passed=false;previous=null;result=null;var target=goal&&targetFor(goal.target);baseline=target?{position:target.mesh.getAbsolutePosition().clone(),rotation:target.mesh.absoluteRotationQuaternion.clone()}:null;};
  this.stop=function(completed){locked=false;if(!completed){passed=false;held=0;result=null;}if(goal)send('goal-progress',Object.assign({},result||{value:0,passed:false,heldMs:0},{running:false}));};
  this.frame=function(running){
    var now=performance.now();if(now-lastDescribe>500){describe();lastDescribe=now;}
    if(!goal||!running)return;
    if(now-last<20)return;
    var delta=Math.min(200,now-last);last=now;
    var target=targetFor(goal.target),value=0,success=false;
    if(goal.action==='score'){value=Number(babylon.world.game&&babylon.world.game.score)||0;success=value>=goal.amount;}
    else if(goal.action==='clearRing'){value=(babylon.world.dummies||[]).filter(function(m){var p=m.getAbsolutePosition();return p.y<0||Math.hypot(p.x,p.z)>100;}).length;success=value>=goal.amount&&robot.body.position.y>=0&&Math.hypot(robot.body.position.x,robot.body.position.z)<95;}
    else if(goal.action==='reach'&&goal.destination){value=Math.hypot(robot.body.position.x-goal.destination.x,robot.body.position.z-goal.destination.y);success=value<=goal.amount;}
    else if(target&&baseline&&!target.mesh.isDisposed()){
      var p=target.mesh.getAbsolutePosition();
      if(goal.action==='move')value=Math.hypot(p.x-baseline.position.x,p.z-baseline.position.z);
      if(goal.action==='lift')value=p.y-baseline.position.y;
      if(goal.action==='rotate')value=rotationDistance(target.mesh.absoluteRotationQuaternion,baseline.rotation);
      if(goal.action==='deliver'&&goal.destination){value=Math.hypot(p.x-goal.destination.x,p.z-goal.destination.y);success=value<=goal.amount;}
      else success=value>=goal.amount;
    }
    var mesh=['reach','score','clearRing'].includes(goal.action)?robot.body:target&&target.mesh;
    var p=mesh&&mesh.getAbsolutePosition(),q=mesh&&mesh.absoluteRotationQuaternion;
    var stable=previous&&p&&q&&BABYLON.Vector3.Distance(p,previous.p)*1000/delta<1.5;
    if(goal.action==='rotate')stable=stable&&rotationDistance(q,previous.q)*1000/delta<5;
    if(goal.action==='reach')stable=previous&&p&&Math.hypot(p.x-previous.p.x,p.z-previous.p.z)*1000/delta<1.5&&Math.abs(robot.leftWheel.speed)<15&&Math.abs(robot.rightWheel.speed)<15;
    previous=p&&q?{p:p.clone(),q:q.clone()}:null;
    held=success&&stable?held+delta:0;passed=held>=500;
    result={value:value,passed:passed,heldMs:held,running:true};send('goal-progress',result);
  };
  this.message=function(data){
    if(data.type==='measure'){active=Boolean(data.active);if(active){babylon.setCameraMode('orthoTop');}if(data.clear){points=[];draw();}return true;}
    if(data.type==='measure-robot'){measureHeading=yaw();points=[robot.body.getAbsolutePosition().clone()];draw();return true;}
    if(data.type==='measure-points'&&Array.isArray(data.points)&&data.points.length<=20&&data.points.every(function(p){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=5000&&Math.abs(p.y)<=5000;})){points=data.points.map(function(p){return new BABYLON.Vector3(p.x,0,p.y);});draw();return true;}
    if(data.type==='field-goal'){self.setGoal(data.goal||null);return true;}
    if(data.type==='field-inspect'){describe();return true;}
    return false;
  };
};
