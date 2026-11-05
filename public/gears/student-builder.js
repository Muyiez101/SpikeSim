/* SpikeSim builder bridge over the Gears configurator/world editor. GPL-3.0. */
(function(){
  'use strict';
  var origin,ready=false,kind,labels={};
  function tidyLabels(){
    document.querySelectorAll('.configurationTitle').forEach(function(title){var node=title.firstChild;if(node&&node.nodeType===3){var key=node.textContent.trim();if(labels[key])node.textContent=labels[key];if(key==='imageURL'||key==='modelURL')title.parentElement.style.display='none';}});
    document.querySelectorAll('.componentsList li').forEach(function(item){if(item.component&&item.component.type){var name=String(item.component.type);item.firstChild.textContent=labels[name]||name.replace(/([a-z])([A-Z])/g,'$1 $2');}});
  }
  // File-based Electron parents need '*' as the reply target; incoming messages
  // remain bound to the parent window and its original origin below.
  function send(type,data){if(origin)parent.postMessage(Object.assign({channel:'spikesim-builder',type:type},data),origin==='null'?'*':origin);}
  async function settle(){await new Promise(function(resolve){setTimeout(resolve,100);});while(!babylon.scene.isReady())await new Promise(function(resolve){setTimeout(resolve,50);});babylon.engine.resize();}
  async function rasterize(options){
    if(options.imageURL&&options.imageURL.startsWith('data:image/svg+xml')){
      var picture=new Image();await new Promise(function(resolve,reject){picture.onload=resolve;picture.onerror=reject;picture.src=options.imageURL;});
      var canvas=document.createElement('canvas');canvas.width=picture.width;canvas.height=picture.height;canvas.getContext('2d').drawImage(picture,0,0);options.imageURL=canvas.toDataURL('image/png');
    }
  }
  function clean(options){
    var result=JSON.parse(JSON.stringify(options));
    ['shortDescription','longDescription','longerDescription','thumbnail'].forEach(function(key){delete result[key];});
    return result;
  }
  window.addEventListener('message',async function(event){
    var data=event.data;if(event.source!==parent||!data||data.channel!=='spikesim-builder')return;
    if(!origin)origin=event.origin;if(event.origin!==origin)return;
    if(data.type==='hello'){if(ready)send('ready',{});return;}
    if(!ready)return;
    try{
      if(data.type==='configure'){
        labels=data.labels||{};
        if(kind==='robot'){
          var options=data.options;
          if(!options){if(data.fll)options=await(await fetch('robots/spikesim-fll.json')).json();else options=robotTemplates.find(function(t){return t.name===data.template;})||robotTemplates[0];}
          robot.options=clean(options);babylon.cameraArc.radius=60;configurator.clearHistory();configurator.saveHistory();configurator.resetScene();
        }else{
          var options=data.options;
          if(data.worldFile){var loaded=await(await fetch(data.worldFile)).json();options=loaded.options;}
          options=options||{};await rasterize(options);
          builder.worldOptions=Object.assign(JSON.parse(JSON.stringify(worlds[0].defaultOptions)),options);
          builder.clearHistory();builder.saveHistory();builder.resetScene();
        }
        await settle();tidyLabels();send('configured',{});
      }
      if(data.type==='image'&&kind==='world'){builder.saveHistory();builder.worldOptions.imageURL=data.image;builder.resetScene();await settle();send('configured',{});}
      if(data.type==='save'){
        var options=clean(kind==='robot'?robot.options:builder.worldOptions);
        if(kind==='robot')options.name=data.name;
        await rasterize(options);send('design',{kind:kind,name:data.name,options:options});
      }
    }catch(error){send('error',{message:String(error.message)});}
  });
  window.addEventListener('load',async function(){
    kind=document.body.dataset.builder;
    while(!window.babylon||!babylon.scene||!(kind==='robot'?window.configurator&&configurator.$componentList:window.builder&&builder.$objectsList))await new Promise(function(resolve){setTimeout(resolve,50);});
    if(kind==='robot'){
      var loadGround=world_Configurator.load;
      world_Configurator.load=async function(scene){await loadGround(scene);var texture=new BABYLON.DynamicTexture('student-grid',{width:256,height:256},scene,false);var ctx=texture.getContext();ctx.fillStyle='#eef1f7';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#c9d0e3';ctx.lineWidth=2;for(var i=0;i<=256;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}texture.update();texture.uScale=5;texture.vScale=5;world_Configurator.ground.material.diffuseTexture=texture;};
    }
    new MutationObserver(tidyLabels).observe(document.querySelector('.panels'),{childList:true,subtree:true});
    await settle();ready=true;send('ready',{});
  });
})();
