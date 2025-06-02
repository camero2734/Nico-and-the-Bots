interface Radix64 {
  encodeBuffer(buffer: Buffer): string;
  decodeToBuffer(radix64: string): Buffer;
}

declare module "radix-64" {
  function setup(): Radix64;
  export = setup;
}

declare module "video-url-link" {
  function getInfo(
    url: string,
    options: Record<string, unknown>,
    callback: (err: Error, info: { variants: MediaVideoInfoV1["variants"] }) => void,
  ): void;

  export = { twitter: { getInfo } };
}
