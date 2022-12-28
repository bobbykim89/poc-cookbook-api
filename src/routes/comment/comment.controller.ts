import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto

const POST_TABLE = process.env.POST_TABLE as string
const COMMENT_TABLE = process.env.COMMENT_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

export class CommentController {
  public async getCommentByPostId(
    req: Request,
    res: Response
  ): Promise<void | Response> {}
  public async postNewComment(
    req: Request,
    res: Response
  ): Promise<void | Response> {}
  public async delecteCommentById(
    req: Request,
    res: Response
  ): Promise<void | Response> {}
}
