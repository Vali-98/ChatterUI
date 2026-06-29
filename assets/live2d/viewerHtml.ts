/**
 * assets/live2d/viewerHtml.ts
 *
 * Viewer Live2D 100% hors-ligne.
 * Les bibliothèques sont chargées depuis assets/live2d/libs/ (bundlé dans l'APK).
 * Si les fichiers locaux sont introuvables, fallback automatique vers CDN.
 *
 * Pour préparer les fichiers locaux :
 *   bash assets/live2d/download_sdk.sh
 *
 * Messages RN → WebView (JSON) :
 *   { type:'load',       path:'file:///.../.model3.json' }
 *   { type:'expression', name:'smile' }
 *   { type:'motion',     group:'Idle', index:0 }
 *   { type:'resize',     width:360, height:640 }
 *
 * Messages WebView → RN (JSON) :
 *   { type:'ready' }
 *   { type:'loaded',  model:'NomDuModele' }
 *   { type:'error',   message:'...' }
 *   { type:'tap',     x:0.5, y:0.8 }
 */

// Ce placeholder est remplacé au runtime par Live2DViewer.tsx
// avec le chemin réel vers les assets locaux.
export const LIVE2D_VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:transparent}
    #wrap{position:fixed;inset:0}
    canvas{display:block}
    #loading{
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      color:rgba(255,255,255,.85);font:14px/1.6 sans-serif;text-align:center;
      pointer-events:none;text-shadow:0 1px 4px #000
    }
    #err{
      display:none;position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%);
      color:#ff6b6b;font:13px sans-serif;text-align:center;
      max-width:80%;background:rgba(0,0,0,.7);
      padding:12px 16px;border-radius:8px
    }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <div id="loading">Chargement Live2D…</div>
  <div id="err"></div>

  <script>
  'use strict';

  // ─── Communication RN ────────────────────────────────────────────────────
  var _localBase = '';   // injecté par Live2DViewer.tsx via postMessage 'init'

  function toRN(data){
    try{ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data)); }
    catch(_){}
  }
  function showErr(msg){
    document.getElementById('loading').style.display='none';
    var e=document.getElementById('err');
    e.textContent=msg; e.style.display='block';
    toRN({type:'error',message:msg});
  }

  // ─── Chargement des scripts (local → CDN fallback) ───────────────────────
  function loadScript(localPath, cdnUrl){
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.onload=resolve;
      s.onerror=function(){
        if(!cdnUrl){ reject(new Error('Cannot load '+localPath)); return; }
        var s2=document.createElement('script');
        s2.src=cdnUrl; s2.onload=resolve;
        s2.onerror=function(){ reject(new Error('Cannot load '+cdnUrl)); };
        document.head.appendChild(s2);
      };
      s.src=localPath;
      document.head.appendChild(s);
    });
  }

  // ─── État ────────────────────────────────────────────────────────────────
  var app=null, model=null;

  // ─── Init Pixi + modèle ──────────────────────────────────────────────────
  async function boot(localBase){
    _localBase = localBase || '';
    try{
      await loadScript(
        _localBase+'live2dcubismcore.min.js',
        'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'
      );
      await loadScript(
        _localBase+'pixi.min.js',
        'https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js'
      );
      await loadScript(
        _localBase+'pixi-live2d-display.min.js',
        'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js'
      );
    } catch(e){
      showErr('Impossible de charger le SDK Live2D.\\nVérifie ta connexion ou lance download_sdk.sh');
      return;
    }

    app=new PIXI.Application({
      width:window.innerWidth, height:window.innerHeight,
      backgroundAlpha:0, antialias:true,
      autoDensity:true, resolution:window.devicePixelRatio||1
    });
    document.getElementById('wrap').appendChild(app.view);

    // Tap → RN
    ['click','touchend'].forEach(function(ev){
      app.view.addEventListener(ev,function(e){
        var r=app.view.getBoundingClientRect();
        var cx=e.clientX||e.changedTouches?.[0]?.clientX;
        var cy=e.clientY||e.changedTouches?.[0]?.clientY;
        if(cx==null) return;
        toRN({type:'tap',x:(cx-r.left)/r.width,y:(cy-r.top)/r.height});
      });
    });

    window.addEventListener('resize',function(){
      if(app) app.renderer.resize(window.innerWidth,window.innerHeight);
    });

    toRN({type:'ready'});
  }

  async function loadModel(path){
    if(!app || !path) return;
    document.getElementById('loading').style.display='block';
    document.getElementById('err').style.display='none';
    try{
      if(model){ app.stage.removeChild(model); model.destroy(); model=null; }
      model=await PIXI.live2d.Live2DModel.from(path,{autoInteract:true});
      var sc=Math.min(
        app.renderer.width /model.internalModel.originalWidth,
        app.renderer.height/model.internalModel.originalHeight
      )*0.95;
      model.scale.set(sc);
      model.x=(app.renderer.width -model.internalModel.originalWidth *sc)/2;
      model.y=(app.renderer.height-model.internalModel.originalHeight*sc)/2;
      app.stage.addChild(model);
      document.getElementById('loading').style.display='none';
      try{ model.motion('Idle'); }catch(_){}
      var name=path.split('/').slice(-2,-1)[0]||'model';
      toRN({type:'loaded',model:name});
    }catch(e){
      showErr('Erreur chargement modèle:\\n'+e.message);
    }
  }

  function handleMessage(raw){
    var d; try{ d=JSON.parse(raw); }catch(_){ return; }
    switch(d.type){
      case 'init': boot(d.localBase); break;
      case 'load': loadModel(d.path); break;
      case 'expression': if(model) try{model.expression(d.name);}catch(_){} break;
      case 'motion':     if(model) try{model.motion(d.group,d.index||0);}catch(_){} break;
      case 'resize':     if(app) app.renderer.resize(d.width,d.height); break;
    }
  }

  document.addEventListener('message',function(e){handleMessage(e.data);});
  window.addEventListener('message',  function(e){handleMessage(e.data);});
  </script>
</body>
</html>
`
