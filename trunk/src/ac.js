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
- "The AC3D file format" by Andy Colebourne
  http://www.inivis.com/ac3d/man/ac3dfileformat.html
*/

var AC = AC || {};

AC.SurfaceType = {
  POLYGON: 0,
  LINE_LOOP: 1,
  LINE_STRIP: 2
};

AC.SurfaceFlag = {
  SHADED: 0x10,
  TWO_SIDED: 0x20
};

AC.File = function(data){
  var stream = new AC.Stream(data);
  
  this.materials = [];
  this.objects = [];

  this.parse(stream);
};

AC.File.prototype.parse = function(stream){
  var transform = mat4.identity();

  stream.readToken(); //AC3Db
  
  while( stream.pending() ){
    switch( stream.readToken() ){
      case "MATERIAL":
        this.materials.push( new AC.Material(stream) );
        break;
      case "OBJECT":
        this.objects.push( new AC.Object(stream, transform) );
        break;
    }
  }
};

AC.Material = function(stream){
  this.name = stream.readString();
  stream.readToken(); //rgb
  this.diffuse = stream.readVector(3);
  stream.readToken(); //amb
  this.ambient = stream.readVector(3);
  stream.readToken(); //emis
  this.emissive = stream.readVector(3);
  stream.readToken(); //spec
  this.specular = stream.readVector(3);
  stream.readToken(); //shi
  this.shininess = stream.readFloat();
  stream.readToken(); //trans
  this.transparency = stream.readFloat();
};

AC.Object = function(stream, parentTransform){
  var kids;
  
  this.defaultValues();

  this.type = stream.readString();
  
  while(undefined === kids){
    switch( stream.readToken() ){
      case "name":
        this.name = stream.readString();
        break;
      case "data":
        this.data = stream.readBlob( stream.readInteger() );
        break;
      case "texture":
        this.texture = stream.readString();
        break;
      case "texrep":
        this.textureRepeat = stream.readVector(2);
        break;
      case "texoff":
        this.textureOffset = stream.readVector(2);
        break;
      case "rot":
        this.rotation = stream.readVector(9);
        break;
      case "loc":
        this.translation = stream.readVector(3);
        break;
      case "crease":
        this.crease = stream.readFloat();
        break;
      case "url":
        this.url = stream.readString();
        break;
      case "numvert":
        this.vertices = this.parseVertices(stream, parentTransform);
        break;
      case "numsurf":
        this.surfaces = this.parseSurfaces(stream);
        break;
      case "kids":
        kids = stream.readInteger();
        if (0 !== kids){
          this.children = this.parseKids(stream, kids, parentTransform);
        }
        break;
    }
  }
  
  if (this.surfaces){
    this.smoothNormals( this.sharedVertices() );
  }
};

AC.Object.prototype.defaultValues = function(){
  this.textureOffset = [0, 0];
  this.textureRepeat = [1, 1];
  this.rotation = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  this.translation = [0, 0, 0];
  this.crease = 61.0;
};

AC.Object.prototype.parseVertices = function(stream, parentTransform){
  var vertices = [], vertice = vec3.create(), transform = mat4.identity(),
      numvert = stream.readInteger(),
      i = 0;
  
  this.compose(transform, this.rotation, this.translation);
  mat4.multiply(transform, parentTransform);

  for (; i < numvert; ++ i){
    vertice[0] = stream.readFloat();
    vertice[1] = stream.readFloat();
    vertice[2] = stream.readFloat();
    
    mat4.multiplyVec3(transform, vertice);
    
    vertices.push(vertice[0], vertice[1], vertice[2]);
  }
  
  return vertices;
};

AC.Object.prototype.parseSurfaces = function(stream){
  var surfaces = [], numsurf = stream.readInteger(), i = 0, surface;
  
  for (; i < numsurf; ++ i){
    surface = new AC.Surface(stream, this);
    if (!surface.degenerated){
      surfaces.push(surface);
    }
  }
  
  return surfaces;
};

AC.Object.prototype.parseKids = function(stream, kids, parentTransform){
  var children = [], transform = mat4.identity(), i = 0;
  
  this.compose(transform, this.rotation, this.translation);
  mat4.multiply(transform, parentTransform);
  
  for (; i < kids; ++ i){
    stream.readToken(); //OBJECT
    children.push( new AC.Object(stream, transform) );
  }
  
  return children;
};

AC.Object.prototype.sharedVertices = function(){
  var surfaces = this.surfaces, numsurf = surfaces.length,
      shared = [], i = 0, j,
      indices, refs, index, surface, adjacents;

  for (; i < numsurf; ++ i){
    surface = surfaces[i];
    
    indices = surface.indices;
    refs = indices.length;
    
    for (j = 0; j < refs; ++ j){
      index = indices[j];
      
      adjacents = shared[index];
      if (!adjacents){
        shared[index] = [surface];
      }else{
        if (adjacents.indexOf(surface) === -1){
          adjacents.push(surface);
        }
      }
    }
  }
  
  return shared;
};  

AC.Object.prototype.smoothNormals = function(shared){
  var surfaces = this.surfaces, numsurf = surfaces.length,
      angle = Math.cos(this.crease * Math.PI / 180),
      i = 0, j, k, len, indices, refs, index, surface,
      adjacents, adjacent, normals, ns, na, nx, ny, nz, mod;

  for (; i < numsurf; ++ i){
    surface = surfaces[i];

    surface.normals = normals = [];
    ns = surface.normal;
    
    indices = surface.indices;
    refs = indices.length;
    
    for (j = 0; j < refs; ++ j){
      index = indices[j];
      
      nx = ns[0];
      ny = ns[1];
      nz = ns[2];
      
      adjacents = shared[index];
      len = adjacents.length;
      
      for (k = 0; k < len; ++ k){
        adjacent = adjacents[k];
       
        if (surface !== adjacent){
          na = adjacent.normal;
          
          if (ns[0] * na[0] + ns[1] * na[1] + ns[2] * na[2] > angle * ns[3] * na[3]){
            nx += na[0];
            ny += na[1];
            nz += na[2];
          }
        }
      }
      
      normals.push(nx, ny, nz);
    }
  }
};

AC.Object.prototype.compose = function(transform, r, t){
  transform[0]  = r[0]; transform[1]  = r[1]; transform[2]  = r[2];
  transform[4]  = r[3]; transform[5]  = r[4]; transform[6]  = r[5];
  transform[8]  = r[6]; transform[9]  = r[7]; transform[10] = r[8];
  transform[12] = t[0]; transform[13] = t[1]; transform[14] = t[2];
};

AC.Surface = function(stream, object){
  var refs;

  while(undefined === refs){
    switch( stream.readToken() ){
      case "SURF":
        this.parseFlags(stream);
        break;
      case "mat":
        this.materialId = stream.readInteger();
        break;
      case "refs":
        refs = stream.readInteger();
        this.parseRefs(stream, object, refs);
        break;
    }
  }
  
  this.normal = [0.0, 0.0, 0.0, 1.0];
  
  if (this.type === AC.SurfaceType.POLYGON){
    if ( !this.teselate(object, refs) ){
      this.degenerated = true;
    }
  }
};

AC.Surface.prototype.parseFlags = function(stream){
  var flags = stream.readInteger();
  
  this.type = flags & 0x0f;
  this.isShaded = (flags & AC.SurfaceFlag.SHADED) !== 0;
  this.isTwoSided = (flags & AC.SurfaceFlag.TWO_SIDED) !== 0;
};

AC.Surface.prototype.parseRefs = function(stream, object, refs){
  var offsetU = object.textureOffset[0],
      offsetV = object.textureOffset[1],
      repeatU = object.textureRepeat[0],
      repeatV = object.textureRepeat[1],
      indices = [], uvs = [], i = 0;

  for (; i < refs; ++ i){
    indices.push( stream.readInteger() );
    
    uvs.push(offsetU + stream.readFloat() * repeatU);
    uvs.push(offsetV + stream.readFloat() * repeatV);
  }

  this.indices = indices;
  this.uvs = uvs;
};

AC.Surface.prototype.teselate = function(object, refs){
  var coherence = false;

  if (refs >= 3){
  
    coherence = this.calculateNormal(object);
    if (coherence){
    
      if (refs > 3){
        coherence = this.triangulate(object);
      }
    }
  }
  
  return coherence;
};

AC.Surface.prototype.calculateNormal = function(object){
  var v = object.vertices,
      i = this.indices,
      i1 = i[0] * 3,
      i2 = i[1] * 3,
      i3 = i[2] * 3,
      v1x = v[i2]     - v[i1],
      v1y = v[i2 + 1] - v[i1 + 1],
      v1z = v[i2 + 2] - v[i1 + 2],
      v2x = v[i3]     - v[i1],
      v2y = v[i3 + 1] - v[i1 + 1],
      v2z = v[i3 + 2] - v[i1 + 2],
      nx = v1y * v2z - v2y * v1z,
      ny = v1z * v2x - v2z * v1x,
      nz = v1x * v2y - v2x * v1y,
      mod = Math.sqrt(nx * nx + ny * ny + nz * nz);

  this.normal = [nx, ny, nz, mod];
  
  return mod > 1e-10;
};

AC.Surface.prototype.triangulate = function(object){
  var vertices = object.vertices, indices = this.indices,
      n = this.normal, x = 0, y = 1,
      vs = [], len = indices.length, i = 0,
      index, orden, max;
  
  max = Math.max( Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2]) );
  
  if (max === Math.abs(n[0]) ){
    x = 1;
    y = 2;
  }else if (max === Math.abs(n[1]) ){
    x = 0;
    y = 2;
  }

  for (; i < len; ++ i){
    index = indices[i] * 3;
    vs.push( {x: vertices[index + x], y: vertices[index + y]} );
  }

  orden = AC.Triangulator.triangulate(vs);
  if (orden){
    this.sortRefs(orden);
  }
  
  return null !== orden;
};

AC.Surface.prototype.sortRefs = function(orden){
  var indices = this.indices, uvs = this.uvs, si = [], su = [],
      len = orden.length, i = 0, index;

  for (; i < len; ++ i){
    index = orden[i];

    si.push( indices[index] );
    su.push( uvs[index * 2], uvs[index * 2 + 1] );
  }

  this.indices = si;
  this.uvs = su;
};

AC.Stream = function(data){
  this.buffer = data;
  this.position = 0;
};

AC.Stream.prototype.pending = function(){
  return this.position !== this.buffer.length;
};

AC.Stream.prototype.space = function(){
  var c = this.buffer[this.position];
  
  return (' ' === c) || ('\r' === c) || ('\n' === c);
};

AC.Stream.prototype.quote = function(){
  return '\"' === this.buffer[this.position];
};

AC.Stream.prototype.readToken = function(){
  var start = this.position, token;

  for (; this.pending() && !this.space(); ++ this.position);
  token = this.buffer.substring(start, this.position); 
  for (; this.pending() && this.space(); ++ this.position);
  
  return token;
};

AC.Stream.prototype.readString = function(){
  var quoted = this.quote(),
      fn = quoted? this.quote: this.space,
      start = this.position, token;

  this.position += quoted;
  for (; this.pending() && !fn.call(this); ++ this.position);
  
  token = this.buffer.substring(start + quoted, this.position); 
  
  this.position += quoted;
  for (; this.pending() && this.space(); ++ this.position);

  return token;
};

AC.Stream.prototype.readBlob = function(len){
  var blob = this.buffer.substr(this.position, len);
  
  this.position += len;
  for (; this.pending() && this.space(); ++ this.position);
  
  return blob;
};

AC.Stream.prototype.readInteger = function(){
  return parseInt( this.readToken() );
};

AC.Stream.prototype.readFloat = function(){
  return parseFloat( this.readToken() );
};

AC.Stream.prototype.readVector = function(len){
  var vector = [], i = 0;
  
  for (; i < len; ++ i){
    vector.push( this.readFloat() );
  }
  
  return vector;
};
