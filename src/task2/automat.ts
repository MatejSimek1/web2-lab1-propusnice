import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Obtains an access token using the OAuth2 client_credentials flow
export async function getToken(authority: string, audience: string, clientId: string, clientSecret: string, scope: string): Promise<string> {
    const response = await fetch(new URL('/oauth/token', authority), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            audience,
            scope,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token request failed with status ${response.status} ${response.statusText}`);
    }

    const data = await response.json(); // mora await jer je asinkrona
    return data.access_token;
}


// Issues a new pass and saves the returned QR code as <id>.png in the current directory
export async function issuePass(url: string, token: string, name: string, document: string): Promise<void> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, document }),
    });

    if (response.status !== 201) {
        throw new Error(`Issue pass request failed with status ${response.status} ${response.statusText}`);
    }

    const location = response.headers.get('Location');
    if (!location) {
        throw new Error('Issue pass response is missing the Location header');
    }
    const id = new URL(location, url).pathname.split('/').pop();

    const image = Buffer.from(await response.arrayBuffer());
    await writeFile(`${id}.png`, image);
}