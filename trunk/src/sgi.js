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
- "The SGI Image File Format" by Paul Haeberli
  ftp://ftp.sgi.com/graphics/SGIIMAGESPEC
*/

var SGI = SGI || {};

SGI.Storage = {
  VERBATIM: 0,
  RLE: 1
};

SGI.File = function(data){
  var stream = new SGI.Stream(data);

  this.header = new SGI.Header(stream);
  this.img = new SGI.Image(this.header);

  this.parse(stream);
};

SGI.File.prototype.parse = function(stream){
  switch(this.header.storage){
    case SGI.Storage.VERBATIM:
      this.verbatim(stream);
      break;
    case SGI.Storage.RLE:
      this.rle(stream);
      break;
  }
  this.adjustChannels();
};

SGI.File.prototype.verbatim = function(stream){
  var img = this.img.data,
      channels = this.header.zsize,
      height = this.header.ysize,
      width = this.header.xsize,
      span = width * 8,
      channel = 0, src = 512, 
      row, col, dst;

  for (; channel < channels; ++ channel){
    dst = this.startChannel(channel);
    
    for (row = 0; row < height; ++ row, dst -= span){
      for (col = 0; col < width; ++ col, dst += 4){
        img[dst] = stream.peekByte(src ++);
      }
    }
  }
};

SGI.File.prototype.rle = function(stream){
  var img = this.img.data,
      channels = this.header.zsize,
      height = this.header.ysize,
      span = this.header.xsize * 4,
      channel = 0, starts = 512,
      row, src, dst;

  for (; channel < channels; ++ channel){
    dst = this.startChannel(channel);
  
    for (row = 0; row < height; ++ row, dst -= span, starts += 4){
      src = stream.peekLong(starts);
      
      this.rleRow(stream, src, img, dst);
    }
  }
};

SGI.File.prototype.rleRow = function(stream, src, img, dst){
  var value = stream.peekByte(src ++),
      count = value & 0x7f,
      i;

  while(0 !== count){
    
    if (value & 0x80){
      for (i = 0; i < count; ++ i, dst += 4){
        img[dst] = stream.peekByte(src ++);
      }
    }else{
      value = stream.peekByte(src ++);
      for (i = 0; i < count; ++ i, dst += 4){
        img[dst] = value;
      }
    }
    
    value = stream.peekByte(src ++);
    count = value & 0x7f;
  }
};

SGI.File.prototype.adjustChannels = function(){
  var img = this.img.data,
      size = img.length,
      channels = this.header.zsize,
      dst = 0;

  if (4 !== channels){
    for (; dst < size; dst += 4){
      switch(channels){
        case 1:
          img[dst + 1] = img[dst + 2] = img[dst];
          img[dst + 3] = 255;
          break;
        case 2:
          img[dst + 1] = img[dst + 2] = img[dst];
          break;
        case 3:
          img[dst + 3] = 255;
          break;
      }
    }
  }
};

SGI.File.prototype.startChannel = function(channel){
  var address = ( (this.header.ysize - 1) * this.header.xsize * 4);

  if ( (2 === this.header.zsize) && (1 === channel) ){
    address += 2;
  }
  
  return address + channel;
};

SGI.Header = function(stream){
  this.storage = stream.peekByte(2);
  this.xsize = stream.peekShort(6);
  this.ysize = stream.peekShort(8);
  this.zsize = stream.peekShort(10);
};

SGI.Image = function(header){
  this.width = header.xsize;
  this.height = header.ysize;
  this.data = new Uint8Array(header.xsize * header.ysize * 4);
};

SGI.Stream = function(data){
  this.buffer = new Uint8Array(data);
};

SGI.Stream.prototype.peekByte = function(offset){
  return this.buffer[offset];
};

SGI.Stream.prototype.peekShort = function(offset){
  return (this.peekByte(offset) << 8) | this.peekByte(offset + 1);
};

SGI.Stream.prototype.peekLong = function(offset){
  return (this.peekByte(offset) << 24) | (this.peekByte(offset + 1) << 16) |
         (this.peekByte(offset + 2) << 8) | this.peekByte(offset + 3);
};
