import express, { Response } from "express";

// routes
import { UserRouter } from "@/routes/user";
import { AuthRouter } from "@/routes/auth";
import { PostController } from "@/routes/post";
import { CategoryRouter } from "@/routes/category";
import { CommentRouter } from "@/routes/comment";

// initialize express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (_, res: Response) => {
  res.json({ message: "POC-Cookbook-API listening through Lambda" });
});

// define routes
app.use("/user", UserRouter);
app.use("/auth", AuthRouter);
app.use("/post", PostController);
app.use("/category", CategoryRouter);
app.use("/comment", CommentRouter);

app.use((_, res: Response) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

export { app };
