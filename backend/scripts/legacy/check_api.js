const axios = require('axios');

async function check() {
  try {
    const res = await axios.get('http://localhost:3001/items/unit-inventory');
    console.log('Total items in inventory:', res.data.data.length);
    res.data.data.forEach(group => {
      console.log(`- ${group.name} (${group.totalQty} ${group.unit})`);
    });
  } catch (err) {
    console.error(err.message);
  }
}

check();
