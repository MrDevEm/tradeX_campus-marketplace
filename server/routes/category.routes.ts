import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.ts';

export const categoryRouter = Router();

categoryRouter.get('/', categoryController.getCategories);
