interface Radix64 {
    encodeBuffer(buffer: Buffer): string;
    decodeToBuffer(radix64: string): Buffer;
}

declare module "radix-64" {
    function setup(): Radix64;
    export = setup;
}
