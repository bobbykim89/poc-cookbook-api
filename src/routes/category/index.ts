import express from 'express'
import { check } from 'express-validator'

// import controller
import { CategoryController } from './category.controller'
// import middleware
import { Auth } from '@/middleware'

const router = express.Router()
const categoryController = new CategoryController()

router.get('/', categoryController.getAllCategory)
router.get('/:categoryId', categoryController.getCategoryById)
router.post(
  '/',
  Auth,
  [check('title').isString().trim().not().isEmpty()],
  categoryController.postNewCategory
)

export { router as CategoryRouter }
