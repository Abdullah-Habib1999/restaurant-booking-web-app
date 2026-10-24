import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const categories = serverDb.getMenuCategories(restaurantId);
    const items = serverDb.getMenuItems(restaurantId);
    const tables = serverDb.getTables(restaurantId);
    const hours = serverDb.getRestaurantHours(restaurantId);

    return NextResponse.json({ categories, items, tables, hours });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/restaurant-data GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, table, category, menuItem, hours, restaurantId, tableId, categoryId, menuItemId } = body;

    switch (action) {
      case 'saveTable':
        return NextResponse.json(serverDb.saveTable(table));
      case 'deleteTable':
        serverDb.deleteTable(tableId);
        return NextResponse.json({ success: true });
      case 'saveCategory':
        return NextResponse.json(serverDb.saveMenuCategory(category));
      case 'deleteCategory':
        serverDb.deleteMenuCategory(categoryId);
        return NextResponse.json({ success: true });
      case 'saveMenuItem':
        return NextResponse.json(serverDb.saveMenuItem(menuItem));
      case 'deleteMenuItem':
        serverDb.deleteMenuItem(menuItemId);
        return NextResponse.json({ success: true });
      case 'saveHours':
        serverDb.saveRestaurantHours(restaurantId, hours);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('API /api/restaurant-data POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
