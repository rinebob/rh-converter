declare module 'bmp-js' {
  export interface BMPData {
    data: Buffer;
    width: number;
    height: number;
  }

  export interface DecodedBMP {
    data: Buffer;
    width: number;
    height: number;
  }

  export function encode(imageData: {
    data: Buffer;
    width: number;
    height: number;
  }): BMPData;

  export function decode(bmpData: Buffer): DecodedBMP;
}
