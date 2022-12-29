import express from "express";
import { check } from "express-validator";

// import middleware
import { Auth, upload } from "@/middleware";

// import controller
import { UserController } from "./user.controller";

const router = express.Router();
const userController = new UserController();

router.get("/", userController.getAllUser);
router.get("/:userId", userController.getUserById);
router.get("/current-user/me", Auth, userController.getCurrentUser);
router.post(
  "/",
  [
    check("userName").isString().not().isEmpty(),
    check("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
    check("password").isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    }),
  ],
  userController.createNewUser
);
router.patch(
  "/:userId",
  Auth,
  upload.single("image"),
  userController.patchUserById
);

export { router as UserRouter };
