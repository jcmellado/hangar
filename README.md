**Hangar** is an HTML5 JavaScript library that can be used to render 3D models in AC3D format (.ac) using WebGL.

The [AC3D file format](http://www.inivis.com/ac3d/man/ac3dfileformat.html) (.ac) is a text file format used to store 3D models by many projects, like [FlightGear](http://www.flightgear.org/), an open-source flight simulation, or [Torcs](http://torcs.sourceforge.net/), an open-source car racing simulator.

Hangar supports the [SGI image file format](ftp://ftp.sgi.com/graphics/SGIIMAGESPEC) (.sgi, .rgba, .rgb, .ra, .bw) used for some old models to store textures.

### Demo ###
[Flight Gallery](http://inmensia.com/files/hangar/flight-gallery/index.html) is a basic 3D FlightGear model viewer showing library capacities.

Use mouse button and wheel to have some fun!

### Video ###

[![Flight Gallery](http://img.youtube.com/vi/CEUETrP_SHY/0.jpg)](http://www.youtube.com/watch?v=CEUETrP_SHY)

### Viewer ###
To render an .ac file onto a canvas you just must to create an `HG.Viewer` object and call the `show` function with the name (url) of the .ac file:

```
var viewer = new HG.Viewer(canvas);

viewer.show(filename);
```

File is loaded, parsed and rendered using WebGL, with textures if any, and auto fitted to the canvas size. A default trackball controller is provided, so you can rotate and zoom the rendereed model using the mouse.

You can also use the library to parse individuals files for your own proposals (see bellow).

Some optional parameters can be specified in the call to the viewer:

 * `callback`: A callback function to be called when the model is fully loaded.
 * `texturePath`: Texture path (a trailing path separator is mandatory). By default the textures are loaded from the model directory.
 * `setup`: Camera parameters (disable autofit):
    * `eye`: A 3D vector with the camera position.
    * `poi`: A 3D vector with the point of interest.
    * `up`: A 3D vector with the up direction.
    * `fov`: A decimal number with the field of view angle.

Examples:

```
var viewer = new HG.Viewer(canvas);

viewer.show(filename, {callback: onModelLoaded, texturePath: "path/to/textures/"});
```

```
var viewer = new HG.Viewer(canvas);

viewer.show(filename, {setup: {eye: [-35.33, 11.98, -23.03], 
                               poi: [2.04, 3.48, 0.00], 
                               up: [-0.28, 0.84, 0.45], 
                               fov: 45} });
```

### Render ###
Polygon surfaces are tessellated to equivalent triangulated surfaces. Both convex and concave surfaces are allowed.

Degenerated polygons are discarted. That is, polygons with less than three vertices, polygons with collinear coordinates, polygons with vertices not contained in an only one plane, polygons crossing edges, and so on.

Normal vectors are calculated per surface. Smoothed normal vectors are calculated per vertex.

Illumination model is based on the Phong one. Ligths on .ac files are ignored, render always perfomed using one static directional light without attenuation factors.

### AC3D ###
To parse a loaded .ac file you just must to create an `AC.File` object:

```
var file = new AC.File(data);
```

`data` argument must be a JavaScript `String` with the content of a valid .ac file.

`AC.File` objects have the following properties:

 * `materials`: Collection of `AC.Material` objects.
 * `objects`: Collection of `AC.Object` objects.

`AC.Material` objects have the following properties:

 * `name`: Name.
 * `diffuse`: RGB value as a three dimensional vector.
 * `ambient`: Ambient color as a three dimensional vector.
 * `emissive`: Emissive color as a three dimensional vector.
 * `shininess`: Shininnes value.
 * `transparency`: Transparency value.

`AC.Object` objects have the following properties:

 * `name`: Name.
 * `data`: Extra data information.
 * `texture`: Texture file name.
 * `textureRepeat`: Texture repeat parameters as a two dimensional vector.
 * `textureOffset`: Texture offset parameters as a two dimensional vector.
 * `rotation`: Rotation matrix as a nine dimensional vector.
 * `translation`: Translation vector as a three dimensional vector.
 * `crease`: Crease angle.
 * `url`: Url.
 * `vertices`: Collection of vertices as a plain array of three dimensional vectors.
 * `surfaces`: Collection of `AC.Surface` objects.
 * `children`: Collection of `AC.Object`.

`AC.Surface` objects have the following properties:

 * `type`: Type as an enumerated `AC.SurfaceType` (`POLYGON`, `LINE_LOOP`, `LINE_STRIP`).
 * `isShaded`: Flag.
 * `isTwoSided`: Flag.
 * `materialId`: Material identificator as an index on the global material collection.
 * `indices`: Collection of indices as a plain array.
 * `uvs`: Collection of texture coordinates as a plain array of two dimensional vectors.
 * `normal`: Normal vector as a three dimensional vector.
 * `normals`: Collection of smoothed normal vectors per vertex as a plain array of three dimensional vectors.

### SGI ###

To parse a loaded .rgb (.sgi, .rgba, .rb, .bw) file you just must to create one `SGI.File` object:

```
var file = new SGI.File(data);
```

`data` argument must be a JavaScript `ArrayBuffer` with the content of a valid .rgb file.

`SGI.File` objects have the following properties:

 * `header`: File Header as a `SGI.Header` object.
 * `img`: Image data as a `SGI.Image` object.

`SGI.Header` objects have the following properties:

 * `storage`: Storage format as an enumerated `SGI.Storage` (`VERBATIM`, `RLE`).
 * `xsize`: Image width.
 * `ysize`: Image height.
 * `zsize`: Number of image channels.

Original header attributes `magic`, `bpc`, `dimension`, `pixmin`, `pixman`, `imagename` and `colormap` are ignored. Always taken 8 bits per channel.

`SGI.Image` objects have the following properties:

 * `width`: Image width.
 * `height`: Image height.
 * `data`: Uncompressed image data as a plain `Uint8Array` with four channels (RGBA).

Original vertical image orientation is flip backed and always four channel are returned.

### Dependencies ###

[gl-matrix](https://github.com/toji/gl-matrix") is used to operate with vectors, matrices and quaternions.