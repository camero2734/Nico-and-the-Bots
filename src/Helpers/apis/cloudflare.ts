import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import secrets from "../../Configuration/secrets";
import { createHash } from "node:crypto";

const CloudflareR2 = new S3Client({
	region: "auto",
	endpoint: `https://${secrets.apis.cloudflare.ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: secrets.apis.cloudflare.ACCESS_KEY_ID,
		secretAccessKey: secrets.apis.cloudflare.SECRET_ACCESS_KEY,
	},
});

const BUCKET = "images";

export async function uploadImageToCloudflareStorage(
	fileName: string,
	buffer: Buffer,
	expiresInSeconds = 30,
) {
	// Check if the file already exists
	const existing = await CloudflareR2.send(
		new GetObjectCommand({ Bucket: BUCKET, Key: fileName }),
	).catch(() => null);

	// If the file exists and the new file is the same, don't reupload
	if (existing?.ETag?.includes(await calculateEtag(buffer))) {
		console.log(existing, /EXISTING/);
	} else {
		const result = await CloudflareR2.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: fileName,
				Body: buffer,
			}),
		);

		if (result.$metadata.httpStatusCode !== 200)
			throw new Error("Failed to upload image");

		console.log(result, /UPLOADED/);
	}

	const url = await getSignedUrl(
		CloudflareR2,
		new GetObjectCommand({ Bucket: BUCKET, Key: fileName }),
		{ expiresIn: expiresInSeconds },
	);

	return url;
}

// d86265a135fa7f19f3e5eaa5ca5b10a4
export async function calculateEtag(buffer: Buffer) {
	const hash = createHash("md5").update(buffer).digest("hex");
	return hash;
}
