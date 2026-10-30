import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getTotalCount, getActiveCount } from './passes.ts';
dotenv.config();

const app = express();
app.set("views", path.join(import.meta.dirname, "views"));
app.set('view engine', 'pug');

// port: na Renderu dolazi iz process.env.PORT, lokalno fallback (npr. 4080)
const port = Number(process.env.PORT) || 4080;

app.get('/', async function (req, res) {
  const [total, active] = await Promise.all([getTotalCount(), getActiveCount()]); // Promise.all pokreće oba upita paralelno
  res.render('index', {total, active});
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});