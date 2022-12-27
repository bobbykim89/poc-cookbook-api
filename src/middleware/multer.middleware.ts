import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";

const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(null, false);
    } else {
      cb(null, true);
    }
  },
});

export { upload };
