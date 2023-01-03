import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { CreatePostReq, PatchPostReq } from './dto'

// import middleware
import { Cloudinary } from '@/middleware'

const POST_TABLE = process.env.POST_TABLE as string
const COMMENT_TABLE = process.env.COMMENT_TABLE as string
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
  public async getPostByCategory(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: POST_TABLE,
          FilterExpression: 'category = :r',
          ExpressionAttributeValues: { ':r': req.params.categoryId },
        })
        .promise()
      if (!Items) {
        return res.status(404).json({
          error: 'Could not find post related to given category id',
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
    const { title, ingredients, recipe, category } = req.body
    const { email } = req.user
    const uid = `Post-${uuid()}`
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
        category,
        imageId: public_id,
        thumbUrl: secure_url.replace('/upload', '/upload/c_scale,w_400/f_auto'),
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
  ): Promise<void | Response> {
    const { title, ingredients, recipe, category } = req.body
    const { email } = req.user
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: POST_TABLE,
          Key: {
            postId: req.params.postId,
          },
        })
        .promise()
      // invalidate if post doesn't exist
      if (!Item) {
        return res
          .status(404)
          .json({ message: 'Could not find post with post id provided' })
      }
      // invalidate if user is not the author of post
      if (Item.author !== `User-${email}`) {
        return res.status(403).json({
          message: 'Unauthorized',
        })
      }
      let dataObject: PatchPostReq
      if (req.file) {
        await Cloudinary.uploader.destroy(Item.imageId)
        const { public_id, secure_url } = await Cloudinary.uploader.upload(
          req.file.path,
          {
            folder: 'poc-cookbook-api/post',
          }
        )
        dataObject = {
          title,
          imageId: public_id,
          thumbUrl: secure_url.replace(
            '/upload',
            '/upload/c_scale,w_400/f_auto'
          ),
          imageUrl: secure_url.replace(
            '/upload',
            '/upload/c_scale,w_1200/q_auto'
          ),
          ingredients,
          recipe,
          category,
          updatedAt: Date.now(),
        }
      } else {
        dataObject = {
          title,
          ingredients,
          recipe,
          category,
          updatedAt: Date.now(),
        }
      }
      const itemKeys = Object.keys(dataObject).filter((key) => {
        return (
          dataObject[key as keyof PatchPostReq] !== null &&
          dataObject[key as keyof PatchPostReq] !== undefined &&
          dataObject[key as keyof PatchPostReq] !== ''
        )
      })
      const params = {
        TableName: POST_TABLE,
        Key: {
          postId: req.params.postId,
        },
        UpdateExpression: `SET ${itemKeys
          .map((_, index) => `#field${index} = :value${index}`)
          .join(', ')}`,
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
            [`:value${index}`]: dataObject[key as keyof PatchPostReq],
          }),
          {}
        ),
        ReturnValues: 'ALL_NEW',
      }
      await dynamoDbClient.update(params).promise()
      const { Item: patchResult } = await dynamoDbClient
        .get({
          TableName: POST_TABLE,
          Key: {
            postId: req.params.postId,
          },
        })
        .promise()
      return res.status(200).json(patchResult)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not update post', error: err })
    }
  }
  public async deletePostById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { email } = req.user
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: POST_TABLE,
          Key: {
            postId: req.params.postId,
          },
        })
        .promise()
      // invalidate if post doesn't exist
      if (!Item) {
        return res
          .status(404)
          .json({ message: 'Could not find post with post id provided' })
      }
      // invalidate if user is not the author of post
      if (Item.author !== `User-${email}`) {
        return res.status(403).json({
          message: 'Unauthorized',
        })
      }
      // delete all comments related to the post
      const { Items } = await dynamoDbClient
        .scan({
          TableName: COMMENT_TABLE,
          FilterExpression: 'post = :r',
          ExpressionAttributeValues: { ':r': req.params.postId },
        })
        .promise()
      if (Items && Items.length > 0) {
        Items.forEach(async (item) => {
          await dynamoDbClient
            .delete({
              TableName: COMMENT_TABLE,
              Key: {
                commentId: item.commentId,
              },
            })
            .promise()
        })
      }
      // delete image from cloudinary
      await Cloudinary.uploader.destroy(Item.imageId)
      // delete post
      await dynamoDbClient
        .delete({
          TableName: POST_TABLE,
          Key: {
            postId: req.params.postId,
          },
        })
        .promise()
      return res.status(200).json({ message: 'Successfully deleted the post' })
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not delete post', error: err })
    }
  }
}
