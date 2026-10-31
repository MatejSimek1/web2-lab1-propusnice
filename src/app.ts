import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getTotalCount, getActiveCount, getAllPasses, cancelPass, deletePass, isUuid, getPassById } from './passes.ts';
import oidc from 'express-openid-connect';
const { auth, requiresAuth } = oidc;
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
  secret: process.env.SECRET,
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


app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});