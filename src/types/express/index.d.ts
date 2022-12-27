import type { CognitoIdTokenPayload } from "aws-jwt-verify/jwt-model";

export {};

declare global {
  namespace Express {
    export interface Request {
      user: CognitoIdTokenPayload;
    }
  }
}
