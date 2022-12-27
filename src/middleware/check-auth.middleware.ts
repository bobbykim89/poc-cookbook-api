import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const USER_POOL_ID = process.env.USER_POOL_ID as string;
const CLIENT_ID = process.env.CLIENT_ID as string;

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: "id",
  clientId: CLIENT_ID,
});

const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const bearerToken = req.header("Authorization") || "";
  const token = bearerToken.replace("Bearer ", "");

  try {
    const payload = await verifier.verify(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid", error: err });
  }
};

export { checkAuth as Auth };
