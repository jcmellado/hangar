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
- "Efficient Polygon Triangulation" by John W. Ratcliff
  http://www.flipcode.com/archives/Efficient_Polygon_Triangulation.shtml
*/

AC.Triangulator = function(){
};

AC.Triangulator.triangulate = function(vertices){
  var result = [], indices = [], len = vertices.length,
      v = len - 1, count = 2 * len, i = 0, j,
      u, w, ccw;

  ccw = AC.Triangulator.ccw(vertices) > 0.0;
  for (; i < len; ++ i){
    indices.push(ccw? i: len - i - 1);
  }

  while(len > 2){
    if (count -- <= 0){
      return null;
    }

    u = v; if (u >= len){ u = 0; }
    v = u + 1; if (v >= len){ v = 0; }
    w = v + 1; if (w >= len){ w = 0; }

    if ( AC.Triangulator.snip(vertices, u, v, w, len, indices) ){
      result.push(indices[u], indices[v], indices[w]);

      for (j = v + 1; j < len; ++ j){
        indices[j - 1] = indices[j];
      }

      len --;
      count = 2 * len;
    }
  }

  return ccw? result: result.reverse();
};

AC.Triangulator.ccw = function(vertices){
  var a = 0.0, len = vertices.length, i = len - 1, j = 0;

  for (; j < len; i = j ++) {
    a += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }

  return a;
};

AC.Triangulator.snip = function(vertices, u, v, w, len, indices){
  var ax = vertices[ indices[u] ].x,
      ay = vertices[ indices[u] ].y,
      bx = vertices[ indices[v] ].x,
      by = vertices[ indices[v] ].y,
      cx = vertices[ indices[w] ].x,
      cy = vertices[ indices[w] ].y,
      i = 0, px, py, ca, cb, cc;

  if ( (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 1e-10){
    return false;
  }

  for (; i < len; ++ i){
    if ( (i !== u) && (i !== v) && (i !== w) ){
      px = vertices[ indices[i] ].x;
      py = vertices[ indices[i] ].y;

      ca = (cx - bx) * (py - by) - (cy - by) * (px - bx);
      cb = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      cc = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);

      if ( (ca >= 0.0) && (cb >= 0.0) && (cc >= 0.0) ){
        return false;
      }
    }
  }

  return true;
};
