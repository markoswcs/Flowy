import { CategoryPage } from "@/features/categories/category-page";

interface CategoryRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryRoute({ params }: CategoryRouteProps) {
  const { id } = await params;
  return <CategoryPage categoryId={id} />;
}
