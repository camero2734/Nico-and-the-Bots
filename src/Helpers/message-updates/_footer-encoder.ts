import crypto from "crypto";

const keyStr = "thisdoesntreallymatteritsnotreallythatsecret";
const key = crypto
    .createHash("sha256")
    .update(Buffer.from(keyStr, "utf-8").toString("hex"))
    .digest("hex")
    .substr(0, 32);
const iv = Buffer.alloc(16, 0);

export class FooterEncoder<T extends Record<keyof T, string | number>> {
    JOIN_STR = "|+|";
    constructor(private exampleData: T) {}
    encode(data: T): string {
        const orderedEntries = Object.entries(data).sort((ent1, ent2) => ent1[0].localeCompare(ent2[0]));
        const values = orderedEntries.map((ent) => ent[1]);
        const text = values.join(this.JOIN_STR);

        const cipher = crypto.createCipheriv("aes-256-ctr", key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.toString("base64");
    }
    decode(text: string): T {
        const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);
        const decryptedBuf = decipher.update(Buffer.from(text, "base64"));
        const decrypted = Buffer.concat([decryptedBuf, decipher.final()]).toString("utf-8");

        const orderedKeys = Object.keys(this.exampleData).sort((key1, key2) => key1.localeCompare(key2));
        const orderedEntries = decrypted
            .split(this.JOIN_STR)
            .map((v, i) => [orderedKeys[i], isNaN(Number(v)) ? v : +v]) as [string, string][];
        return Object.fromEntries(orderedEntries) as T;
    }
}
