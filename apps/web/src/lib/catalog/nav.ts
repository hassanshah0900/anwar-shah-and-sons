import 'server-only';
import { getCategories } from '@/lib/api/catalog';

export type NavLink = { title: string; href: string };

export const shopAllLink: NavLink = { title: 'Shop all', href: '/shop' };

/**
 * Shop navigation: "Shop all" plus each top-level category, as the admin
 * arranged them. Falls back to "Shop all" alone if the API is unavailable, so
 * the header and footer never break a page.
 */
export async function getShopNav(): Promise<NavLink[]> {
  try {
    const categories = await getCategories();
    return [
      shopAllLink,
      ...categories
        .filter((category) => category.parentId === null)
        .map((category) => ({ title: category.name, href: `/shop/${category.slug}` })),
    ];
  } catch {
    return [shopAllLink];
  }
}
