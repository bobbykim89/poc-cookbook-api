import express from 'express'
import { check } from 'express-validator'

// import middleware
import { Auth, upload } from '@/middleware'

// import controller
import { CommentController } from './comment.controller'

const router = express.Router()
const commentController = new CommentController()

router.get('/:postId', commentController.getCommentByPostId)
router.post(
  '/',
  Auth,
  [
    check('text').isString().not().isEmpty(),
    check('postId').isString().not().isEmpty(),
  ],
  commentController.postNewComment
)
router.delete('/:commentId', Auth, commentController.delecteCommentById)

export { router as CommentRouter }
