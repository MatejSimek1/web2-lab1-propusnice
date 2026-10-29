import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.set("views", path.join(import.meta.dirname, "views"));
app.set('view engine', 'pug');

// port: na Renderu dolazi iz process.env.PORT, lokalno fallback (npr. 4080)
const port = Number(process.env.PORT) || 4080;

app.get('/', function (req, res) {
  res.render('index');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});