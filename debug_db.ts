import DatabaseManager from './src/database/DBManagers';
import {QueryBuilder} from '@dqcai/sqlite';

async function checkUnits() {
  const db = DatabaseManager.get('pos');
  if (!db) {
    console.log('DB not found');
    return;
  }
  try {
    const units = await QueryBuilder.table('units', db.getInternalDAO())
      .select(['id', 'unit_code', 'name'])
      .get();
    console.log('Units:', JSON.stringify(units, null, 2));

    const prices = await QueryBuilder.table('prices', db.getInternalDAO())
      .select(['variant_id', 'unit_id', 'price', 'price_list_name'])
      .limit(10)
      .get();
    console.log('Sample Prices:', JSON.stringify(prices, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

checkUnits();
