import { CopperxBot } from "./bot/bot";
import { EnvConfig } from "./config/env";
import express, { Request, Response } from "express";
const app = express();
EnvConfig.load();
const port = Number(EnvConfig.appPort) || 4000;

const bot = new CopperxBot();
bot.launch();
bot.setupShutdown();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
