import express from 'express'
import { check } from 'express-validator'

// import controller
import { PostController } from './post.controller'
// import middleware
import { Auth, upload } from '@/middleware'

const router = express.Router()
const postController = new PostController()

router.get('/', postController.getAllPost)
router.get('/:postId', postController.getPostById)
router.get('/user/:userId', postController.getPostByUser)
router.get('/current-user/me', Auth, postController.getPostByCurrentUser)
router.get('/category/:categoryId', postController.getPostByCategory)
router.post(
  '/',
  Auth,
  upload.single('image'),
  [
    check('title').isString().trim().not().isEmpty(),
    check('category').isString().not().isEmpty(),
    check('ingredients').isString().not().isEmpty(),
    check('recipe').isString().not().isEmpty(),
  ],
  postController.createNewPost
)
router.patch(
  '/:postId',
  Auth,
  upload.single('image'),
  postController.patchPostById
)
router.delete('/:postId', Auth, postController.deletePostById)

export { router as PostController }
