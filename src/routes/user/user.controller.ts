import AWS from "aws-sdk";
import { Request, Response } from "express";
import { validationResult } from "express-validator";

// import dto
import { PostUserReq, PatchUserReq } from "./dto";
// import middleware
import { Cloudinary } from "@/middleware";

const USER_TABLE = process.env.USER_TABLE as string;
const USER_POOL_ID = process.env.USER_POOL_ID as string;
const CLIENT_ID = process.env.CLIENT_ID as string;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

export class UserController {
  public async getAllUser(_: Request, res: Response): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: USER_TABLE,
        })
        .promise();
      if (!Items) {
        return res.status(404).json({ message: "Could not find user table" });
      }
      return res.status(200).json(Items);
    } catch (err) {
      return res.status(500).json({
        message: "Could not retrieve table",
        error: err,
      });
    }
  }
  public async getUserById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: USER_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise();
      if (!Item) {
        return res
          .status(404)
          .json({ message: "Could not find user with provided user id" });
      }
      return res.status(200).json(Item);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not retreive user", error: err });
    }
  }
  public async getCurrentUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { email } = req.user;
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: USER_TABLE,
          Key: {
            userId: `User-${email}`,
          },
        })
        .promise();
      if (!Item) {
        return res.status(400).json({
          error: "Could not find user with provided email address",
        });
      }
      return res.status(200).json(Item);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Cannot get current user", message: err });
    }
  }
  public async createNewUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }
    const { userName, email, password } = req.body;
    try {
      const { User } = await cognito
        .adminCreateUser({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            {
              Name: "email",
              Value: email,
            },
            {
              Name: "email_verified",
              Value: "true",
            },
          ],
          MessageAction: "SUPPRESS",
        })
        .promise();
      if (User) {
        await cognito
          .adminSetUserPassword({
            Password: password,
            UserPoolId: USER_POOL_ID,
            Username: email,
            Permanent: true,
          })
          .promise();
      }
      const dataObject: PostUserReq = {
        userId: `User-${email}`,
        userName,
        createdAt: Date.now(),
      };
      await dynamoDbClient
        .put({
          TableName: USER_TABLE,
          Item: dataObject,
        })
        .promise();
      const user = await cognito
        .adminInitiateAuth({
          AuthFlow: "ADMIN_NO_SRP_AUTH",
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        })
        .promise();
      return res.status(200).json({
        message: "Successfully created new user",
        access_token: `Bearer ${user.AuthenticationResult?.IdToken}`,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not create user", error: err });
    }
  }
  public async patchUserById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { userName, description } = req.body;
    const { email } = req.user;
    try {
      // check if profile exists
      const { Item } = await dynamoDbClient
        .get({
          TableName: USER_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise();
      // invalidate if user profile doesn't exist
      if (!Item) {
        return res
          .status(404)
          .json({ message: "Could not find user with provided user id" });
      }
      // invalidate if user is not the owner of profile
      if (Item.userId !== `User-${email}`) {
        return res.status(403).json({
          message: "Unauthorized",
        });
      }
      let dataObject: PatchUserReq;
      if (req.file) {
        if (Item.imageId) {
          await Cloudinary.uploader.destroy(Item.imageId);
        }
        const { public_id, secure_url } = await Cloudinary.uploader.upload(
          req.file.path,
          { folder: "poc-cookbook-api/profile" }
        );
        dataObject = {
          userName,
          description,
          imageId: public_id,
          thumbUrl: secure_url.replace(
            "/upload",
            "/upload/c_scale,w_250/f_auto"
          ),
          imageUrl: secure_url.replace(
            "/upload",
            "/upload/c_scale,w_1200/q_auto"
          ),
          updatedAt: Date.now(),
        };
      } else {
        dataObject = {
          userName,
          description,
          updatedAt: Date.now(),
        };
      }
      const itemKeys = Object.keys(dataObject);
      const params = {
        TableName: USER_TABLE,
        Key: {
          userId: req.params.userId,
        },
        UpdateExpression: `SET ${itemKeys
          .map((_, index) => `#field${index} = :value${index}`)
          .join(", ")}`,
        ExpressionAttributeNames: itemKeys.reduce(
          (accumulator, key, index) => ({
            ...accumulator,
            [`#field${index}`]: key,
          }),
          {}
        ),
        ExpressionAttributeValues: itemKeys.reduce(
          (accumulator, key: string, index: number) => ({
            ...accumulator,
            [`:value${index}`]: dataObject[key as keyof PatchUserReq],
          }),
          {}
        ),
        ReturnValues: "ALL_NEW",
      };
      await dynamoDbClient.update(params).promise();
      const { Item: patchResult } = await dynamoDbClient
        .get({
          TableName: USER_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise();
      return res.status(200).json(patchResult);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not update user", error: err });
    }
  }
}
