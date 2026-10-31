import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getTotalCount, getActiveCount, getAllPasses, cancelPass, deletePass, isUuid, getPassById, createPass } from './passes.ts';
import oidc from 'express-openid-connect';
const { auth, requiresAuth } = oidc;
import { auth as jwtAuth, requiredScopes } from 'express-oauth2-jwt-bearer';
import QRCode from 'qrcode';
dotenv.config();

const app = express();
app.set("views", path.join(import.meta.dirname, "views"));
app.set('view engine', 'pug');

// port: na Renderu dolazi iz process.env.PORT, lokalno fallback (npr. 4080)
const port = Number(process.env.PORT) || 4080;

// config za Auth0 OIDC (OpenID Connect)
const config = {
  authRequired: false,
  idpLogout: true, // odjava i iz aplikacije i s Auth0
  secret: process.env.SESSION_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientSecret: process.env.CLIENT_SECRET,
  routes: {
    logout: false as const // GET /logout je isključen, koristimo POST (vidi niže)
  },
  authorizationParams: {
    response_type: 'code',
  },
};
// auth router attaches /login and /callback routes to the baseURL (/logout is disabled in routes)
app.use(auth(config));

// odjava mijenja stanje (briše sesiju), pa ide POST (zaštita od logout CSRF-a - Cross site request forgery)
app.post('/logout', (req, res) => res.oidc.logout());

const checkJwt = jwtAuth({
  audience: process.env.API_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});


app.get('/', async function (req, res) {
  const [total, active] = await Promise.all([getTotalCount(), getActiveCount()]); // Promise.all pokreće oba upita paralelno
  let username: string | undefined;
  if (req.oidc.isAuthenticated()){
    username = req.oidc.user?.name ?? req.oidc.user?.sub; // "a ?? b" -> "uzmi a, a ako je a null ili undefined, uzmi b"
  }
  res.render('index', {total, active, username});
});


app.get('/private', requiresAuth(), async function (req, res) {
  const username = req.oidc.user?.name ?? req.oidc.user?.sub;
  const passes = await getAllPasses();
  res.render('private', { username, passes });
});

app.post<{id:string}>('/private/:id/cancel', requiresAuth(), async function (req, res) {
  const id = req.params.id;
  if (!isUuid(id) || !(await cancelPass(id))) {
    res.sendStatus(404);
    return;
  }
  res.redirect('/private');
});

app.post<{id:string}>('/private/:id/delete', requiresAuth(), async function (req, res) {
  const id = req.params.id;
  if (!isUuid(id) || !(await deletePass(id))) {
    res.sendStatus(404);
    return;
  }
  res.redirect('/private');
});

app.get<{id:string}>('/info/:id', async function (req, res) {
  const id = req.params.id;
  const pass = isUuid(id) ? await getPassById(id) : undefined;
  if (!pass) {
    res.status(404).render('info-not-found');
    return;
  }
  res.render('info', { pass });
});

// Provjere:
// checkJwt - je li token valjan (ili ga nema/istekao je)
// requiredScopes - provjera ima li traženi scope -> tu dođe ako je valjan i tek onda provjerava scope (inače padne već na checkJwt)
app.get<{id:string}>('/passes/:id', checkJwt, requiredScopes('read:passes'), async function (req, res) {
  const id = req.params.id;
  const pass = isUuid(id) ? await getPassById(id) : undefined;
  if (!pass) {
    res.sendStatus(404);
    return;
  }
  res.json({
    id: pass.id,
    name: pass.name,
    document: pass.document,
    issuedAt: pass.issued_at.toISOString(),
    status: pass.status,
  });
});

// express.json() - middleware koji čita body HTTP zahtjeva i pretvara/parsira ga u JavaScript objekt.
// body se preko mreže prenosi kao običan String pa mu nebih mogao pristupati sa req.body (dobivao bi uvijek 400)
// express.json() - na ruti (ne globalno) i dolazi nakon autentifikacije. Tako neovlašteni zahtjev nikad ne stigne do parsiranja tijela
app.post('/passes', checkJwt, requiredScopes('create:passes'), express.json(), async function (req, res) {
  const name = req.body?.name;
  const document = req.body?.document;
  if (typeof name !== 'string' || typeof document !== 'string' || !name.trim() || !document.trim()) {
    res.status(400).json({ error: "Both 'name' and 'document' are required and must be non-empty strings." });
    return;
  }

  const pass = await createPass(name.trim(), document.trim());

  const baseUrl = process.env.BASE_URL;
  const qr = await QRCode.toBuffer(`${baseUrl}/info/${pass.id}`, { type: 'png' });

  res.status(201)
    .location(`${baseUrl}/passes/${pass.id}`)
    .type('png')
    .send(qr);
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});