import express from "express";
import joi from "joi";
import mongoose from "mongoose";
import Project from "../models/index.js";

const router = express.Router();

router.get("/projects", async (req, res) => {
  try {
    const userId = req.query.userId;
    const data = await Project.find({ userId }, { task: 0, __v: 0, updatedAt: 0 });
    return res.send(data);
  } catch (error) {
    return res.send(error);
  }
});
router.get("/project/:id", async (req, res) => {

  if (!req.params.id)
    res.status(422).send({ data: { error: true, message: "Id is reaquire" } });
  try {
    const data = await Project.find({
      _id: new mongoose.Types.ObjectId(req.params.id),
    }).sort({ order: 1 });
    return res.send(data);
  } catch (error) {
    return res.send(error);
  }
});
router.post("/project", async (req, res) => {
  const project = joi.object({
    userId: joi.string().required(),
    title: joi.string().min(3).max(30).required(),
    description: joi.string().required(),
  });
  const { error, value } = project.validate({
    userId: req.body.userId,
    title: req.body.title,
    description: req.body.description,
  });
  if (error) return res.status(422).send(error);
  try {
    const data = await new Project(value).save();
    res.send({
      data: {
        title: data.title,
        description: data.description,
        userId: data.userId,
        updatedAt: data.updatedAt,
        _id: data._id,
      },
    });
  } catch (e) {
    if (e.code === 11000) {
      return res
        .status(422)
        .send({ data: { error: true, message: "title must be unique" } });
    } else {
      return res
        .status(500)
        .send({ data: { error: true, message: "server error" } });
    }
  }
});
router.put("/project/:id", async (req, res) => {
  const project = joi.object({
    userId: joi.string().required(),
    title: joi.string().min(3).max(30).required(),
    description: joi.string().required(),
  });
  const { error, value } = project.validate({
    userId: req.body.userId,
    title: req.body.title,
    description: req.body.description,
  });
  console.log('value: ', value);
  if (error) {
    return res.status(422).send(error);
  }
  try {
    const updatedProject = await Project.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: {...value} },
    );
    if (updatedProject.nModified === 0) {
      return res.status(404).send("Project not found");
    }
    return res.send(updatedProject);
  } 
  catch (error) {
    return res.status(500).send(error);
  }
});
router.delete("/project/:id", async (req, res) => {
  try {
    const data = await Project.deleteOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });
    res.send(data);
  } catch (error) {
    res.send(error);
  }
});
router.post("/project/:id/task", async (req, res) => {
  if (!req.params.id) return res.status(500).send(`server error`);
  const task = joi.object({
    title: joi.string().min(3).max(30).required(),
    description: joi.string().required(),
  });
  const { error, value } = task.validate({
    title: req.body.title,
    description: req.body.description,
  });
  if (error) return res.status(422).send(error);

  try {
    // const task = await Project.find({ _id: new mongoose.Types.ObjectId(req.params.id) }, { "task.index": 1 })
    const [{ task }] = await Project.find(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { "task.index": 1 }
    ).sort({ "task.index": 1 });

    let countTaskLength = [
      task.length,
      task.length > 0 ? Math.max(...task.map((o) => o.index)) : task.length,
    ];

    const data = await Project.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $push: {
          task: {
            ...value,
            stage: "Requested",
            order: countTaskLength[0],
            index: countTaskLength[1] + 1,
          },
        },
      }
    );
    return res.send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});
router.get("/project/:id/task/:taskId", async (req, res) => {
  if (!req.params.id || !req.params.taskId)
    return res.status(500).send(`server error`);
  try {
    let data = await Project.find(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        task: {
          $filter: {
            input: "$task",
            as: "task",
            cond: {
              $in: [
                "$$task._id",
                [new mongoose.Types.ObjectId(req.params.taskId)],
              ],
            },
          },
        },
      }
    );
    if (data[0].task.length < 1)
      return res.status(404).send({ error: true, message: "record not found" });
    return res.send(data);
  } catch (error) {
    return res.status(5000).send(error);
  }
});
router.put("/project/:id/task/:taskId", async (req, res) => {
  if (!req.params.id || !req.params.taskId)
    return res.status(500).send(`server error`);
  const task = joi.object({
    title: joi.string().min(3).max(30).required(),
    description: joi.string().required(),
  });
  const { error, value } = task.validate({
    title: req.body.title,
    description: req.body.description,
  });
  if (error) return res.status(422).send(error);
  try {
    const data = await Project.updateOne(
      {
        _id: new mongoose.Types.ObjectId(req.params.id),
        task: {
          $elemMatch: { _id: new mongoose.Types.ObjectId(req.params.taskId) },
        },
      },
      {
        $set: {
          "task.$.title": value.title,
          "task.$.description": value.description,
        },
      }
    );
    return res.send(data);
  } catch (error) {
    return res.send(error);
  }
});
router.delete("/project/:id/task/:taskId", async (req, res) => {
  if (!req.params.id || !req.params.taskId)
    return res.status(500).send(`server error`);

  try {
    const data = await Project.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $pull: {
          task: { _id: new mongoose.Types.ObjectId(req.params.taskId) },
        },
      }
    );
    return res.send(data);
  } catch (error) {
    return res.send(error);
  }
});
router.put("/project/:id/todo", async (req, res) => {
  let todo = [];
  for (const key in req.body) {
    for (const index in req.body[key].items) {
      req.body[key].items[index].stage = req.body[key].name;
      todo.push({
        name: req.body[key].items[index]._id,
        stage: req.body[key].items[index].stage,
        order: index,
      });
    }
  }

  todo.map(async (item) => {
    await Project.updateOne(
      {
        _id: new mongoose.Types.ObjectId(req.params.id),
        task: { $elemMatch: { _id: new mongoose.Types.ObjectId(item.name) } },
      },
      { $set: { "task.$.order": item.order, "task.$.stage": item.stage } }
    );
  });

  res.send(todo);
});
export default router;
