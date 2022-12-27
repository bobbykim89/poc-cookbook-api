import type { CognitoIdTokenPayload } from "aws-jwt-verify/jwt-model";

interface CognitoTokenAdditionalField {
  email: string;
}

export type UserType = CognitoIdTokenPayload & CognitoTokenAdditionalField;
