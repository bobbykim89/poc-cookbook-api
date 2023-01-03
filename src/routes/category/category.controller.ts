import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { CreateCategoryReq } from './dto'

const CATEGORY_TABLE = process.env.CATEGORY_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

export class CategoryController {
  public async getAllCategory(
    _: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: CATEGORY_TABLE,
        })
        .promise()
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retrieve items from table', error: err })
    }
  }
  public async getCategoryById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: CATEGORY_TABLE,
          Key: {
            categoryId: req.params.categoryId,
          },
        })
        .promise()
      return res.status(200).json(Item)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not get item from table', error: err })
    }
  }
  public async postNewCategory(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const { title } = req.body
    const uid = `Category-${uuid()}`
    try {
      const dataObject: CreateCategoryReq = {
        title,
        categoryId: uid,
        createdAt: Date.now(),
      }
      const { Items } = await dynamoDbClient
        .scan({
          TableName: CATEGORY_TABLE,
        })
        .promise()
      const filterTitleNames = Items!.filter((item) => {
        return item.title.toLowerCase() === title.toLowerCase()
      })
      if (filterTitleNames.length > 0) {
        return res.status(409).json({
          message: 'Following category already exists',
        })
      }
      await dynamoDbClient
        .put({
          TableName: CATEGORY_TABLE,
          Item: dataObject,
        })
        .promise()
      const { Item } = await dynamoDbClient
        .get({
          TableName: CATEGORY_TABLE,
          Key: {
            categoryId: dataObject.categoryId,
          },
        })
        .promise()
      return res.status(200).json(Item)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Failed to create new category', error: err })
    }
  }
}
