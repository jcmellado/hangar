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

/*
References:
- "Rotating the Camera with the Mouse" by Daniel Lehenbauer
  http://viewport3d.com/trackball.htm
*/

HG.Trackball = function(canvas, camera){
  this.canvas = canvas;
  this.camera = camera;

  this.x = 0;
  this.y = 0;
  this.down = false;

  this.addListeners(canvas);
};

HG.Trackball.prototype.addListeners = function(canvas){
  var that = this,
      md = function(event){ that.onMouseDown(event); },
      mw = function(event){ that.onMouseWheel(event); },
      ms = function(event){ that.onMouseWheel(event); };

  canvas.addEventListener("mousedown", md, false);
  canvas.addEventListener("mousewheel", mw, false);
  canvas.addEventListener("DOMMouseScroll", ms, false);
};

HG.Trackball.prototype.onMouseDown = function(event){
  var that = this;
  
  this.down = true;
  this.x = event.clientX - this.canvas.offsetLeft;
  this.y = event.clientY - this.canvas.offsetTop;

  this.mu = function(event){ that.onMouseUp(event); };
  this.mm = function(event){ that.onMouseMove(event); };

  document.addEventListener("mouseup", this.mu, false);
  document.addEventListener("mousemove", this.mm, false);

  event.preventDefault();
};

HG.Trackball.prototype.onMouseUp = function(event){
  this.down = false;

  document.removeEventListener("mouseup", this.mu, false);
  document.removeEventListener("mousemove", this.mm, false);

  event.preventDefault();
};

HG.Trackball.prototype.onMouseMove = function(event){
  var x, y;

  if (this.down){
    x = event.clientX - this.canvas.offsetLeft;
    y = event.clientY - this.canvas.offsetTop;

    if (x !== this.x || y !== this.y){
      this.track(this.x, this.y, x, y);
      
      this.x = x;
      this.y = y;
    }
  }
};

HG.Trackball.prototype.onMouseWheel = function(event){
  var wheel = event.wheelDelta? event.wheelDelta / 120: -event.detail;
  
  this.camera.zoom( Math.max(0.05, 1 - wheel * 0.05) );
  
  event.preventDefault();
  
  return false;
};

HG.Trackball.prototype.track = function(x1, y1, x2, y2){
  var p1 = this.project(x1, y1),
      p2 = this.project(x2, y2),
      angle = Math.acos( vec3.dot(p1, p2) ),
      axis = vec3.create();

  if (angle){
    vec3.cross(p1, p2, axis);
    vec3.normalize(axis);
    
    this.camera.rotate(-angle, axis);
  }
};

HG.Trackball.prototype.project = function(x, y){
  var axis = this.camera.localAxis(),
      p = this.projectBall(x, y),
      q = vec3.create();
  
  vec3.scale(axis[0], p[0]);
  vec3.scale(axis[1], p[1]);
  vec3.scale(axis[2], p[2]);

  vec3.add(axis[0], vec3.add(axis[1], axis[2]), q);
  
  vec3.normalize(q);

  return q;
};

HG.Trackball.prototype.projectBall = function(x, y){
  var p = vec3.create();

  p[0] = ( x / (this.canvas.width * 0.5) ) - 1.0;
  p[1] = 1.0 - ( y / (this.canvas.height * 0.5) );
  p[2] = 1.0 - p[0] * p[0] - p[1] * p[1];
  p[2] = p[2] > 0.0? Math.sqrt(p[2]): 0.0;
  
  return p;
};
