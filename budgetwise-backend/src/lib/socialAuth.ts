import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Google 
export async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload()!;
  return {
    providerId: payload.sub,
    email:      payload.email!,
    firstName:  payload.given_name,
    lastName:   payload.family_name,
    avatarUrl:  payload.picture,
  };
}


// ── Facebook 
export async function verifyFacebookToken(accessToken: string) {
  const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;

  // Preveri token
  const inspectRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`
  );
  const { data } = await inspectRes.json() as { data: { is_valid: boolean; app_id: string } };
  if (!data.is_valid || data.app_id !== process.env.FACEBOOK_APP_ID) {
    throw new Error('Invalid Facebook token');
  }

  // Pridobi podatke
  const meRes = await fetch(
    `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}`
  );

  const me = await meRes.json() as { id: string; email?: string; first_name?: string; last_name?: string; picture?: { data?: { url?: string } } };
  return {
    providerId: me.id as string,
    email:      me.email as string | undefined,
    firstName:  me.first_name as string | undefined,
    lastName:   me.last_name as string | undefined,
    avatarUrl:  me.picture?.data?.url as string | undefined,
  };
}