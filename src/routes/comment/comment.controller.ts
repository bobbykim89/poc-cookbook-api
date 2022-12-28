import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { PostCommentReq } from './dto'

const COMMENT_TABLE = process.env.COMMENT_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

export class CommentController {
  public async getCommentByPostId(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: COMMENT_TABLE,
          FilterExpression: 'postId = :r',
          ExpressionAttributeValues: { ':r': req.params.postId },
        })
        .promise()
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive comments by post id', error: err })
    }
  }
  public async postNewComment(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { text, postId } = req.body
    const { email } = req.user
    const uid = `Comment-${uuid()}`
    try {
      const dataObject: PostCommentReq = {
        commentId: uid,
        author: `User-${email}`,
        postId,
        text,
        createdAt: Date.now(),
      }
      await dynamoDbClient
        .put({
          TableName: COMMENT_TABLE,
          Item: dataObject,
        })
        .promise()
      const { Item } = await dynamoDbClient
        .get({
          TableName: COMMENT_TABLE,
          Key: {
            commentId: dataObject.commentId,
          },
        })
        .promise()
      return res.status(200).json(Item)
    } catch (err) {
      return res.status(500).json({
        message: 'Could not create comment',
        error: err,
      })
    }
  }
  public async delecteCommentById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { email } = req.user
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: COMMENT_TABLE,
          Key: {
            commentId: req.params.commentId,
          },
        })
        .promise()
      // invalidate if comment doesn't exist
      if (!Item) {
        return res
          .status(404)
          .json({ message: 'Could not find comment with commentId provided' })
      }
      // invalidate if user is not the author of comment
      if (Item.author !== `User-${email}`) {
        return res.status(403).json({
          message: 'Unauthorized',
        })
      }
      await dynamoDbClient
        .delete({
          TableName: COMMENT_TABLE,
          Key: {
            postId: req.params.commentId,
          },
        })
        .promise()
      return res
        .status(200)
        .json({ message: 'Successfully deleted the comment' })
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not delete comment', error: err })
    }
  }
}
