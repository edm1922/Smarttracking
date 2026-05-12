async function runTest() {
  try {
    const res = await fetch('http://localhost:3001/internal-requests/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          date: new Date().toISOString(),
          employeeName: 'test',
          employeeRole: 'Staff',
          supervisor: 'Supervisor',
          departmentArea: 'Area',
          shift: 'SHIFT 1',
          locationId: 'some-id',
          productId: 'some-id',
          quantity: 1,
          remarks: 'None',
          attachmentUrl: 'http://example.com'
        }]
      })
    });
    
    if (res.ok) {
      console.log('Success:', res.status);
    } else {
      const data = await res.json();
      console.error('Error:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runTest();
