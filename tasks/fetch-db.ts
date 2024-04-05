// import * as Minio from 'minio';
// import secrets from "../src/Configuration/secrets";
// import fs, { promises as fsp } from "fs";
// import util from 'util';
// import { exec as _exec } from "child_process";
// import _glob from "glob";
// const glob = util.promisify(_glob);
// import streamUtil from "stream";

// const BUCKET_NAME = "db-backups";
// const accessKey = secrets.apis.minio.accessKey;
// const secretKey = secrets.apis.minio.secretKey;


// if (!accessKey || !secretKey) {
//     throw new Error("Must provide Minio keys")
// }
// const minioClient = new Minio.Client({
//     endPoint: 'minio.demacouncil.top',
//     useSSL: true,
//     accessKey: accessKey,
//     secretKey: secretKey
// });

// async function getLatestBackup(): Promise<Minio.BucketItem> {
//     return new Promise(resolve => {
//         const objects = minioClient.listObjectsV2(BUCKET_NAME);

//         const listener = objects.on("data", (item) => {
//             resolve(item);
//             listener.destroy();
//         });
//     })
// }

// async function downloadBackup(item: Minio.BucketItem, fileName: string): Promise<void> {
//     const stream = await minioClient.getObject(BUCKET_NAME, item.name!);
//     let totalBytes = 0;
//     let i = 0;

//     console.log("Downloading...");

//     streamUtil.pipeline(
//         stream,
//         new streamUtil.Transform({
//             transform(chunk, _encoding, callback) {
//                 totalBytes += chunk.length;
//                 i = (i + 1) % 100;
//                 if (i === 0) {
//                     process.stdout.clearLine(0);
//                     process.stdout.cursorTo(0);
//                     process.stdout.write(`${(100 * (totalBytes / item.size)).toFixed(2)}%`);
//                 }

//                 this.push(chunk);
//                 callback();
//             },
//         }),
//         fs.createWriteStream(fileName),
//         err => {
//             if (err) console.log(err, /ERR/);
//         }
//     )

//     return new Promise(resolve => {
//         stream.on("end", () => resolve());
//     });
// }

// async function ensureBackupsExpire() {
//     minioClient.setBucketLifecycle(BUCKET_NAME, {
//         Rule: [{
//             "ID": "Expiration Rule",
//             "Status": "Enabled",
//             "Filter": {
//                 "Prefix": "",
//             },
//             "Expiration": {
//                 "Days": "7"
//             }
//         }]
//     })
// }

// async function main() {
//     ensureBackupsExpire();

//     const latestBackup = await getLatestBackup();
//     const fileName = `${latestBackup.name}.backup.tgz`;

//     try {
//         await fsp.access(fileName);
//         console.log("Latest backup already downloaded");
//     } catch (e) {
//         // Delete any old backups
//         const files = await glob("*.backup.tgz");

//         for (const file of files) {
//             await fsp.unlink(file);
//         }

//         await downloadBackup(latestBackup, fileName);
//     }
// }

// main();
