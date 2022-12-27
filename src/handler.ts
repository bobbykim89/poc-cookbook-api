import serverlessHttp from "serverless-http";
import { app } from "./main";

export const handler = serverlessHttp(app);
