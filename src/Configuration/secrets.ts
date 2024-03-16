import env from "env-var";
import 'dotenv/config'

const secrets = {
    bots: {
        nico: env.get("BOT_SECRET_NICO").required().asString(),
        keons: env.get("BOT_SECRET_KEONS").required().asString(),
        lisden: env.get("BOT_SECRET_LISDEN").required().asString(),
        sacarver: env.get("BOT_SECRET_SACARVER").required().asString()
    },
    apis: {
        lastfm: env.get("LAST_FM_API_KEY").required().asString(),
        instagram: {
            username: env.get("INSTAGRAM_USERNAME").required().asString(),
            password: env.get("INSTAGRAM_PASSWORD").required().asString()
        },
        twitter: {
            ct0: env.get("TWITTER_CT0").required().asString(),
            auth_token: env.get("TWITTER_AUTH_TOKEN").required().asString(),
        },
        genius: {
            client_id: env.get("GENIUS_CLIENT_ID").required().asString(),
            client_secret: env.get("GENIUS_CLIENT_SECRET").required().asString(),
            access_token: env.get("GENIUS_ACCESS_TOKEN").required().asString()
        },
        spotify: {
            client_id: env.get("SPOTIFY_CLIENT_ID").required().asString(),
            client_secret: env.get("SPOTIFY_CLIENT_SECRET").required().asString()
        },
        google: {
            youtube: env.get("YOUTUBE_API_KEY").required().asString(),
            sheets: {
                client_email: env.get("GOOGLE_SHEETS_ACCOUNT").required().asString(),
                private_key: env.get("GOOGLE_SHEETS_PRIVATE_KEY").required().asString().replace(/\\n/gm, '\n')
            }
        },
        tiktok: {
            sid_tt: env.get("TIKTOK_SESSION_LIST").required().asString()
        },
        minio: {
            accessKey: env.get("MINIO_KEY").asString(),
            secretKey: env.get("MINIO_SECRET").asString()
        }
    },
    randomSeedPrefix: env.get("RANDOM_SEED_PREFIX").required().asString(),
    webhookUrl: env.get("WEBHOOK_URL").required().asString(),
};

export default secrets;
