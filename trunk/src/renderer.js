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

HG.Renderer = function(canvas){
  this.gl = canvas.getContext("experimental-webgl", {alpha:false} );
};

HG.Renderer.BackgroundColor = [0.5, 0.5, 0.65, 1.0];
HG.Renderer.LightPosition = [-50, 50, 50];
HG.Renderer.LightAmbient = [0.2, 0.2, 0.2];

HG.Renderer.prototype.setScene = function(path, scene, camera){
  this.scene = scene;
  this.camera = camera;
  
  this.reset();
  
  this.programs = this.programs || this.createPrograms();
  this.textures = this.createTextures(path, scene.textures);
  this.buffers = this.createBuffers(scene.groups);
};

HG.Renderer.prototype.reset = function(){
  var gl = this.gl, color = HG.Renderer.BackgroundColor;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(color[0], color[1], color[2], color[3]);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.BACK);
  
  gl.disable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.depthMask = true;
  this.culling = true;
  this.blending = false;
  this.program = undefined;
};

HG.Renderer.prototype.resize = function(width, height){
  var gl = this.gl;

  gl.canvas.width = width;
  gl.canvas.height = height;

  gl.viewport(0, 0, width, height);
};

HG.Renderer.prototype.setDepthMask = function(depthMask){
  var gl = this.gl;
  
  if (this.depthMask !== depthMask){
    gl.depthMask(depthMask);
  }
  this.depthMask = depthMask;
};

HG.Renderer.prototype.setCulling = function(culling){
  var gl = this.gl;

  if (this.culling !== culling){
    if (culling){
      gl.enable(gl.CULL_FACE);
    }else{
      gl.disable(gl.CULL_FACE);
      }
  }
  this.culling = culling;
};

HG.Renderer.prototype.setBlending = function(blending){
  var gl = this.gl;

  if (this.blending !== blending){
    if (blending){
      gl.enable(gl.BLEND);
    }else{
      gl.disable(gl.BLEND);
    }
  }
  this.blending = blending;
};

HG.Renderer.prototype.setProgram = function(program){
  var gl = this.gl;

  if (this.program !== program){
    program.use(gl);
  }
  this.program = program;
};

HG.Renderer.prototype.render = function(){
  var gl = this.gl;
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  this.draw(gl, this.scene, false);
  this.draw(gl, this.scene, true);
};

HG.Renderer.prototype.draw = function(gl, scene, transparent){
  var groups = scene.groups, buffers = this.buffers,
      numgroups = groups.length, i = 0,
      projector, normalizer, group, material, program;

  projector = mat4.perspective(this.camera.fov,
    gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000.0);
  
  normalizer = mat4.toInverseMat3(this.camera.transformer);
  mat3.transpose(normalizer);

  this.setBlending(transparent);
  this.setDepthMask(!transparent);

  for (i = 0; i < numgroups; ++ i){
    group = groups[i];

    material = scene.materials[group.materialId];
    if (transparent !== (0.0 === material.transparency) ){
    
      this.setCulling(!group.isTwoSided);
      
      program = this.getProgram(group);
      this.setProgram(program);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]);
      
      gl.uniformMatrix4fv(program.uniforms.uProjector, false, projector);
      gl.uniformMatrix4fv(program.uniforms.uTransformer, false, this.camera.transformer);

      gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 32, 0);

      if (group.type !== AC.SurfaceType.POLYGON){
        gl.uniform4fv(program.uniforms.uColor, scene.materials[group.materialId].diffuse.concat(1.0) );
      }

      if (group.type === AC.SurfaceType.POLYGON){
        gl.uniformMatrix3fv(program.uniforms.uNormalizer, false, normalizer);
        gl.uniform3fv(program.uniforms.uEmissive, material.emissive);
        gl.uniform3fv(program.uniforms.uAmbient, material.ambient);
        gl.uniform3fv(program.uniforms.uDiffuse, material.diffuse);
        gl.uniform3fv(program.uniforms.uSpecular, material.specular);
        gl.uniform1f(program.uniforms.uShininess, material.shininess);
        gl.uniform1f(program.uniforms.uTransparency, material.transparency);
        gl.uniform3fv(program.uniforms.uLightPosition, HG.Renderer.LightPosition);
        gl.uniform3fv(program.uniforms.uLightAmbient, HG.Renderer.LightAmbient);

        gl.vertexAttribPointer(program.attributes.aNormal, 3, gl.FLOAT, false, 32, 20);
      }

      if (undefined !== group.textureId){
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[group.textureId]);
        
        gl.uniform1i(program.uniforms.uSampler, 0);
        
        gl.vertexAttribPointer(program.attributes.aTexcoord, 2, gl.FLOAT, false, 32, 12);
      }

      gl.drawArrays( this.getDrawMode(group.type), 0, group.buffer.length/8);
  
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  }
};

HG.Renderer.prototype.getProgram = function(group){
  var program;
  
  if (group.type === AC.SurfaceType.POLYGON){
    if (group.textureId === undefined){
      program = this.programs.phong;
    }else{
      program = this.programs.phongTexture;
    }
  }else{
    if (group.textureId === undefined){
      program = this.programs.color;
    }else{
      program = this.programs.texture;
    }
  }
  
  return program;
};

HG.Renderer.prototype.getDrawMode = function(type){
  var gl = this.gl, mode;
  
  switch(type){
    case AC.SurfaceType.POLYGON:
      mode = gl.TRIANGLES;
      break;
    case AC.SurfaceType.LINE_STRIP:
      mode = gl.LINE_STRIP;
      break;
    case AC.SurfaceType.LINE_LOOP:
      mode = gl.LINE_LOOP;
      break;
  }

  return mode;
};

HG.Renderer.prototype.createPrograms = function(){
  var gl = this.gl;

  return {
    color: new HG.Shader(gl, HG.Shader.Color),
    texture: new HG.Shader(gl, HG.Shader.Texture),
    phong: new HG.Shader(gl, HG.Shader.Phong),
    phongTexture: new HG.Shader(gl, HG.Shader.PhongTexture)
  };
};

HG.Renderer.prototype.createBuffers = function(groups){
  var gl = this.gl, buffers = [], numgroups = groups.length, i = 0,
      buffer;
  
  for (; i < numgroups; ++ i){
    buffer = gl.createBuffer();
    buffers.push(buffer);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groups[i].buffer), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  return buffers;
};

HG.Renderer.prototype.createTextures = function(path, filenames){
  var gl = this.gl, textures = [], len = filenames.length, i = 0,
      filename, texture;
  
  for (; i < len; ++ i){
    filename = path + filenames[i];
    
    texture = gl.createTexture();
    textures.push(texture);
    
    switch( this.getExtension(filename) ){
      case "sgi":
      case "rgba":
      case "rgb":
      case "ra":
      case "bw":
        HG.Loader.loadBinary(filename, this, "onSgiTextureLoaded", {texture:texture});
        break;
      default:
        this.loadTexture(filename, texture);
        break;
    }
  }
  
  return textures;
};

HG.Renderer.prototype.getExtension = function(filename){
  var extension = "", position;

  position = filename.lastIndexOf(".");
  if (-1 !== position){
    extension = filename.substring(position + 1);
  }
    
  return extension.toLowerCase();
};

HG.Renderer.prototype.onSgiTextureLoaded = function(data, params){
  var gl = this.gl,
      file = new SGI.File(data),
      pot = this.isImagePowerOfTwo(file.img),
      wrapMode = pot? gl.REPEAT: gl.CLAMP_TO_EDGE,
      filterMode = pot? gl.LINEAR_MIPMAP_LINEAR: gl.LINEAR;

  gl.bindTexture(gl.TEXTURE_2D, params.texture);
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                file.img.width, file.img.height, 0, gl.RGBA,
                gl.UNSIGNED_BYTE, file.img.data);

  if (filterMode === gl.LINEAR_MIPMAP_LINEAR){
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
};

HG.Renderer.prototype.loadTexture = function(filename, texture){
  var gl = this.gl, that = this, image = new Image(),
      pot, wrapMode, filterMode;
  
  image.onload = function(){
    pot = that.isImagePowerOfTwo(image);
    wrapMode = pot? gl.REPEAT: gl.CLAMP_TO_EDGE;
    filterMode = pot? gl.LINEAR_MIPMAP_LINEAR: gl.LINEAR;
  
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    if (filterMode === gl.LINEAR_MIPMAP_LINEAR){
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
  };
  
  image.src = filename;
};

HG.Renderer.prototype.isImagePowerOfTwo = function(img){
  return this.isPowerOfTwo(img.width) && this.isPowerOfTwo(img.height);
};

HG.Renderer.prototype.isPowerOfTwo = function(n){
  return 0 === (n & (n - 1) );
};
