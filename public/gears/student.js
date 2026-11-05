/* SpikeSim's simple block interface over Gears physics. GPL-3.0, 2026-11-01. */
(function () {
  'use strict';
  var parentOrigin, configuration, generation = 0, running = false, started = 0, timerStart = 0, elapsed = 0;
  var defaultSpeed = 60, motorSpeeds = {}, yawOffset = 0, wheelTravel = 17.6, marks = 0;
  var hub = {matrix:Array.from({length:5},function(){return [0,0,0,0,0];}),statusColor:'#22c55e',distanceLights:{},text:''};
  var audioContext, sound = false, blockId = '', ready = false, failed = false, bootFailed = false;
  var queue = Promise.resolve(), sceneRevision = 0, runRevision = 0, loading = false;
  var tasks={},taskSequence=0,buttons={left:false,right:false};
  var competitionLimit=0,competitionTimer=null,competitionMeshes=[];
  function competitionPose(){return {meshes:competitionMeshes.map(function(item){var mesh=item.mesh,q=mesh.rotationQuaternion||BABYLON.Quaternion.FromEulerVector(mesh.rotation);return {i:item.i,p:[mesh.position.x,mesh.position.y,mesh.position.z],r:[q.x,q.y,q.z,q.w],enabled:!mesh.isDisposed()&&mesh.isEnabled()};})};}
  function applyCompetitionPose(pose){if(!configuration||!configuration.competition||running||loading||!pose)return;babylon.scene.physicsEnabled=false;pose.meshes.forEach(function(item){var mesh=competitionMeshes.find(function(m){return m.i===item.i;});if(!mesh||mesh.mesh.isDisposed())return;mesh=mesh.mesh;mesh.position.copyFromFloats.apply(mesh.position,item.p);mesh.rotationQuaternion=new BABYLON.Quaternion(item.r[0],item.r[1],item.r[2],item.r[3]);mesh.setEnabled(item.enabled);});}
  // File-based Electron parents have an opaque "null" origin, which is not a
  // valid postMessage target. Replies still go only to the verified parent window.
  function send(type, data) { if (parentOrigin) parent.postMessage(Object.assign({channel:'spikesim-3d',type:type,configId:configuration&&configuration.configId},data),parentOrigin==='null'?'*':parentOrigin); }
  function enqueue(operation) {queue=queue.catch(function(){}).then(operation);return queue;}
  async function sceneReady(){while(!babylon.scene.isReady())await new Promise(function(resolve){setTimeout(resolve,50);});await new Promise(function(resolve){babylon.scene.onAfterRenderObservable.addOnce(resolve);});}
  function components() {
    var items=[]; function walk(list){list.forEach(function(item){items.push(item);if(item.components)walk(item.components);});} walk(robot.components); return items;
  }
  function motor(port) {
    var design = configuration.robot.motors.find(function(m){return m.port===port;});
    if (design && design.side==='left') return robot.leftWheel;
    if (design && design.side==='right') return robot.rightWheel;
    var extra = components().filter(function(c){return c.type.endsWith('Actuator');});
    var index = configuration.robot.motors.filter(function(m){return m.side!=='left' && m.side!=='right';}).findIndex(function(m){return m.port===port;});
    if (index>=0 && extra[index]) return extra[index];
    throw Error('No rotation motor for port '+port+'. Choose a robot with an arm.');
  }
  function sensor(type, port) {
    var logical = configuration.robot.devices.filter(function(d){return d.type===type;});
    var index = logical.findIndex(function(d){return d.port===port;});
    var name = {color:'ColorSensor',distance:'UltrasonicSensor',force:'TouchSensor',gyro:'GyroSensor'}[type];
    var matches = components().filter(function(c){return c.type===name || (type==='distance'&&c.type==='LaserRangeSensor');});
    if (index<0 || !matches[index]) throw Error('No '+type+' sensor for port '+port+'. Choose a robot with that sensor.');
    return matches[index];
  }
  function reading(type, port) {
    var device = sensor(type,port);
    if(type==='distance') { var distance=device.getDistance(); return distance>=250 ? -1:distance; }
    if(type==='force') return device.isPressed()?10:0;
    if(type==='color') return Colors.toColorName(Colors.toColor(Colors.toHSV(device.getRGB()))).toLowerCase().replace('nocolor','none');
    return device.getYawAngle();
  }
  function heading() { var gyro=components().find(function(c){return c.type==='GyroSensor';}); return (gyro?gyro.getYawAngle():robot.body.rotationQuaternion.toEulerAngles().y*180/Math.PI)+yawOffset; }
  function number(value,min,max) {var n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error('Value outside '+min+' to '+max);return n;}
  function runLimit(){return competitionLimit?competitionLimit*1000:babylon.world.name==='fireRescue'?600000:180000;}
  function speed(value){return number(value,-100,100);}
  function stopAll(){[robot.leftWheel,robot.rightWheel].concat(components()).forEach(function(m){if(m && typeof m.stop==='function')m.stop();});}
  function startMotor(m,value){m.speed_sp=speed(value)*8;if(value===0)m.stop();else m.runForever();}
  function startPair(left,right){if(!robot.leftWheel || !robot.rightWheel)throw Error('Choose a robot with two drive wheels.');startMotor(robot.leftWheel,left);startMotor(robot.rightWheel,right);}
  function wait(seconds) {
    seconds=number(seconds,0,60);var epoch=generation;
    return new Promise(function(resolve,reject){var until=performance.now()+seconds*1000;function poll(){if(epoch!==generation)return reject(Error('Program stopped'));if(performance.now()>=until)return resolve();setTimeout(poll,Math.min(15,seconds*1000));}poll();});
  }
  async function rotate(motors,speeds,degrees){
    if(motors.some(function(m){return !m;}))throw Error('Choose a robot with drive wheels.');
    if(motors.some(function(m){return m.type==='MagnetActuator';}))throw Error('Use seconds or Start motor to control the magnet power.');
    degrees=Math.abs(number(degrees,-36000,36000));var maximum=Math.max.apply(null,speeds.map(Math.abs));
    if(!maximum && degrees)throw Error('Set a motor speed greater than zero.');
    motors.forEach(function(m,i){var amount=maximum?degrees*Math.abs(speeds[i])/maximum:0;m.position_target=m.position+amount*Math.sign(speeds[i]);m.speed_sp=Math.abs(speed(speeds[i]))*8;if(amount)m.runToPosition();else m.stop();});
    var start=performance.now();
    while(motors.some(function(m){return m.mode===m.modes.RUN_TO_POS;})){if(performance.now()-start>60000)throw Error('The robot could not finish this move. Check for an obstacle.');await wait(0.015);}
  }
  function degrees(amount,unit){amount=number(amount,-3000,3000);return unit==='rotations'?amount*360:unit==='degrees'?amount:amount*(unit==='inches'?2.54:1)/wheelTravel*360;}
  async function turnBy(angle,value){
    angle=number(angle,-360,360);value=number(value,1,100);
    var target=heading()+angle,s=value*Math.sign(angle);
    await rotate([robot.leftWheel,robot.rightWheel],[s,-s],Math.abs(angle)*(robot.processedOptions.bodyWidth+robot.processedOptions.wheelWidth+2*robot.processedOptions.wheelToBodyOffset)/robot.processedOptions.wheelDiameter);
    var until=performance.now()+4000;
    for(;;){
      var error=((target-heading()+180)%360+360)%360-180;
      if(performance.now()>until){startPair(0,0);throw Error('The robot could not finish the turn. Check for an obstacle.');}
      if(Math.abs(error)<1){startPair(0,0);await wait(.12);var settled=((target-heading()+180)%360+360)%360-180;if(Math.abs(settled)<1)break;continue;}
      var correction=Math.min(value,8,Math.max(2,Math.abs(error)*.6))*Math.sign(error);startPair(correction,-correction);await wait(.015);
    }
    startPair(0,0);
  }
  async function moveFor(steering,amount,unit,direction){
    var s=defaultSpeed*(direction==='backward'?-1:1)*(amount<0?-1:1), turn=speed(steering);
    var left=turn<0?s*(1+turn/50):s,right=turn>0?s*(1-turn/50):s;
    if(unit==='seconds'){startPair(left,right);await wait(Math.abs(amount));startPair(0,0);}
    else if(turn===0){
      // Equal motor commands alone can drift under real contact forces. Use
      // wheel encoders for distance and the hub gyro to hold a straight course.
      var target=Math.abs(degrees(amount,unit)),sign=Math.sign(s),initial=[robot.leftWheel.position,robot.rightWheel.position],yaw=heading(),until=performance.now()+60000;
      for(;;){
        var travelled=((robot.leftWheel.position-initial[0])+(robot.rightWheel.position-initial[1]))*.5*sign,remaining=target-travelled;
        if(remaining<=1)break;
        if(performance.now()>until){startPair(0,0);throw Error('The robot could not finish this move. Check for an obstacle.');}
        var velocity=Math.min(Math.abs(s),Math.max(5,remaining*.65))*sign,error=((yaw-heading()+180)%360+360)%360-180;
        var correction=Math.max(-Math.abs(velocity)*.7,Math.min(Math.abs(velocity)*.7,error*2));
        startPair(Math.max(-100,Math.min(100,velocity+correction)),Math.max(-100,Math.min(100,velocity-correction)));await wait(.015);
      }
      startPair(0,0);await wait(.12);
    }else await rotate([robot.leftWheel,robot.rightWheel],[left,right],degrees(amount,unit));
  }
  function renderHub(){
    var panel=document.querySelector('.spike-hub');if(!panel)return;
    panel.style.borderTop='4px solid '+hub.statusColor;
    panel.querySelectorAll('i').forEach(function(pixel,index){pixel.style.opacity=String(0.08+0.92*hub.matrix[Math.floor(index/5)][index%5]/100);});
    panel.querySelector('span').textContent=hub.text;
  }
  var timedOperations=['tick','wait','move','moveFor','steerFor','turn','tank','motor','motorFor','pattern','text','beep'];
  function instant(op,args){
    if(!running)throw Error('Program stopped');
    if(performance.now()-started>runLimit() || ++marks>20000)throw Error('Program limit reached. Add a stop condition.');
    switch(op){
      case 'variables': send('variables',{values:args[0]});return null;
      case 'mark': blockId=String(args[0]);send('block',{id:blockId});return null;
      case 'speed': defaultSpeed=number(args[0],1,100);return null;
      case 'pair': if(motor(args[0])!==robot.leftWheel||motor(args[1])!==robot.rightWheel)throw Error('These ports are not the two drive motors.');return null;
      case 'wheelTravel': wheelTravel=number(args[0],.1,100);return null;
      case 'startMove': {var s=defaultSpeed*(args[0]==='backward'?-1:1);startPair(s,s);return null;}
      case 'startTank': startPair(speed(args[0]),speed(args[1]));return null;
      case 'stopMove': startPair(0,0);return null;
      case 'motorSpeed': motorSpeeds[args[0]]=speed(args[1]);return null;
      case 'motorStart': startMotor(motor(args[0]),(motorSpeeds[args[0]]===undefined?75:motorSpeeds[args[0]])*(args[1]==='counterclockwise'?-1:1));return null;
      case 'motorStop': motor(args[0]).stop();return null;
      case 'motorPosition': return motor(args[0]).position;
      case 'motorVelocity': return Math.max(-100,Math.min(100,(Number(motor(args[0]).speed)||0)/8));
      case 'motorReset': {var m=motor(args[0]);m.positionAdjustment+=m.position-number(args[1],-1e9,1e9);m.position=Number(args[1]);return null;}
      case 'distance': case 'color': case 'force': return reading(op,args[0]);
      case 'reflection': {var rgb=sensor('color',args[0]).getRGB();return Math.max(0,Math.min(100,(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255*100));}
      case 'button': return Boolean(buttons[args[0]]);
      case 'angle': {var angles=robot.body.rotationQuaternion.toEulerAngles();return args[0]==='pitch'?angles.x*180/Math.PI:args[0]==='roll'?angles.z*180/Math.PI:heading();}
      case 'heading': return heading();
      case 'resetYaw': yawOffset+=number(args[0],-1e9,1e9)-heading();return null;
      case 'timer': return (performance.now()-timerStart)/1000;
      case 'resetTimer': timerStart=performance.now();return null;
      case 'distanceLights': sensor('distance',args[0]);hub.distanceLights[args[0]]=args[1].map(function(v){return number(v,0,100);});break;
      case 'image': {var patterns={smile:'0000009090000009000909990',heart:'0909099999999990999000900',arrow:'0090009900999990990000900',check:'0000900090909000900000000'};var p=patterns[args[0]];if(!p)throw Error('Unknown image');hub.matrix=Array.from({length:5},function(_,y){return Array.from({length:5},function(_,x){return Number(p[y*5+x])/9*100;});});break;}
      case 'pixel': hub.matrix[number(args[1],0,4)][number(args[0],0,4)]=number(args[2],0,100);break;
      case 'clear': hub.matrix=hub.matrix.map(function(){return [0,0,0,0,0];});hub.text='';break;
      case 'light': hub.statusColor=({red:'#ef4444',yellow:'#facc15',green:'#22c55e',blue:'#3b82f6',purple:'#a855f7',white:'#ffffff',off:'#263047'})[args[0]]||'#263047';break;
      default: throw Error('Unsupported student operation: '+op);
    }
    renderHub();send('hub',{hub:hub});return null;
  }
  async function action(op,args){
    if(timedOperations.indexOf(op)===-1)return instant(op,args);
    if(!running)throw Error('Program stopped');
    if(performance.now()-started>runLimit() || ++marks>20000)throw Error('Program limit reached. Add a stop condition.');
    switch(op){
      case 'tick': return wait(0.01);
      case 'wait': return wait(args[0]);
      case 'move': {var previous=defaultSpeed;if(args[1]!==null)defaultSpeed=number(args[1],1,100);try{await moveFor(0,args[0],'cm','forward');}finally{defaultSpeed=previous;}return;}
      case 'moveFor': return moveFor(0,args[1],args[2],args[0]);
      case 'steerFor': return moveFor(args[0],args[1],args[2],'forward');
      case 'turn': return turnBy(args[0],args[1]);
      case 'tank': startPair(speed(args[0]),speed(args[1]));await wait(args[2]);startPair(0,0);return;
      case 'motor': {var m=motor(args[0]);startMotor(m,speed(args[1]));await wait(args[2]);m.stop();return;}
      case 'motorFor': {var m=motor(args[0]),s=(motorSpeeds[args[0]]===undefined?75:motorSpeeds[args[0]])*(args[1]==='counterclockwise'?-1:1)*(args[2]<0?-1:1);if(args[3]==='seconds'){startMotor(m,s);await wait(Math.abs(args[2]));m.stop();}else await rotate([m],[s],degrees(args[2],args[3]));return;}
      case 'pattern': {if(!/^[0-9]{25}$/.test(args[0]))throw Error('An image needs 25 brightness digits.');hub.matrix=Array.from({length:5},function(_,y){return Array.from({length:5},function(_,x){return Number(args[0][y*5+x])/9*100;});});renderHub();await wait(args[1]);hub.matrix=hub.matrix.map(function(){return [0,0,0,0,0];});break;}
      case 'text': hub.text=String(args[0]).slice(0,100);for(var letter of hub.text){hub.matrix=(configuration.glyphs[letter.toUpperCase()]||configuration.glyphs['?']).map(function(row){return [...row].map(function(v){return Number(v)*100;});});renderHub();await wait(0.25);}return;
      case 'beep': {var frequency=number(args[0],50,2000),duration=number(args[1],0,60);if(sound && audioContext){var tone=audioContext.createOscillator(),gain=audioContext.createGain();tone.frequency.value=frequency;gain.gain.value=0.07;tone.connect(gain);gain.connect(audioContext.destination);tone.start();tone.stop(audioContext.currentTime+duration);}send('sound',{frequency:frequency,durationMs:duration*1000});return wait(duration);}
      default: throw Error('Unsupported student operation: '+op);
    }
    renderHub();send('hub',{hub:hub});telemetry();
  }
  function telemetry(){
    if(!configuration || !robot.body || loading)return;
    if(configuration.competition && (configuration.spectator||!running))return;
    spikeField.frame(running);
    var readings={};configuration.robot.devices.forEach(function(d){try{var v=reading(d.type,d.port);readings[d.port]=d.type==='distance'&&v>=0?v*10:v;}catch(_){readings[d.port]='not connected';}});
    var objects=(configuration.objectIndices||[]).map(function(o){var mesh=babylon.scene.getMeshByID('worldBaseObject_'+o.kind+o.index);return mesh?{id:o.id,x:mesh.absolutePosition.x,y:mesh.absolutePosition.z}:null;}).filter(Boolean);
    if(running)elapsed=(performance.now()-started)/1000;
    send('frame',{t:elapsed,x:robot.body.position.x,y:robot.body.position.z,yaw:robot.body.rotationQuaternion.toEulerAngles().y*180/Math.PI,heading:heading(),sensors:readings,hub:hub,objects:objects,wheels:[robot.leftWheel?robot.leftWheel.position:0,robot.rightWheel?robot.rightWheel.position:0],running:running,pose:configuration.competition&&!configuration.spectator?competitionPose():undefined});
  }
  async function stop(){clearTimeout(competitionTimer);competitionTimer=null;generation++;runRevision++;running=false;tasks={};spikeField.stop();skulpt.hardInterrupt=true;stopAll();if(babylon.world&&typeof babylon.world.stopSim==='function')babylon.world.stopSim();for(var i=0;i<100&&skulpt.running;i++)await new Promise(function(r){setTimeout(r,10);});if(!loading)send('status',{status:'stopped'});}
  function fitField(resetView){
    if(!configuration||['arc','orthoTop'].indexOf(babylon.cameraMode)===-1)return;
    var size=babylon.world.processedOptions||babylon.world.options||{},aspect=babylon.engine.getRenderWidth()/Math.max(1,babylon.engine.getRenderHeight());
    // Use the actual ground tiles, including rotated tiles and courses made from
    // several pieces. Obstacles and the robot must not move the overview camera.
    var bounds=babylon.scene.meshes.filter(function(mesh){return !mesh.parent&&mesh.physicsImpostor&&mesh.physicsImpostor.mass===0;}).map(function(mesh){mesh.computeWorldMatrix(true);return mesh.getBoundingInfo().boundingBox;}).filter(function(box){return box.minimumWorld.y<=0&&box.maximumWorld.y<=.05&&box.maximumWorld.x-box.minimumWorld.x>1&&box.maximumWorld.z-box.minimumWorld.z>1;});
    var width=size.groundLength||size.length||configuration.fieldWidth||100,depth=size.groundWidth||size.width||configuration.fieldHeight||60,cx=0,cz=0;
    if(bounds.length){var minX=Math.min.apply(null,bounds.map(function(b){return b.minimumWorld.x;})),maxX=Math.max.apply(null,bounds.map(function(b){return b.maximumWorld.x;})),minZ=Math.min.apply(null,bounds.map(function(b){return b.minimumWorld.z;})),maxZ=Math.max.apply(null,bounds.map(function(b){return b.maximumWorld.z;}));width=maxX-minX;depth=maxZ-minZ;cx=(minX+maxX)/2;cz=(minZ+maxZ)/2;}
    var camera=babylon.cameraArc;
    if(resetView){camera.lockedTarget=null;camera.setTarget(new BABYLON.Vector3(cx,0,cz));camera.alpha=-Math.PI/2;camera.beta=babylon.cameraMode==='orthoTop'?0:Math.PI/5;camera.inertialAlphaOffset=camera.inertialBetaOffset=camera.inertialRadiusOffset=camera.inertialPanningX=camera.inertialPanningY=0;}
    if(babylon.cameraMode==='orthoTop'){var halfHeight=Math.max(depth/2,width/(2*aspect))*1.12;camera.orthoRadius=halfHeight*2.5;camera.radius=Math.max(width,depth)*1.5;babylon.zoomOrtho();}
    else camera.radius=Math.max(width/aspect,depth)*1.5;
  }
  function afterReset(){
    simPanel.onActive();babylon.engine.resize();babylon.setCameraMode('arc');
    // Small classroom maps need accurate wheel/ground contacts for centimetre
    // routes. Keep the heavier competition fields on their bundled settings.
    if(configuration.objectIndices){var physics=babylon.scene.getPhysicsEngine().getPhysicsPlugin();physics.setFixedTimeStep(1/240);physics.setMaxSteps(24);}
    // Only classroom scoring needs collision notifications. Compound mission
    // models contain child impostors whose Ammo bodies belong to their parent;
    // passing those children to contactPairTest can halt the entire render loop.
    if(configuration.objectIndices&&robot.body.physicsImpostor){var obstacles=babylon.scene.getPhysicsEngine().getImpostors().filter(function(impostor){return impostor.object.id.startsWith('worldBaseObject')&&!impostor.parent&&impostor.physicsBody;});robot.body.physicsImpostor.registerOnPhysicsCollide(obstacles,function(){if(running)send('collision',{});});}
    fitField(true);
    spikeField.reset(configuration.robot,configuration.fieldGoal,configuration.fieldCopy,configuration.targetNames);
    if(configuration.competition)components().filter(function(c){return c.type==='ColorSensor'&&c.render;}).forEach(function(c){var render=c.render;c.render=function(delta){if(running&&!configuration.spectator)return render.call(c,delta);};});
    competitionMeshes=babylon.scene.meshes.map(function(mesh,i){return {mesh:mesh,i:i};}).filter(function(item){return item.mesh.parent||item.mesh.component||(item.mesh.physicsImpostor&&item.mesh.physicsImpostor.mass>0);}).slice(0,600);
    babylon.scene.physicsEnabled=!configuration.spectator;
    if(configuration.competition){var scene=babylon.scene,renderScene=scene.render,lastRender=0;scene.render=function(){var now=performance.now();if(!loading&&!running&&now-lastRender<100)return;lastRender=now;return renderScene.apply(scene,arguments);};}
    document.querySelectorAll('.spike-hub button').forEach(function(button,index){button.textContent=index?'▶':'◀';button.title=configuration.hubButtons[index];button.setAttribute('aria-label',configuration.hubButtons[index]);});
  }
  async function configure(data){
    await stop();configuration=data;send('status',{status:'loading'});
    if(data.template){var template=robotTemplates.find(function(t){return t.name===data.template;});if(template)robot.options=JSON.parse(JSON.stringify(template));}
    if(data.robotOptions)robot.options=JSON.parse(JSON.stringify(data.robotOptions));
    if(data.template==='singleFollower'&&!data.robotOptions){
      robot.options.color='#8c78df';robot.options.bodyWidth=Math.max(6,data.robot.trackWidth/10-1.2);robot.options.bodyLength=data.robot.length/10;robot.options.wheelDiameter=data.robot.wheelDiameter/10;
      // Classroom poses and measured turns use the axle centre. Support the
      // front as well as the rear so sensors stay level during acceleration.
      robot.options.bodyEdgeToWheelCenterZ=robot.options.bodyLength/2;
      robot.options.wheelMaxAcceleration=5;
      robot.options.components=data.robot.devices.map(function(d){return {type:{color:'ColorSensor',distance:'UltrasonicSensor',force:'TouchSensor',gyro:'GyroSensor'}[d.type],position:[d.y/10,d.type==='color'?-1:d.type==='force'?0:2,d.x/10-(d.type==='force'?1.4:0)],rotation:[d.type==='color'?Math.PI/2:d.type==='force'?-Math.PI/2:0,d.heading/180*Math.PI,0],options:{}};});
      robot.options.components.push({type:'Sphere',position:[0,1-robot.options.bodyHeight/2-robot.options.wheelDiameter/2+1,robot.options.bodyLength/2-2.5],rotation:[0,0,0],options:{diameter:2,color:'#64748b'}});
      data.robot.motors.filter(function(m){return m.side!=='left'&&m.side!=='right';}).forEach(function(m,index){robot.options.components.push({type:'ArmActuator',position:[index%2?-4:4,3,2],rotation:[0,0,0],options:{minAngle:-180,maxAngle:180,armLength:8}});});
    }
    if(data.world){
      if(data.world.imageURL&&data.world.imageURL.startsWith('data:image/svg+xml')){
        var image=new Image();await new Promise(function(resolve,reject){image.onload=resolve;image.onerror=reject;image.src=data.world.imageURL;});
        var canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);data.world.imageURL=canvas.toDataURL('image/png');data.fieldWidth=image.width/10;data.fieldHeight=image.height/10;
      }
      babylon.world=world_Custom;world_Custom.mergeOptionsWithDefault(data.world);simPanel.worldOptionsSetting=data.world;await simPanel.resetSim();
    }
    else if(data.worldFile){if(!/^worlds\/missions\/.+\.json(?:\?.*)?$/.test(data.worldFile))throw Error('Choose a bundled competition field.');var response=await fetch(data.worldFile);if(!response.ok)throw Error('World file is missing.');var loaded=await response.json();if(data.competition)loaded.options.seed=42;babylon.world=worlds.find(function(w){return w.name===loaded.worldName;});if(!babylon.world)throw Error('Unknown world type');simPanel.worldOptionsSetting=loaded.options;await simPanel.resetSim();}
    else if(data.worldName){babylon.world=worlds.find(function(w){return w.name===data.worldName;});if(!babylon.world)throw Error('Unknown practice world');simPanel.worldOptionsSetting=data.worldOptions||{};await simPanel.resetSim();}
    else await simPanel.resetSim();
    started=0;elapsed=0;afterReset();await sceneReady();
  }
  window.spikeStudent={action:action,instant:instant,begin:function(op,args){var id=++taskSequence,state={done:false,error:null};tasks[id]=state;action(op,args).then(function(){state.done=true;},function(error){state.error=error;state.done=true;});return id;},poll:function(id){var state=tasks[id];if(!state)throw Error('Program stopped');if(state.error)throw state.error;if(state.done)delete tasks[id];return state.done;}};
  window.addEventListener('message',async function(event){
    var data=event.data;if(event.source!==parent || !data || data.channel!=='spikesim-3d')return;
    if(!parentOrigin)parentOrigin=event.origin;
    if(event.origin!==parentOrigin)return;
    try{
      if(data.type==='hello'){if(bootFailed)send('boot-error',{});else if(ready)send('ready',{});return;}
      if(!ready)return;
      if(data.type==='competition-pose'){applyCompetitionPose(data.pose);return;}
      if(data.type==='field-goal'){if(running||loading||!configuration)return;configuration.fieldGoal=data.goal||null;}
      if(spikeField.message(data))return;
      if(data.type==='attachment-test'){
        if(running||loading)return;
        var attachment=motor(data.port);if(attachment===robot.leftWheel||attachment===robot.rightWheel)return;
        var jog=Math.max(-20,Math.min(20,Number(data.speed)||0));
        send('attachment-busy',{busy:true});startMotor(attachment,jog);
        try{await wait(0.3);}finally{attachment.stop();send('attachment-busy',{busy:false});}return;
      }
      if(data.type==='configure'){
        var revision=++sceneRevision;loading=true;send('status',{status:'loading',configId:data.configId});await stop();
        return await enqueue(async function(){if(revision!==sceneRevision)return;await configure(data);if(revision===sceneRevision){loading=false;send('status',{status:'ready'});telemetry();}});
      }
      if(data.type==='stop')return await stop();
      if(data.type==='reset'){loading=true;send('status',{status:'loading'});await stop();return await enqueue(async function(){await simPanel.resetSim();started=0;elapsed=0;hub.matrix=hub.matrix.map(function(){return [0,0,0,0,0];});hub.text='';hub.distanceLights={};renderHub();afterReset();await sceneReady();loading=false;send('status',{status:'ready'});telemetry();});}
      if(data.type==='camera'){babylon.setCameraMode(data.mode==='top'?'orthoTop':data.mode);return;}
      if(data.type==='robotBuilder'){main.openPage('configurator.html');return;}
      if(data.type==='run'){
        if(configuration.spectator)return;
        await stop();var ticket=runRevision;
        return await enqueue(async function(){
        if(ticket!==runRevision||loading)return;
        competitionLimit=configuration.competition?number(data.timeLimit,10,600):0;
        babylon.scene.physicsEnabled=true;
        generation++;running=true;failed=false;started=timerStart=performance.now();defaultSpeed=60;wheelTravel=Math.PI*robot.processedOptions.wheelDiameter;motorSpeeds={};marks=0;yawOffset=0;sound=Boolean(data.sound);
        if(sound){audioContext=audioContext||new AudioContext();await audioContext.resume();}
        if(configuration.competition)robot.render(16);
        robot.reset();spikeField.start();send('status',{status:'running'});telemetry();skulpt.runPython(data.source);
        if(typeof babylon.world.startSim==='function')babylon.world.startSim();
        if(competitionLimit)competitionTimer=setTimeout(function(){if(!running)return;telemetry();void stop().then(function(){send('competition-timeout',{});});},competitionLimit*1000);
        });
      }
    }catch(error){loading=false;running=false;stopAll();send('error',{message:error.message});}
  });
  window.addEventListener('load',async function(){
    try{
    document.body.classList.remove('spikesim-split');document.body.classList.add('student-mode');
    var panel=document.createElement('div');panel.className='spike-hub';panel.innerHTML='<div class="spike-matrix">'+Array(25).fill('<i></i>').join('')+'</div><span></span>';document.querySelector('#simPanel').append(panel);renderHub();
    ['left','right'].forEach(function(name){var button=document.createElement('button');button.type='button';button.addEventListener('pointerdown',function(event){buttons[name]=true;button.setPointerCapture(event.pointerId);});['pointerup','pointercancel','lostpointercapture','blur'].forEach(function(type){button.addEventListener(type,function(){buttons[name]=false;});});button.addEventListener('keydown',function(event){if(event.key===' '||event.key==='Enter'){event.preventDefault();buttons[name]=true;}});button.addEventListener('keyup',function(){buttons[name]=false;});panel.append(button);});
    // The action manager is installed after the initial world and robot meshes load.
    while(!window.babylon || !babylon.scene || !babylon.scene.actionManager || !window.skulpt)await new Promise(function(r){setTimeout(r,50);});
    // Rendering prepares materials; waiting for readiness before starting it can deadlock.
    // Activate the simulator directly: legacy tab callbacks touch an uninitialized,
    // hidden Blockly dropdown and must not participate in the student startup.
    main.$navs.removeClass('active');document.getElementById('navSim').classList.add('active');
    document.getElementById('simPanel').classList.add('active');simPanel.onActive();babylon.engine.resize();
    var setCameraMode=babylon.setCameraMode;babylon.setCameraMode=function(mode){setCameraMode(mode);if(mode==='orthoTop')fitField(true);};
    window.addEventListener('resize',function(){if(ready&&!loading)fitField(false);});
    document.querySelector('#renderCanvas').addEventListener('webglcontextlost',function(){bootFailed=true;ready=false;send('boot-error',{});});
    await sceneReady();
    await Promise.all(['spikesim.py','spike_native.js'].map(async function(file){var response=await fetch(file);if(!response.ok)throw Error('Missing student runtime');skulpt.preloadedLibs['./'+file]=await response.text();}));
    simPanel.consoleWrite=function(text){send('output',{text:String(text)});};
    spikeField.init(send);
    // A classroom viewer receives poses, not a second robot simulation. Avoid
    // per-frame sensor readbacks on the GPU for spectators and idle previews.
    var renderRobot=robot.render;
    robot.render=function(delta){if(configuration&&configuration.competition&&configuration.spectator)return;return renderRobot.call(robot,delta);};
    simPanel.consoleWriteErrors=function(text){if(running&&!String(text).includes('SystemExit')){failed=true;send('error',{message:String(text)});}};
    var setRunIcon=simPanel.setRunIcon;simPanel.setRunIcon=function(type){setRunIcon(type);if(type==='run'&&running){clearTimeout(competitionTimer);competitionTimer=null;telemetry();running=false;stopAll();spikeField.stop(!failed);send('status',{status:failed?'error':'complete'});}};
    simPanel.onActive();babylon.engine.resize();if(!bootFailed){ready=true;send('ready',{});setInterval(telemetry,80);}
    }catch(error){bootFailed=true;ready=false;send('boot-error',{});}
  });
})();
