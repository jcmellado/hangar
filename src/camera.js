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

HG.Camera = function(setup){
  this.eye = vec3.create(setup.eye);
  this.poi = vec3.create(setup.poi);
  this.up = vec3.create(setup.up);
  this.fov = setup.fov;
  
  this.computeMatrix();
};

HG.Camera.prototype.computeMatrix = function(){
  this.transformer = mat4.lookAt(this.eye, this.poi, this.up);
};

HG.Camera.prototype.zoom = function(factor){
  vec3.subtract(this.eye, this.poi);
  
  vec3.scale(this.eye, factor);

  vec3.add(this.eye, this.poi);

  this.computeMatrix();
};

HG.Camera.prototype.rotate = function(angle, axis){
  var q = this.quaternion(angle, axis);
  
  vec3.subtract(this.eye, this.poi);
  
  quat4.multiplyVec3(q, this.eye);
  quat4.multiplyVec3(q, this.up);

  vec3.add(this.eye, this.poi);

  this.computeMatrix();
};

HG.Camera.prototype.localAxis = function(){
  var axis = [], dir = vec3.create();
  
  vec3.subtract(this.eye, this.poi, dir);
    
  axis[2] = vec3.normalize( vec3.create(dir) );
  axis[1] = vec3.normalize( vec3.create(this.up) );
  axis[0] = vec3.normalize( vec3.cross(this.up, dir, dir) );
  
  return axis;
};

HG.Camera.prototype.quaternion = function(angle, axis){
  var q = quat4.create(),
      h = angle / 2.0,
      s = Math.sin(h);

  q[0] = axis[0] * s;
  q[1] = axis[1] * s;
  q[2] = axis[2] * s;
  q[3] = Math.cos(h);

  return q;
};
