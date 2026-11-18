import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { sendSuccess } from '../middleware/envelope.ts';

export const categoryController = {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });

      // Efficient single group-by query to count active listings by category
      const counts = await prisma.listing.groupBy({
        by: ['category'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      });

      const countMap = new Map<string, number>();
      for (const item of counts) {
        countMap.set(item.category.toLowerCase().trim(), item._count.id);
      }

      const categoriesWithCount = categories.map((cat) => {
        const directCount = countMap.get(cat.name.toLowerCase().trim()) || 0;
        const slugCount = countMap.get(cat.slug.toLowerCase().trim()) || 0;
        const totalItems = directCount || slugCount || 0;

        return {
          id: cat.name,
          name: cat.name,
          slug: cat.slug,
          count: `${totalItems} items`,
          icon: cat.icon || '',
        };
      });

      return sendSuccess(res, categoriesWithCount, 200, {
        total: categoriesWithCount.length,
      });
    } catch (err) {
      next(err);
    }
  },
};
