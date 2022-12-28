import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { CreatePostReq } from './dto'

// import middleware
import { Cloudinary } from '@/middleware'

const POST_TABLE = process.env.POST_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

export class PostController {
  public async getAllPost(_: Request, res: Response): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: POST_TABLE,
        })
        .promise()
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retrieve items from table', error: err })
    }
  }
  public async getPostById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: POST_TABLE,
          Key: {
            postId: req.params.postId,
          },
        })
        .promise()
      if (!Item) {
        return res
          .status(404)
          .json({ error: 'Could not find post with provided post id' })
      }
      return res.status(200).json(Item)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive post', error: err })
    }
  }
  public async getPostByUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: POST_TABLE,
          FilterExpression: 'author = :r',
          ExpressionAttributeValues: { ':r': req.params.userId },
        })
        .promise()
      if (!Items) {
        return res
          .status(404)
          .json({ error: 'Could not find post with provided user id' })
      }
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive product by "userId"', error: err })
    }
  }
  public async getPostByCurrentUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { email } = req.user
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: POST_TABLE,
          FilterExpression: 'author = :r',
          ExpressionAttributeValues: { ':r': `User-${email}` },
        })
        .promise()
      if (!Items) {
        return res.status(404).json({
          error: 'Could not find post related to current user info',
        })
      }
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Cannot retrieve post', message: err })
    }
  }
  public async createNewPost(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { title, ingredients, recipe, categoryId } = req.body
    const { email } = req.user
    const uid = `Prod-${uuid()}`
    try {
      if (!req.file) {
        return res.status(404).json({ message: 'File not found' })
      }
      const { public_id, secure_url } = await Cloudinary.uploader.upload(
        req.file.path,
        { folder: 'poc-cookbook-api/post' }
      )
      const dataObject: CreatePostReq = {
        title,
        postId: uid,
        author: `User-${email}`,
        category: categoryId,
        imageId: public_id,
        thumbUrl: secure_url.replace('/upload', '/upload/c_scale,w_250/f_auto'),
        imageUrl: secure_url.replace(
          '/upload',
          '/upload/c_scale,w_1200/q_auto'
        ),
        ingredients,
        recipe,
        createdAt: Date.now(),
      }
      await dynamoDbClient
        .put({
          TableName: POST_TABLE,
          Item: dataObject,
        })
        .promise()
      const { Item } = await dynamoDbClient
        .get({
          TableName: POST_TABLE,
          Key: {
            postId: dataObject.postId,
          },
        })
        .promise()
      return res.status(200).json(Item)
    } catch (err) {
      return res.status(500).json({
        message: 'Could not create post',
        error: err,
      })
    }
  }
  public async patchPostById(
    req: Request,
    res: Response
  ): Promise<void | Response> {}
  public async deletePostById(
    req: Request,
    res: Response
  ): Promise<void | Response> {}
}
