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

HG.Shader = function(gl, definition){
  this.program = this.createProgram(gl, definition);
  this.attributes = definition.attributes(gl, this.program);
  this.uniforms = definition.uniforms(gl, this.program);
};

HG.Shader.prototype.createProgram = function(gl, definition){
  var program = gl.createProgram(), shader, code;

  code = definition.defines + definition.vs;
  shader = this.createShader(gl, gl.VERTEX_SHADER, code);
  gl.attachShader(program, shader);

  code = definition.defines + definition.fs;
  shader = this.createShader(gl, gl.FRAGMENT_SHADER, code);
  gl.attachShader(program, shader);

  gl.linkProgram(program);

  return program;
};

HG.Shader.prototype.createShader = function(gl, type, code){
  var shader = gl.createShader(type);
  
  gl.shaderSource(shader, code);
  gl.compileShader(shader);

  return shader;
};

HG.Shader.prototype.use = function(gl){
  gl.useProgram(this.program);

  for (var attribute in this.attributes){
    gl.enableVertexAttribArray(this.attributes[attribute]);
  }
};

HG.Shader.Color = {};

HG.Shader.Color.vs = "\
attribute vec3 aPosition;\n\
\n\
#ifdef TEXTURE\n\
attribute vec2 aTexcoord;\n\
#endif\n\
\n\
uniform mat4 uProjector;\n\
uniform mat4 uTransformer;\n\
\n\
#ifdef TEXTURE\n\
varying vec2 vTexcoord;\n\
#endif\n\
\n\
void main(){\n\
#ifdef TEXTURE\n\
  vTexcoord = aTexcoord;\n\
#endif\n\
\n\
  gl_Position = uProjector * uTransformer * vec4(aPosition, 1.0);\n\
}";

HG.Shader.Color.fs = "\
#ifdef GL_ES\n\
  precision highp float;\n\
#endif\n\
\n\
#ifdef TEXTURE\n\
varying vec2 vTexcoord;\n\
#endif\n\
\n\
uniform vec4 uColor;\n\
\n\
#ifdef TEXTURE\n\
uniform sampler2D uSampler;\n\
#endif\n\
\n\
void main(){\n\
#ifdef TEXTURE\n\
  gl_FragColor = texture2D(uSampler, vTexcoord) * uColor;\n\
#else\n\
  gl_FragColor = uColor;\n\
#endif\n\
}";

HG.Shader.Color.defines = "";

HG.Shader.Color.attributes = function(gl, program){
  return{
    aPosition: gl.getAttribLocation(program, "aPosition")
  };
};

HG.Shader.Color.uniforms = function(gl, program){
  return{
    uProjector: gl.getUniformLocation(program, "uProjector"),
    uTransformer: gl.getUniformLocation(program, "uTransformer"),
    uColor: gl.getUniformLocation(program, "uColor")
  };
};

HG.Shader.Texture = {};

HG.Shader.Texture.fs = HG.Shader.Color.fs;

HG.Shader.Texture.vs = HG.Shader.Color.vs;

HG.Shader.Texture.defines = "#define TEXTURE\n";

HG.Shader.Texture.attributes = function(gl, program){
  return{
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aTexcoord: gl.getAttribLocation(program, "aTexcoord")
  };
};

HG.Shader.Texture.uniforms = function(gl, program){
  return{
    uProjector: gl.getUniformLocation(program, "uProjector"),
    uTransformer: gl.getUniformLocation(program, "uTransformer"),
    uColor: gl.getUniformLocation(program, "uColor"),
    uSampler: gl.getUniformLocation(program, "uSampler")
  };
};

HG.Shader.Phong = {};

HG.Shader.Phong.vs = "\
attribute vec3 aPosition;\n\
attribute vec3 aNormal;\n\
\n\
#ifdef TEXTURE\n\
attribute vec2 aTexcoord;\n\
#endif\n\
\n\
uniform mat4 uProjector;\n\
uniform mat4 uTransformer;\n\
uniform mat3 uNormalizer;\n\
\n\
varying vec3 vPosition;\n\
varying vec3 vNormal;\n\
\n\
#ifdef TEXTURE\n\
varying vec2 vTexcoord;\n\
#endif\n\
\n\
void main(){\n\
  vPosition = (uTransformer * vec4(aPosition, 1.0) ).xyz;\n\
  vNormal = normalize(uNormalizer * aNormal);\n\
\n\
#ifdef TEXTURE\n\
  vTexcoord = aTexcoord;\n\
#endif\n\
\n\
  gl_Position = uProjector * uTransformer * vec4(aPosition, 1.0);\n\
}";

HG.Shader.Phong.fs = "\
#ifdef GL_ES\n\
  precision highp float;\n\
#endif\n\
\n\
varying vec3 vPosition;\n\
varying vec3 vNormal;\n\
\n\
#ifdef TEXTURE\n\
varying vec2 vTexcoord;\n\
#endif\n\
\n\
uniform vec3 uEmissive;\n\
uniform vec3 uAmbient;\n\
uniform vec3 uDiffuse;\n\
uniform vec3 uSpecular;\n\
uniform float uShininess;\n\
uniform float uTransparency;\n\
\n\
uniform vec3 uLightPosition;\n\
uniform vec3 uLightAmbient;\n\
\n\
#ifdef TEXTURE\n\
uniform sampler2D uSampler;\n\
#endif\n\
\n\
void main(){\n\
  vec3 L = normalize(uLightPosition - vPosition);\n\
  vec3 E = normalize(-vPosition);\n\
  vec3 R = normalize( -reflect(L, vNormal) );\n\
\n\
#ifdef TEXTURE\n\
  vec4 sample = texture2D(uSampler, vTexcoord);\n\
\n\
  vec3 color = sample.rgb * \n\
    (uEmissive + \n\
     uAmbient * uLightAmbient + \n\
     uDiffuse * max( dot(vNormal, L), 0.0) ) + \n\
    uSpecular * 0.3 * pow( max( dot(R, E), 0.0), uShininess);\n\
\n\
  gl_FragColor = vec4(color, sample.a * (1.0 - uTransparency) );\n\
#else\n\
  vec3 color = uEmissive + \n\
    uAmbient * uLightAmbient + \n\
    uDiffuse * max( dot(vNormal, L), 0.0) + \n\
    uSpecular * 0.3 * pow( max( dot(R, E), 0.0), uShininess);\n\
\n\
  gl_FragColor = vec4(color, 1.0 - uTransparency);\n\
#endif\n\
}";

HG.Shader.Phong.defines = "";

HG.Shader.Phong.attributes = function(gl, program){
  return{
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aNormal: gl.getAttribLocation(program, "aNormal")
  };
};

HG.Shader.Phong.uniforms = function(gl, program){
  return{
    uProjector: gl.getUniformLocation(program, "uProjector"),
    uTransformer: gl.getUniformLocation(program, "uTransformer"),
    uNormalizer: gl.getUniformLocation(program, "uNormalizer"),
    uEmissive: gl.getUniformLocation(program, "uEmissive"),
    uAmbient: gl.getUniformLocation(program, "uAmbient"),
    uDiffuse: gl.getUniformLocation(program, "uDiffuse"),
    uSpecular: gl.getUniformLocation(program, "uSpecular"),
    uShininess: gl.getUniformLocation(program, "uShininess"),
    uTransparency: gl.getUniformLocation(program, "uTransparency"),
    uLightPosition: gl.getUniformLocation(program, "uLightPosition"),
    uLightAmbient: gl.getUniformLocation(program, "uLightAmbient")
  };
};

HG.Shader.PhongTexture = {};

HG.Shader.PhongTexture.fs = HG.Shader.Phong.fs;

HG.Shader.PhongTexture.vs = HG.Shader.Phong.vs;

HG.Shader.PhongTexture.defines = "#define TEXTURE\n";

HG.Shader.PhongTexture.attributes = function(gl, program){
  return{
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aNormal: gl.getAttribLocation(program, "aNormal"),
    aTexcoord: gl.getAttribLocation(program, "aTexcoord")
  };
};

HG.Shader.PhongTexture.uniforms = function(gl, program){
  return{
    uProjector: gl.getUniformLocation(program, "uProjector"),
    uTransformer: gl.getUniformLocation(program, "uTransformer"),
    uNormalizer: gl.getUniformLocation(program, "uNormalizer"),
    uEmissive: gl.getUniformLocation(program, "uEmissive"),
    uAmbient: gl.getUniformLocation(program, "uAmbient"),
    uDiffuse: gl.getUniformLocation(program, "uDiffuse"),
    uSpecular: gl.getUniformLocation(program, "uSpecular"),
    uShininess: gl.getUniformLocation(program, "uShininess"),
    uTransparency: gl.getUniformLocation(program, "uTransparency"),
    uLightPosition: gl.getUniformLocation(program, "uLightPosition"),
    uLightAmbient: gl.getUniformLocation(program, "uLightAmbient"),
    uSampler: gl.getUniformLocation(program, "uSampler")
  };
};
