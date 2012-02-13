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

HG.Scene = function(file){
  this.materials = file.materials;
  this.textures = [];
  this.groups = [];
  this.boundingBox = new HG.BoundingBox();
  
  this.build(file.objects);
};

HG.Scene.prototype.build = function(objects){
  this.buildGroups(objects);

  this.groups.sort(HG.RenderGroup.sort);
};

HG.Scene.prototype.buildGroups = function(objects){
  var len = objects.length, i = 0, object;

  for (; i < len; ++ i){
    object = objects[i];
    
    if ("light" !== object.type && object.surfaces){
      this.buildGroup(object);
    }
    
    if (object.children){
      this.buildGroups(object.children);
    }
  }
};

HG.Scene.prototype.buildGroup = function(object){
  var texture = object.texture,
      vertices = object.vertices,
      surfaces = object.surfaces,
      numsurf = surfaces.length,
      bb = this.boundingBox,
      i = 0, j, k, l, x, y, z,
      indices, uvs, normals, normal, isShaded, refs,
      group, surface, buffer, index, textureId;

  if (texture){
    textureId = this.getTextureId(texture);
  }
  
  for (; i < numsurf; ++ i){
    surface = surfaces[i];
    
    indices = surface.indices;
    uvs = surface.uvs;
    normals = surface.normals;
    normal = surface.normal;
    isShaded = surface.isShaded;

    group = this.getGroup(surface, textureId);
    buffer = group.buffer;

    refs = indices.length;
    for (j = k = l = 0; j < refs; ++ j, k += 2, l += 3){
      index = indices[j] * 3;
    
      x = vertices[index];
      y = vertices[index + 1];
      z = vertices[index + 2];
    
      buffer.push(x, y, z);
    
      buffer.push(uvs[k], uvs[k + 1]);
      
      if (isShaded){
        buffer.push(normals[l], normals[l + 1], normals[l + 2]);
      }else{
        buffer.push(normal[0], normal[1], normal[2]);
      }
      
      bb.xmin = Math.min(bb.xmin, x);
      bb.xmax = Math.max(bb.xmax, x);
      bb.ymin = Math.min(bb.ymin, y);
      bb.ymax = Math.max(bb.ymax, y);
      bb.zmin = Math.min(bb.zmin, z);
      bb.zmax = Math.max(bb.zmax, z);
    }
  }
};

HG.Scene.prototype.getGroup = function(surface, textureId){
  var group = this.findGroup(surface, textureId);
  
  if (!group){
    group = new HG.RenderGroup(surface, textureId);
    this.groups.push(group);
  }
  
  return group;
};

HG.Scene.prototype.findGroup = function(surface, textureId){
  var i = this.groups.length - 1, group;

  for (; i >= 0; -- i){
    group = this.groups[i];
    if (group.materialId === surface.materialId &&
        group.textureId === textureId &&
        group.isTwoSided === surface.isTwoSided &&
        group.type === AC.SurfaceType.POLYGON &&
        surface.type === AC.SurfaceType.POLYGON){
      return group;
    }
  }
  
  return undefined;
};

HG.Scene.prototype.getTextureId = function(filename){
  var textures = this.textures, len = textures.length, i = 0;

  for (; i < len; ++ i){
    if (textures[i] === filename){
      break;
    }
  }
  if (i === len){
    textures.push(filename);
  }
  
  return i;
};

HG.RenderGroup = function(surface, textureId){
  this.materialId = surface.materialId;
  this.textureId = textureId;
  this.isTwoSided = surface.isTwoSided;
  this.type = surface.type;
  
  this.buffer = [];
};

HG.RenderGroup.sort = function(a, b){
  var texa = a.textureId === undefined? -1: a.textureId,
      texb = b.textureId === undefined? -1: b.textureId,
      sorted = a.type - b.type;
      
  if (0 === sorted){
    sorted = texa - texb;
    if (0 === sorted){
      sorted = a.materialId - b.materialId;
      if (0 === sorted){
        sorted = a.isTwoSided - b.isTwoSided;
      }
    }
  }
  
  return sorted;
};

HG.BoundingBox = function(){
  this.xmin = Infinity;
  this.xmax = -Infinity;
  this.ymin = Infinity;
  this.ymax = -Infinity;
  this.zmin = Infinity;
  this.zmax = -Infinity;
};
