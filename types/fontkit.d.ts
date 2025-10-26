declare module 'fontkit' {
  export interface Font {
    stream: NodeJS.ReadableStream;
    getVariation?(coords: Record<string, number>): Font;
  }

  export function openSync(source: string | Buffer): Font;
}
