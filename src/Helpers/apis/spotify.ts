import SpotifyAPI from "spotify-web-api-node";
import secrets from "../../Configuration/secrets";

export const SpotifyClient = new SpotifyAPI({
  clientId: secrets.apis.spotify.client_id,
  clientSecret: secrets.apis.spotify.client_secret,
});

(async () => {
  try {
    const res = await SpotifyClient.clientCredentialsGrant();
    SpotifyClient.setAccessToken(res.body.access_token);
  } catch (err) {
    console.error("SpotifyClientError: ", err);
  }
})();
