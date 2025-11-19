import "dotenv/config";
import pino from "pino";

import { createApp } from "./app";

const app = createApp();
const log = pino();

const port = process.env.PORT || 4000;
app.listen(port, () => log.info(`API server started on :${port}`));