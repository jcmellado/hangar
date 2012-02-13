/*
Copyright (c) 2012 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

HG.Viewer = function(canvas){
  this.canvas = canvas;
  this.renderer = new HG.Renderer(canvas);
};

HG.Viewer.prototype.show = function(filename, setup, callback){
  var params = {filename: filename, setup: setup, callback:callback};

  HG.Loader.loadText(filename, this, "onModelLoaded", params);
};

HG.Viewer.prototype.onModelLoaded = function(data, params){
  var file = new AC.File(data),
      scene = new HG.Scene(file),
      camera = new HG.Camera( params.setup || this.fitToBoundingBox(scene) );

  this.renderer.setScene( this.getPath(params.filename), scene, camera);

  this.trackball = new HG.Trackball(this.canvas, camera);
  
  this.tick();
  
  params.callback();
};

HG.Viewer.prototype.tick = function(){
  var that = this;

  requestAnimationFrame( function(){ that.tick(); } );

  this.renderer.render();
};

HG.Viewer.prototype.onResize = function(width, height){
  this.renderer.resize(width, height);
};

HG.Viewer.prototype.fitToBoundingBox = function(scene){
  var setup = {}, bb = scene.boundingBox,
      dir = vec3.create(), distance;
  
  setup.eye = vec3.create();
  setup.poi = vec3.create();
  setup.up = [0.0, 1.0, 0.0];
  setup.fov = 45.0;
  
  setup.eye[0] = bb.xmin;
  setup.eye[1] = bb.ymax;
  setup.eye[2] = bb.zmax;
  
  setup.poi[0] = (bb.xmax + bb.xmin) * 0.5;
  setup.poi[1] = (bb.ymax + bb.ymin) * 0.5;
  setup.poi[2] = (bb.zmax + bb.zmin) * 0.5;

  vec3.subtract(setup.eye, setup.poi, dir);
  distance = vec3.length(dir) / ( Math.tan(setup.fov * (Math.PI / 180.0) * 0.5) );
  vec3.normalize(dir);
  vec3.scale(dir, distance);

  setup.eye = dir;
  
  return setup;
};

HG.Viewer.prototype.getPath = function(filename){
  var path = "", position;

  position = filename.lastIndexOf("/");
  if (-1 !== position){
    path = filename.substring(0, position + 1);
  }
    
  return path;
};
